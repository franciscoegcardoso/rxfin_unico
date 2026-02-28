// supabase/functions/fipe-cohort-standard-curve/index.ts
// Calculates the STANDARD depreciation curve aggregating ALL model years for a FIPE code
// This curve is used as the reference for all projections (V6 engine)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Types ---

interface CachedPrice {
  fipe_code: string;
  model_year: number;
  reference_code: number;
  price: number;
  reference_month: number;
  reference_year: number;
  reference_label: string;
}

interface CohortPoint {
  modelYear: number;
  t: number;           // Y-1=-1, Y0=0, Y1=1, etc.
  relative: number;    // Value relative to 0km (Y-1 = 1.0)
  price: number;       // Absolute price
  calendarYear: number;
}

interface StandardCurvePoint {
  t: number;
  avgRetention: number;
  sampleSize: number;
  minRetention: number;
  maxRetention: number;
  stdDev: number;
}

interface RegressionFactors {
  B: number;
  C: number;
  rSquared: number;
}

interface StandardCurveResponse {
  success: boolean;
  fipeCode: string;
  modelYearsUsed: number[];
  dataPointsTotal: number;
  standardCurve: StandardCurvePoint[];
  factors: RegressionFactors;
  error?: string;
}

// --- Constants ---

const PANDEMIC_YEARS = [2020, 2021, 2022];
const MIN_POINTS_FOR_REGRESSION = 3;
const FALLBACK_DECAY_RATE = -0.08; // -8% per year
const MIN_ANNUAL_DECAY = 0.02;   // Mínimo 2% de depreciação anual
const MAX_ANNUAL_DECAY = 0.25;   // Máximo 25% de depreciação anual
const DEFAULT_DECAY_RATE = 0.03; // 3% de depreciação padrão quando dados são oscilantes

// --- Helper Functions ---

function calculateQuartiles(values: number[]): { q1: number; median: number; q3: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  if (n === 0) return { q1: 0, median: 0, q3: 0 };
  if (n === 1) return { q1: sorted[0], median: sorted[0], q3: sorted[0] };
  
  const median = n % 2 === 0 
    ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
    : sorted[Math.floor(n/2)];
  
  const lowerHalf = sorted.slice(0, Math.floor(n/2));
  const upperHalf = sorted.slice(Math.ceil(n/2));
  
  const q1 = lowerHalf.length > 0 
    ? lowerHalf[Math.floor(lowerHalf.length / 2)] 
    : sorted[0];
  const q3 = upperHalf.length > 0 
    ? upperHalf[Math.floor(upperHalf.length / 2)] 
    : sorted[n - 1];
  
  return { q1, median, q3 };
}

function calculateStdDev(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

/**
 * Filter pandemic outliers using IQR method
 * For each t, exclude points outside 1.5×IQR bounds
 * BUT preserve Y-1, Y0, Y1 as they are essential for curve construction
 */
function filterPandemicOutliers(points: CohortPoint[]): CohortPoint[] {
  // Group by t
  const byT = new Map<number, CohortPoint[]>();
  points.forEach(p => {
    const arr = byT.get(p.t) || [];
    arr.push(p);
    byT.set(p.t, arr);
  });
  
  const filtered: CohortPoint[] = [];
  
  byT.forEach((pts, t) => {
    // Preserve essential years (Y-1, Y0, Y1) - don't filter them
    if (t < 2) {
      filtered.push(...pts);
      return;
    }
    
    // For t >= 2, apply IQR filter
    const retentions = pts.map(p => p.relative);
    const { q1, q3 } = calculateQuartiles(retentions);
    const iqr = q3 - q1;
    
    // Use 1.5×IQR for standard outlier detection
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    const validPts = pts.filter(p => p.relative >= lowerBound && p.relative <= upperBound);
    
    // If filtering removed all points, keep original (avoid empty buckets)
    if (validPts.length > 0) {
      filtered.push(...validPts);
    } else {
      filtered.push(...pts);
    }
  });
  
  return filtered;
}

/**
 * ENFORCE MONOTONIC DECAY: Garante que a curva seja sempre decrescente
 * 
 * Regras:
 * 1. Y-1 = 100% (sempre)
 * 2. Yn <= Yn-1 para todo n >= 0 (monotônica decrescente)
 * 3. Taxa mínima de depreciação por ano: 2%
 * 4. Taxa máxima de depreciação por ano: 25%
 * 
 * Se avgRetention[t] > avgRetention[t-1]:
 *   → avgRetention[t] = avgRetention[t-1] * (1 - DEFAULT_DECAY_RATE)
 */
/**
 * ENFORCE MONOTONIC DECAY: Garante que a curva seja sempre decrescente
 * 
 * Regras REFINADAS (v6.1):
 * 1. Y-1 = 100% (sempre)
 * 2. Se dado JÁ É monotônico (Yn < Yn-1), MANTER o dado real
 * 3. Se dado SUBIU (anomalia), aplicar taxa de decaimento padrão (3%)
 * 4. Taxa máxima de depreciação por ano: 25%
 * 
 * NOTA: Removemos a taxa MÍNIMA obrigatória de 2% porque estava
 * forçando depreciação artificial em dados reais monotônicos.
 */
function enforceMonotonicDecay(curve: StandardCurvePoint[]): StandardCurvePoint[] {
  // Ordenar por t crescente
  const sortedCurve = [...curve].sort((a, b) => a.t - b.t);
  const correctedCurve: StandardCurvePoint[] = [];
  
  let maxRetentionSoFar = 1.0; // Y-1 = 100%
  
  for (const point of sortedCurve) {
    let correctedRetention = point.avgRetention;
    
    if (point.t === -1) {
      // Y-1 sempre = 1.0
      correctedRetention = 1.0;
    } else {
      // CORREÇÃO v6.1: Só aplicar taxa forçada se dado SUBIU (anomalia)
      // Se dado já é monotônico (menor que anterior), MANTER o dado real
      if (correctedRetention > maxRetentionSoFar) {
        // Subiu = anomalia → forçar 3% de queda
        correctedRetention = maxRetentionSoFar * (1 - DEFAULT_DECAY_RATE);
        console.log(`[enforceMonotonicDecay] t=${point.t}: Corrigido de ${(point.avgRetention * 100).toFixed(1)}% para ${(correctedRetention * 100).toFixed(1)}% (anomalia de valorização)`);
      }
      // NOTA: Removemos taxa mínima de 2% para respeitar dados reais monotônicos
      
      // Manter apenas limite máximo de depreciação (25%)
      const maxAllowedRetention = maxRetentionSoFar * (1 - MAX_ANNUAL_DECAY);
      if (correctedRetention < maxAllowedRetention) {
        correctedRetention = maxAllowedRetention;
        console.log(`[enforceMonotonicDecay] t=${point.t}: Limitado de ${(point.avgRetention * 100).toFixed(1)}% para ${(correctedRetention * 100).toFixed(1)}% (max 25% a.a.)`);
      }
    }
    
    correctedCurve.push({
      ...point,
      avgRetention: correctedRetention,
    } as StandardCurvePoint);
    
    maxRetentionSoFar = correctedRetention;
  }
  
  return correctedCurve;
}

/**
 * Calculate exponential regression factors (y = C * e^(B*x))
 */
/**
 * Calculate exponential regression factors (y = C * e^(B*x))
 * 
 * CORREÇÃO v6.1: Usar índice x = t + 1 (alinhado com depreciationCoreEngine.ts)
 * - Y-1 (t=-1) → x=0
 * - Y0  (t=0)  → x=1
 * - Y1  (t=1)  → x=2
 * etc.
 */
function calculateExponentialRegression(curve: StandardCurvePoint[]): RegressionFactors {
  // Filter valid points (t >= 0 and retention > 0)
  const validPoints = curve.filter(p => p.t >= 0 && p.avgRetention > 0 && p.sampleSize >= 1);
  
  if (validPoints.length < MIN_POINTS_FOR_REGRESSION) {
    return { C: 1.0, B: FALLBACK_DECAY_RATE, rSquared: 0 };
  }
  
  // Linear regression on ln(y) = ln(C) + B*x
  // CORREÇÃO v6.1: Usar x = t + 1 (columnIndex) igual ao core engine
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  const n = validPoints.length;
  
  validPoints.forEach(p => {
    const x = p.t + 1; // CORREÇÃO: Alinhado com depreciationCoreEngine.ts (linha 353)
    const y = Math.log(p.avgRetention);
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });
  
  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-10) {
    return { C: 1.0, B: FALLBACK_DECAY_RATE, rSquared: 0 };
  }
  
  const B = (n * sumXY - sumX * sumY) / denominator;
  const lnC = (sumY - B * sumX) / n;
  const C = Math.exp(lnC);
  
  // Validar B: deve ser negativo (depreciação)
  // Se positivo (valorização), usar fallback
  const validatedB = B > 0 ? -DEFAULT_DECAY_RATE : B;
  
  // Limitar B ao máximo (25%), mas NÃO forçar mínimo
  // Isso respeita taxas de depreciação menores quando os dados são consistentes
  const clampedB = Math.max(-MAX_ANNUAL_DECAY, validatedB);
  
  // Calculate R² usando o mesmo índice
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  
  validPoints.forEach(p => {
    const x = p.t + 1; // Usar o mesmo columnIndex
    const yActual = Math.log(p.avgRetention);
    const yPred = lnC + B * x;
    ssTot += Math.pow(yActual - yMean, 2);
    ssRes += Math.pow(yActual - yPred, 2);
  });
  
  const rSquared = ssTot > 0 ? Math.max(0, 1 - (ssRes / ssTot)) : 0;
  
  console.log(`[calculateExponentialRegression] x=t+1, B original=${B.toFixed(4)}, B validado=${clampedB.toFixed(4)}, C=${C.toFixed(4)}, R²=${rSquared.toFixed(4)}`);
  
  return { C, B: clampedB, rSquared };
}

// --- Main Logic ---

async function calculateStandardCurve(fipeCode: string): Promise<StandardCurveResponse> {
  console.log(`[fipe-cohort-standard-curve] Calculating for ${fipeCode}`);
  
  // 1. Load all cached prices for this FIPE code from database
  const { data: cachedPrices, error: dbError } = await supabase
    .from("fipe_price_history")
    .select("*")
    .eq("fipe_code", fipeCode);
  
  if (dbError) {
    console.error("[fipe-cohort-standard-curve] Database error:", dbError);
    return {
      success: false,
      fipeCode,
      modelYearsUsed: [],
      dataPointsTotal: 0,
      standardCurve: [],
      factors: { B: FALLBACK_DECAY_RATE, C: 1.0, rSquared: 0 },
      error: dbError.message
    };
  }
  
  if (!cachedPrices || cachedPrices.length === 0) {
    console.log(`[fipe-cohort-standard-curve] No cached data for ${fipeCode}`);
    return {
      success: false,
      fipeCode,
      modelYearsUsed: [],
      dataPointsTotal: 0,
      standardCurve: [],
      factors: { B: FALLBACK_DECAY_RATE, C: 1.0, rSquared: 0 },
      error: "No price history data found"
    };
  }
  
  console.log(`[fipe-cohort-standard-curve] Found ${cachedPrices.length} cached prices`);
  
  // 2. Group by model_year and find distinct model years (excluding 32000/0km)
  const pricesByModelYear = new Map<number, CachedPrice[]>();
  
  for (const price of cachedPrices) {
    // Skip 0km placeholder (32000) and invalid years
    if (price.model_year === 32000 || price.model_year < 2000) continue;
    
    const arr = pricesByModelYear.get(price.model_year) || [];
    arr.push(price);
    pricesByModelYear.set(price.model_year, arr);
  }
  
  const modelYears = Array.from(pricesByModelYear.keys()).sort((a, b) => a - b);
  console.log(`[fipe-cohort-standard-curve] Found ${modelYears.length} distinct model years: ${modelYears.join(', ')}`);
  
  if (modelYears.length === 0) {
    return {
      success: false,
      fipeCode,
      modelYearsUsed: [],
      dataPointsTotal: 0,
      standardCurve: [],
      factors: { B: FALLBACK_DECAY_RATE, C: 1.0, rSquared: 0 },
      error: "No valid model years found"
    };
  }
  
  // 3. For each model year, calculate cohort points normalized by Y-1 (0km price)
  const allCohortPoints: CohortPoint[] = [];
  
  for (const modelYear of modelYears) {
    const prices = pricesByModelYear.get(modelYear) || [];
    
    // Find the Y-1 price (0km at launch: December of modelYear-1)
    // First try to find in the data for this specific model year
    const launchYear = modelYear - 1;
    const launchPrice = prices.find(p => 
      p.reference_year === launchYear && 
      p.reference_month === 12
    );
    
    // If no launch price, try to find the 0km price from the 32000 entries
    let basePrice = launchPrice?.price;
    if (!basePrice) {
      const zeroKmPrices = cachedPrices.filter(p => 
        p.model_year === 32000 && 
        p.reference_year === launchYear && 
        p.reference_month === 12
      );
      if (zeroKmPrices.length > 0) {
        basePrice = zeroKmPrices[0].price;
      }
    }
    
    // If still no base price, use the earliest available price for this model year
    if (!basePrice && prices.length > 0) {
      const sortedPrices = [...prices].sort((a, b) => 
        (a.reference_year * 12 + a.reference_month) - (b.reference_year * 12 + b.reference_month)
      );
      basePrice = sortedPrices[0].price;
      console.log(`[fipe-cohort-standard-curve] MY ${modelYear}: No launch price, using earliest: ${basePrice}`);
    }
    
    if (!basePrice || basePrice <= 0) {
      console.log(`[fipe-cohort-standard-curve] MY ${modelYear}: Skipping, no valid base price`);
      continue;
    }
    
    // For each price point, calculate t and relative value
    for (const price of prices) {
      // t = calendarYear - modelYear
      // Y-1: calendarYear = modelYear - 1, t = -1
      // Y0: calendarYear = modelYear, t = 0
      const t = price.reference_year - modelYear;
      
      // Only include December snapshots for consistency
      if (price.reference_month !== 12) continue;
      
      // Only include t >= -1 (from launch onwards)
      if (t < -1) continue;
      
      const relative = price.price / basePrice;
      
      // Basic sanity check: relative should be between 0.1 and 1.5
      // (10% to 150% of original value)
      if (relative < 0.1 || relative > 1.5) {
        console.log(`[fipe-cohort-standard-curve] MY ${modelYear} t=${t}: Skipping outlier relative=${relative.toFixed(4)}`);
        continue;
      }
      
      allCohortPoints.push({
        modelYear,
        t,
        relative,
        price: price.price,
        calendarYear: price.reference_year
      });
    }
    
    // Add the Y-1 point (always 100%)
    if (launchPrice || basePrice) {
      allCohortPoints.push({
        modelYear,
        t: -1,
        relative: 1.0,
        price: basePrice,
        calendarYear: launchYear
      });
    }
  }
  
  console.log(`[fipe-cohort-standard-curve] Built ${allCohortPoints.length} cohort points from ${modelYears.length} model years`);
  
  if (allCohortPoints.length === 0) {
    return {
      success: false,
      fipeCode,
      modelYearsUsed: modelYears,
      dataPointsTotal: 0,
      standardCurve: [],
      factors: { B: FALLBACK_DECAY_RATE, C: 1.0, rSquared: 0 },
      error: "No valid cohort points could be calculated"
    };
  }
  
  // 4. Apply pandemic outlier filter
  const filteredPoints = filterPandemicOutliers(allCohortPoints);
  console.log(`[fipe-cohort-standard-curve] After pandemic filter: ${filteredPoints.length} points (removed ${allCohortPoints.length - filteredPoints.length})`);
  
  // 5. Aggregate by t to create standard curve
  const byT = new Map<number, number[]>();
  filteredPoints.forEach(p => {
    const arr = byT.get(p.t) || [];
    arr.push(p.relative);
    byT.set(p.t, arr);
  });
  
  const standardCurve: StandardCurvePoint[] = [];
  const tValues = Array.from(byT.keys()).sort((a, b) => a - b);
  
  for (const t of tValues) {
    const retentions = byT.get(t) || [];
    if (retentions.length === 0) continue;
    
    const avgRetention = retentions.reduce((a, b) => a + b, 0) / retentions.length;
    const minRetention = Math.min(...retentions);
    const maxRetention = Math.max(...retentions);
    const stdDev = calculateStdDev(retentions, avgRetention);
    
    standardCurve.push({
      t,
      avgRetention,
      sampleSize: retentions.length,
      minRetention,
      maxRetention,
      stdDev
    });
  }
  
  console.log(`[fipe-cohort-standard-curve] Raw standard curve has ${standardCurve.length} t-points`);
  
  // Log first few points for debugging (before correction)
  console.log('[fipe-cohort-standard-curve] BEFORE monotonic correction:');
  standardCurve.slice(0, 8).forEach(p => {
    console.log(`  t=${p.t}: avg=${(p.avgRetention * 100).toFixed(1)}% (n=${p.sampleSize}, range=${(p.minRetention * 100).toFixed(1)}-${(p.maxRetention * 100).toFixed(1)}%)`);
  });
  
  // 6. APPLY MONOTONIC DECAY CORRECTION - CRITICAL FIX
  // This ensures the curve is always decreasing (cars ALWAYS depreciate)
  const correctedCurve = enforceMonotonicDecay(standardCurve);
  
  console.log('[fipe-cohort-standard-curve] AFTER monotonic correction:');
  correctedCurve.slice(0, 8).forEach(p => {
    console.log(`  t=${p.t}: avg=${(p.avgRetention * 100).toFixed(1)}%`);
  });
  
  // 7. Calculate regression factors ON THE CORRECTED CURVE
  const factors = calculateExponentialRegression(correctedCurve);
  
  console.log(`[fipe-cohort-standard-curve] Final Regression: B=${factors.B.toFixed(4)} (${(factors.B * 100).toFixed(2)}%/year), C=${factors.C.toFixed(4)}, R²=${factors.rSquared.toFixed(4)}`);
  
  return {
    success: true,
    fipeCode,
    modelYearsUsed: modelYears,
    dataPointsTotal: filteredPoints.length,
    standardCurve: correctedCurve, // Return the CORRECTED curve
    factors
  };
}

// --- HTTP Handler ---

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

    if (!fipeCode) {
      return new Response(JSON.stringify({ success: false, error: "Invalid payload: fipeCode required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startedAt = Date.now();
    const result = await calculateStandardCurve(fipeCode);
    const elapsedMs = Date.now() - startedAt;
    
    console.log(`[fipe-cohort-standard-curve] Completed in ${elapsedMs}ms`);

    return new Response(
      JSON.stringify({ ...result, elapsedMs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error("[fipe-cohort-standard-curve] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
