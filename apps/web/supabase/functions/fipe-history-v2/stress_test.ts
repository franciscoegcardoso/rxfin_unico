// =============================================================================
// STRESS TEST: FIPE History Edge Functions
// 
// Tests concurrent requests to identify performance bottlenecks and optimize
// Run with: deno test --allow-net --allow-env supabase/functions/fipe-history-v2/stress_test.ts
// =============================================================================
import "https://deno.land/std@0.224.0/dotenv/load.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Test vehicles - MIX of cached and uncached to test both scenarios
const TEST_VEHICLES_CACHED = [
  { fipeCode: "002084-2", modelYear: 2006, name: "VW Parati (cached)" }, // 216 cached points
  { fipeCode: "005276-0", modelYear: 2010, name: "GM Celta (cached)" }, // 189 cached points  
  { fipeCode: "014075-9", modelYear: 2014, name: "Renault Sandero (cached)" }, // 143 cached points
];

const TEST_VEHICLES_UNCACHED = [
  { fipeCode: "001004-9", modelYear: 2020, name: "VW Gol 1.0" }, // Popular model, may not have cache
  { fipeCode: "001267-0", modelYear: 2023, name: "VW T-Cross" }, // Recent model
];

interface TestResult {
  testName: string;
  concurrency: number;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgResponseTimeMs: number;
  minResponseTimeMs: number;
  maxResponseTimeMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  throughputRps: number;
  errors: string[];
}

async function makeRequest(
  fipeCode: string,
  modelYear: number
): Promise<{ success: boolean; timeMs: number; error?: string; source?: string }> {
  const start = performance.now();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fipe-history-v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ fipeCode, modelYear }),
    });
    
    const timeMs = performance.now() - start;
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      return { 
        success: false, 
        timeMs, 
        error: data.error || `HTTP ${response.status}` 
      };
    }
    
    return { 
      success: true, 
      timeMs, 
      source: data.source 
    };
  } catch (err) {
    const timeMs = performance.now() - start;
    return { 
      success: false, 
      timeMs, 
      error: err instanceof Error ? err.message : String(err) 
    };
  }
}

function calculatePercentile(sortedValues: number[], percentile: number): number {
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

async function runStressTest(
  testName: string,
  vehicles: { fipeCode: string; modelYear: number }[],
  concurrency: number,
  requestsPerVehicle: number
): Promise<TestResult> {
  console.log(`\n🚀 Starting: ${testName}`);
  console.log(`   Concurrency: ${concurrency}, Requests per vehicle: ${requestsPerVehicle}`);
  
  const startTime = performance.now();
  const results: { success: boolean; timeMs: number; error?: string; source?: string }[] = [];
  const errors: string[] = [];
  
  // Create all request promises
  const allRequests: Promise<void>[] = [];
  
  for (const vehicle of vehicles) {
    for (let i = 0; i < requestsPerVehicle; i++) {
      allRequests.push(
        makeRequest(vehicle.fipeCode, vehicle.modelYear).then(result => {
          results.push(result);
          if (!result.success && result.error) {
            errors.push(`${vehicle.fipeCode}: ${result.error}`);
          }
        })
      );
    }
  }
  
  // Execute in batches based on concurrency
  for (let i = 0; i < allRequests.length; i += concurrency) {
    const batch = allRequests.slice(i, i + concurrency);
    await Promise.all(batch);
    
    // Small delay between batches to avoid overwhelming
    if (i + concurrency < allRequests.length) {
      await new Promise(r => setTimeout(r, 50));
    }
  }
  
  const totalTimeMs = performance.now() - startTime;
  
  // Calculate metrics
  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;
  const responseTimes = results.map(r => r.timeMs).sort((a, b) => a - b);
  
  const avgResponseTimeMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const minResponseTimeMs = responseTimes[0] || 0;
  const maxResponseTimeMs = responseTimes[responseTimes.length - 1] || 0;
  const p50Ms = calculatePercentile(responseTimes, 50);
  const p95Ms = calculatePercentile(responseTimes, 95);
  const p99Ms = calculatePercentile(responseTimes, 99);
  const throughputRps = (results.length / totalTimeMs) * 1000;
  
  // Source distribution
  const sources = results.filter(r => r.success).map(r => r.source);
  const sourceCount = sources.reduce((acc, s) => {
    acc[s || 'unknown'] = (acc[s || 'unknown'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`\n📊 Results for: ${testName}`);
  console.log(`   Total Requests: ${results.length}`);
  console.log(`   Success: ${successCount} (${((successCount / results.length) * 100).toFixed(1)}%)`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Avg Response: ${avgResponseTimeMs.toFixed(0)}ms`);
  console.log(`   Min/Max: ${minResponseTimeMs.toFixed(0)}ms / ${maxResponseTimeMs.toFixed(0)}ms`);
  console.log(`   P50/P95/P99: ${p50Ms.toFixed(0)}ms / ${p95Ms.toFixed(0)}ms / ${p99Ms.toFixed(0)}ms`);
  console.log(`   Throughput: ${throughputRps.toFixed(2)} req/s`);
  console.log(`   Sources: ${JSON.stringify(sourceCount)}`);
  
  if (errors.length > 0) {
    console.log(`   Sample Errors: ${errors.slice(0, 3).join(', ')}`);
  }
  
  return {
    testName,
    concurrency,
    totalRequests: results.length,
    successCount,
    errorCount,
    avgResponseTimeMs,
    minResponseTimeMs,
    maxResponseTimeMs,
    p50Ms,
    p95Ms,
    p99Ms,
    throughputRps,
    errors: errors.slice(0, 10),
  };
}

// =============================================================================
// TEST SUITES
// =============================================================================

Deno.test({
  name: "Stress Test 1: Cached vehicles (fast path)",
  fn: async () => {
    const result = await runStressTest(
      "Cached Vehicles - Fast Path",
      TEST_VEHICLES_CACHED,
      5,
      3
    );
    
    console.log("\n✅ Cached vehicles test complete");
    console.assert(result.avgResponseTimeMs < 2000, "Cached requests should be fast (<2s)");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Stress Test 2: Uncached vehicles (API fallback)",
  fn: async () => {
    const result = await runStressTest(
      "Uncached Vehicles - API Fallback",
      TEST_VEHICLES_UNCACHED,
      2,
      1
    );
    
    console.log("\n⚠️ Uncached test - expect slower due to Brasil API");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Stress Test 3: Mixed workload (realistic)",
  fn: async () => {
    const result = await runStressTest(
      "Mixed Workload",
      [...TEST_VEHICLES_CACHED.slice(0, 2), ...TEST_VEHICLES_UNCACHED.slice(0, 1)],
      5,
      2
    );
    
    const successRate = result.successCount / result.totalRequests;
    console.log(`\n📈 Mixed Success Rate: ${(successRate * 100).toFixed(1)}%`);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Stress Test 4: Cache effectiveness",
  fn: async () => {
    const warmupVehicle = TEST_VEHICLES_CACHED[0];
    console.log(`\n🔥 Testing cache for ${warmupVehicle.name}...`);
    
    const result = await runStressTest(
      "Cache Effectiveness",
      [warmupVehicle],
      5,
      5
    );
    
    console.log(`\n🎯 Cache test complete`);
    if (result.avgResponseTimeMs < 500) {
      console.log("✅ Cache effective (avg < 500ms)");
    } else {
      console.log(`⚠️ Avg: ${result.avgResponseTimeMs.toFixed(0)}ms`);
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Summary: Generate optimization recommendations",
  fn: async () => {
    console.log("\n" + "=".repeat(60));
    console.log("📋 OPTIMIZATION RECOMMENDATIONS");
    console.log("=".repeat(60));
    
    console.log(`
Based on the stress test results, consider these optimizations:

1. **Database Connection Pooling**
   - If P95 > 2000ms, consider connection pooling
   - Current architecture uses single client per request

2. **Cache Hit Rate**
   - Monitor 'database' vs 'api' source ratio
   - If api > 50%, pre-populate cache for popular models

3. **Rate Limiting Strategy**
   - Brasil API has strict rate limits
   - Current: BATCH_SIZE=3, DELAY=400ms
   - If errors > 20%, increase delay to 500ms

4. **Timeout Tuning**
   - Current FALLBACK_TIMEOUT: 25s
   - If timeouts > 10%, consider 30s

5. **Parallel Fetch Optimization**
   - Current batch size: 3
   - If low error rate, can try batch size: 4

6. **Frontend Retry Strategy**
   - Implement exponential backoff on client
   - Show partial data while loading rest
    `);
    
    console.log("=".repeat(60));
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
