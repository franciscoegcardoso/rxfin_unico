// =============================================================================
// supabase/functions/fipe-history-v2/index.ts
//
// FIPE Historical Price Fetcher - Database-First Architecture
// 
// STRATEGY:
// 1. Query local database cache first (fipe_price_history table)
// 2. Check if coverage is adequate (launch point + recent data + density)
// 3. If adequate → return immediately (fast path: ~50-100ms)
// 4. If partial coverage (>=5 points) → return partial + trigger background fetch
// 5. If no coverage → fallback to legacy API fetcher (slow path: 1-3s with parallel batching)
//
// PERFORMANCE OPTIMIZATION (v14):
// - Progressive loading: returns partial data immediately while fetching rest
// - Parallel batch fetching in legacy fallback (50%+ faster)
// - Frontend receives partial: true flag to show loading indicator for remaining data
// =============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================================================
// CORS CONFIGURATION
// =============================================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Single point in the historical price timeline */
type HistoryPoint = {
  date: string;       // ISO date string
  monthLabel: string; // e.g., "Dez/22"
  price: number;      // Price in BRL (cents or reais based on source)
  reference: string;  // FIPE reference code
};

/** Database record from fipe_price_history table */
type CachedPrice = {
  fipe_code: string;
  model_year: number;
  reference_code: number;
  price: number;
  reference_month: number; // 1-12
  reference_year: number;
  reference_label: string;
};

/** API response payload */
type ResponsePayload = {
  success: boolean;
  points?: HistoryPoint[];
  source?: 'database' | 'api' | 'partial';
  partial?: boolean; // True if more data is being fetched in background
  restricted?: boolean;
  /** Taxa composta mensal estimada (WLS log-linear, últimos 18 meses, λ=0.94) */
  projectionRate?: number;
  /** Taxa composta anual equivalente: (1 + projectionRate)^12 - 1 */
  projectionRateAnnual?: number;
  stdDevMonthly?: number;
  stabilizationZone?: boolean;
  stats?: {
    cacheHits: number;
    queryTimeMs: number;
    totalTimeMs: number;
    coverageStatus: string;
  };
  error?: string;
  suggestion?: string; // User-friendly suggestion on error
  /** Média IPCA ~últimos 3 anos (a.a.); fixo até integração com tabela */
  ipca3yAvg?: number;
};

// =============================================================================
// CONSTANTS
// =============================================================================
// OPTIMIZED after stress testing: avg response was 25s with 10-33% success rate
const PARTIAL_DATA_MIN_POINTS = 2; // Reduced from 3 - return partial data even with minimal cache
/** Referência anualizada ~média IPCA 3 anos (pode vir de tabela no futuro) */
const IPCA_3Y_AVG_AA = 0.046;
const FALLBACK_TIMEOUT_MS = 18000; // Reduced from 25s - fail faster, trigger background fetch sooner

// =============================================================================
// SUPABASE CLIENT
// =============================================================================
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Formats month/year to Portuguese label (e.g., "Dez/22") */
function formatMonthLabel(month: number, year: number): string {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[month - 1]}/${String(year).slice(-2)}`;
}

function createDateFromMonthYear(month: number, year: number): Date {
  return new Date(year, month - 1, 1); // month is 1-12, Date uses 0-11
}

// --- Coverage Validation ---

interface CoverageResult {
  isAdequate: boolean;
  canReturnPartial: boolean;
  hasLaunchPoint: boolean;
  hasRecentData: boolean;
  pointCount: number;
  status: string;
}

function checkCoverage(
  points: CachedPrice[],
  modelYear: number
): CoverageResult {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const launchYear = modelYear - 1;
  
  // Check for launch point (December of year before model year)
  const hasLaunchPoint = points.some(
    p => p.reference_year === launchYear && p.reference_month === 12
  );
  
  // Check for recent data (within last 12 months)
  const hasRecentData = points.some(p => {
    const monthsAgo = (currentYear - p.reference_year) * 12 + (currentMonth - p.reference_month);
    return monthsAgo <= 12;
  });
  
  // Calculate vehicle age to determine density requirements
  const vehicleAge = currentYear - modelYear;
  
  // v4: Check for MONTHLY density - we need data for most months, not just sparse points
  const sortedPoints = [...points].sort((a, b) => {
    const dateA = a.reference_year * 12 + a.reference_month;
    const dateB = b.reference_year * 12 + b.reference_month;
    return dateA - dateB;
  });
  
  // Calculate expected months from launch to now
  const launchMonth = 12; // December of launch year
  const expectedMonths = (currentYear - launchYear) * 12 + (currentMonth - launchMonth);
  
  // Check if we have at least 70% of expected months
  const densityRatio = points.length / Math.max(1, expectedMonths);
  const hasMonthlyDensity = densityRatio >= 0.7;
  
  // Check for large gaps (more than 2 months between consecutive points)
  let hasLargeGaps = false;
  for (let i = 1; i < sortedPoints.length; i++) {
    const prev = sortedPoints[i - 1];
    const curr = sortedPoints[i];
    const prevMonthNum = prev.reference_year * 12 + prev.reference_month;
    const currMonthNum = curr.reference_year * 12 + curr.reference_month;
    const gap = currMonthNum - prevMonthNum;
    
    if (gap > 2) {
      hasLargeGaps = true;
      break;
    }
  }
  
  const isAdequate = hasLaunchPoint && hasRecentData && hasMonthlyDensity && !hasLargeGaps;
  
  // Can return partial if we have enough points for a useful chart
  const canReturnPartial = points.length >= PARTIAL_DATA_MIN_POINTS;
  
  let status = 'adequate';
  if (points.length < 3) status = 'insufficient_points';
  else if (!hasLaunchPoint) status = 'missing_launch';
  else if (!hasRecentData) status = 'missing_recent';
  else if (hasLargeGaps) status = 'has_large_gaps';
  else if (!hasMonthlyDensity) status = 'sparse_data';
  
  console.log(`[fipe-history-v2] Coverage: age=${vehicleAge}y, points=${points.length}, expected=${expectedMonths}, density=${(densityRatio * 100).toFixed(0)}%, gaps=${hasLargeGaps}, adequate=${isAdequate}`);
  
  return {
    isAdequate,
    canReturnPartial,
    hasLaunchPoint,
    hasRecentData,
    pointCount: points.length,
    status
  };
}

// --- Database Query ---

async function queryDatabaseHistory(
  fipeCode: string,
  modelYear: number
): Promise<{ points: CachedPrice[]; queryTimeMs: number }> {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase
      .from("fipe_price_history")
      .select("*")
      .eq("fipe_code", fipeCode)
      .in("model_year", [modelYear, 32000])
      .order("reference_year", { ascending: true })
      .order("reference_month", { ascending: true });
    
    const queryTimeMs = Date.now() - startTime;
    
    if (error) {
      console.error("[fipe-history-v2] Database query error:", error);
      return { points: [], queryTimeMs };
    }
    
    const launchYear = modelYear - 1;
    const filteredData = (data || []).filter(p => {
      if (p.model_year === 32000) {
        return p.reference_year === launchYear && p.reference_month === 12;
      }
      return true;
    });
    
    console.log(`[fipe-history-v2] Database query: ${filteredData.length} points in ${queryTimeMs}ms`);
    return { points: filteredData, queryTimeMs };
  } catch (err) {
    console.error("[fipe-history-v2] Database query exception:", err);
    return { points: [], queryTimeMs: Date.now() - startTime };
  }
}

// --- Transform to Response Format ---

function transformToHistoryPoints(cachedPrices: CachedPrice[]): HistoryPoint[] {
  return cachedPrices
    .map(p => ({
      date: createDateFromMonthYear(p.reference_month, p.reference_year).toISOString(),
      monthLabel: formatMonthLabel(p.reference_month, p.reference_year),
      price: Number(p.price),
      reference: String(p.reference_code),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

const WLS_LAMBDA = 0.94;
const WLS_MONTHS = 18;
const WLS_MIN_POINTS = 6;

function computeWlsProjectionMeta(points: HistoryPoint[]): Pick<
  ResponsePayload,
  "projectionRate" | "projectionRateAnnual" | "stdDevMonthly" | "stabilizationZone"
> | undefined {
  const sorted = [...points].filter((p) => p.price > 0).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  if (sorted.length < WLS_MIN_POINTS) return undefined;

  const slice = sorted.slice(-WLS_MONTHS);
  const n = slice.length;
  const ys = slice.map((p) => Math.log(p.price));

  let sw = 0, swx = 0, swy = 0, swxx = 0, swxy = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.pow(WLS_LAMBDA, n - 1 - i);
    const x = i;
    const y = ys[i];
    sw += w;
    swx += w * x;
    swy += w * y;
    swxx += w * x * x;
    swxy += w * x * y;
  }
  const den = sw * swxx - swx * swx;
  if (Math.abs(den) < 1e-14) return undefined;

  const b = (sw * swxy - swx * swy) / den;
  const a = (swy - b * swx) / sw;
  const monthlyMultiplier = Math.exp(b);
  const projectionRate = monthlyMultiplier - 1;
  const projectionRateAnnual = Math.pow(monthlyMultiplier, 12) - 1;

  let sumWRes2 = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.pow(WLS_LAMBDA, n - 1 - i);
    const res = ys[i] - (a + b * i);
    sumWRes2 += w * res * res;
  }
  const stdDevMonthly = Math.sqrt(sumWRes2 / sw);
  const stabilizationZone = Math.abs(projectionRateAnnual) < 0.03;

  return { projectionRate, projectionRateAnnual, stdDevMonthly, stabilizationZone };
}

function withProjectionFields(payload: ResponsePayload): ResponsePayload {
  const withIpca: ResponsePayload = { ...payload, ipca3yAvg: IPCA_3Y_AVG_AA };
  if (!withIpca.success || !withIpca.points?.length) return withIpca;
  const meta = computeWlsProjectionMeta(withIpca.points);
  return meta ? { ...withIpca, ...meta } : withIpca;
}

// =============================================================================
// FALLBACK TO LEGACY API
// When database coverage is inadequate, call the legacy fipe-full-history function
// which now uses parallel batch fetching for 50%+ faster performance
// =============================================================================

async function callLegacyFipeFullHistory(
  fipeCode: string,
  modelYear: number
): Promise<ResponsePayload> {
  try {
    console.log(`[fipe-history-v2] Calling legacy function for ${fipeCode}/${modelYear}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FALLBACK_TIMEOUT_MS);
    
    const response = await fetch(
      `${supabaseUrl}/functions/v1/fipe-full-history`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ fipeCode, modelYear }),
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[fipe-history-v2] Legacy function returned ${response.status}: ${errorText}`);
      return {
        success: false,
        error: `Falha ao buscar histórico completo (${response.status})`,
        suggestion: "Tente novamente em alguns segundos",
      };
    }
    
    const data = await response.json();
    
    const base: ResponsePayload = {
      success: data.success,
      points: data.points,
      source: 'api',
      partial: false,
      restricted: data.restricted,
      stats: {
        cacheHits: data.stats?.cacheHits || 0,
        queryTimeMs: 0,
        totalTimeMs: data.stats?.elapsedMs || 0,
        coverageStatus: 'api_fallback',
      },
    };
    return withProjectionFields(base);
  } catch (err) {
    console.error("[fipe-history-v2] Legacy fallback error:", err);
    
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    
    // On timeout, trigger background fetch and return gracefully
    if (isTimeout) {
      // Fire-and-forget background fetch to populate cache
      triggerBackgroundFetch(fipeCode, modelYear);
      
      return {
        success: false,
        error: "Histórico temporal indisponível no momento",
        suggestion: "Os dados estão sendo carregados. Clique em 'Tentar novamente' em alguns segundos.",
      };
    }
    
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao buscar histórico",
      suggestion: "Verifique sua conexão e tente novamente",
    };
  }
}

// =============================================================================
// BACKGROUND FETCH TRIGGER
// Triggers API fetch in background and returns immediately with partial data
// =============================================================================

async function triggerBackgroundFetch(
  fipeCode: string,
  modelYear: number
): Promise<void> {
  try {
    // Fire-and-forget: don't await this
    fetch(`${supabaseUrl}/functions/v1/fipe-full-history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ fipeCode, modelYear }),
    }).catch(err => {
      console.error("[fipe-history-v2] Background fetch failed:", err);
    });
    
    console.log(`[fipe-history-v2] Triggered background fetch for ${fipeCode}/${modelYear}`);
  } catch (err) {
    console.error("[fipe-history-v2] Failed to trigger background fetch:", err);
  }
}

// --- Main Handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const fipeCode = String(body?.fipeCode ?? "").trim();
    const modelYear = Number(body?.modelYear);
    const forceFullFetch = body?.forceFullFetch === true; // Optional: force complete fetch

    if (!fipeCode || !Number.isFinite(modelYear)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[fipe-history-v2] Request: fipeCode=${fipeCode} modelYear=${modelYear}`);
    const startedAt = Date.now();

    // Step 1: Query database first (fast path)
    const { points: cachedPoints, queryTimeMs } = await queryDatabaseHistory(fipeCode, modelYear);
    
    // Step 2: Check coverage
    const coverage = checkCoverage(cachedPoints, modelYear);
    
    console.log(`[fipe-history-v2] Coverage check: ${coverage.status} (${coverage.pointCount} points, launch=${coverage.hasLaunchPoint}, recent=${coverage.hasRecentData})`);

    // Step 3: If coverage is adequate, return immediately from database
    if (coverage.isAdequate && !forceFullFetch) {
      const historyPoints = transformToHistoryPoints(cachedPoints);
      const totalTimeMs = Date.now() - startedAt;
      
      console.log(`[fipe-history-v2] ✅ Database-only response: ${historyPoints.length} points in ${totalTimeMs}ms`);
      
      return new Response(
        JSON.stringify(withProjectionFields({
          success: true,
          points: historyPoints,
          source: 'database',
          partial: false,
          restricted: false,
          stats: {
            cacheHits: cachedPoints.length,
            queryTimeMs,
            totalTimeMs,
            coverageStatus: coverage.status,
          },
        })),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: If we have partial data (>=5 points), return it immediately and fetch rest in background
    if (coverage.canReturnPartial && !forceFullFetch) {
      const historyPoints = transformToHistoryPoints(cachedPoints);
      const totalTimeMs = Date.now() - startedAt;
      
      // Trigger background fetch (fire-and-forget)
      triggerBackgroundFetch(fipeCode, modelYear);
      
      console.log(`[fipe-history-v2] ⚡ Returning partial data: ${historyPoints.length} points in ${totalTimeMs}ms (background fetch triggered)`);
      
      return new Response(
        JSON.stringify(withProjectionFields({
          success: true,
          points: historyPoints,
          source: 'partial',
          partial: true, // Signal to frontend that more data is coming
          restricted: false,
          stats: {
            cacheHits: cachedPoints.length,
            queryTimeMs,
            totalTimeMs,
            coverageStatus: coverage.status + '_partial',
          },
        })),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 5: No usable cached data - must wait for full fetch
    console.log(`[fipe-history-v2] ⚠️ Inadequate coverage, falling back to API...`);
    
    const legacyResult = await callLegacyFipeFullHistory(fipeCode, modelYear);
    const totalTimeMs = Date.now() - startedAt;
    
    if (legacyResult.stats) {
      legacyResult.stats.totalTimeMs = totalTimeMs;
      legacyResult.stats.coverageStatus = coverage.status;
    }
    
    console.log(`[fipe-history-v2] API fallback complete: ${legacyResult.points?.length || 0} points in ${totalTimeMs}ms`);
    
    return new Response(
      JSON.stringify(withProjectionFields(legacyResult)),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error("[fipe-history-v2] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
