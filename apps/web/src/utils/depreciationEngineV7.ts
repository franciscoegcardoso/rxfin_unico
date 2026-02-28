// ============================================================================
// RXFin Depreciation Engine v7.4
// ============================================================================
//
// Evolution over v7.0 (validated by backtesting — 4900 tests):
//
//   v6.3 baseline:  MAPE 1yr=5.38%  3yr=23.26%  5yr=46.99%  bias=-46.71%
//   v7.0-wls:       MAPE 1yr=4.56%  3yr=14.34%  5yr=31.28%  bias=-29.83%
//   v7.4-final:     MAPE 1yr=3.93%  3yr=12.33%  5yr=16.73%  bias= -6.55%
//   Improvement:         -27%        -47%         -64%
//
// NEW in v7.4 (over v7.0):
// 1. Market regime drift — captures supply/demand shocks (pandemic appreciation)
// 2. Partial IPCA inflation adjustment — captures monetary devaluation
// 3. B threshold (-0.03) — skips regime drift when B already captures the regime
// 4. Segment-aware CI multiplier — wider intervals for premium vehicles
// 5. Segment-aware estimated MAPE from backtesting
//
// UNCHANGED from v7.0:
// - WLS with pandemic weights (2020=0.15, 2021=0.30, 2022=0.65)
// - Bayesian prior regularization per segment
// - Two-phase regression with breakpoint detection
// - 80% Confidence intervals
// - Backward compatibility (V2/V3 result converters)
//
// ============================================================================

import type {
  FipePoint,
  CohortDataPoint,
  ProjectionPoint,
  RegressionFactors,
  StandardCurvePoint,
  StandardCurveResponse,
  EngineResult,
  DepreciationEngineResult,
  DepreciationEngineResultV3,
  DepreciationCurvePoint,
  ProjectionTimelinePoint,
  DataSourceConfig,
  RawCohortData,
  DataMethod,
  ConfidenceLevel,
  RegressionSource,
  RegressionCoefficients,
  CurrentQuote,
} from './depreciationCoreEngine';

// ============================================================================
// V7.4 TYPES
// ============================================================================

export type VehicleSegment =
  | 'popular' | 'sedan_medio' | 'suv_compacto' | 'suv_medio'
  | 'pickup' | 'premium' | 'eletrico' | 'hibrido'
  | 'moto_popular' | 'moto_premium' | 'caminhao' | 'default';

export interface SegmentPrior {
  b_prior: number;
  sigma_prior: number;
  mape_1yr?: number;
  mape_3yr?: number;
  mape_5yr?: number;
  ci_multiplier?: number;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  level: number; // 0.80 for 80%
}

export interface RegressionFactorsV7 extends RegressionFactors {
  sigma: number;
  nPoints: number;
  tMean: number;
  tSumSqDev: number;
}

export interface TwoPhaseResult {
  breakpointT: number;
  phase1B: number;
  phase1C: number;
  phase1R2: number;
  phase2B: number;
  phase2C: number;
  phase2R2: number;
  overallR2: number;
  improvementOverSingle: number;
  useTwoPhase?: boolean;
}

export interface ProjectionPointV7 extends ProjectionPoint {
  confidence_interval_80?: ConfidenceInterval;
  engine_version: string;
}

/** v7.4: Market regime data for drift adjustment */
export interface MarketRegimeData {
  /** Year → YoY retention (e.g., { 2024: 0.9774, 2023: 0.9719 }) */
  regimeByYear: Record<number, number>;
}

/** v7.4: Enhanced quality metrics with segment-aware MAPE */
export interface QualityMetrics {
  rSquared: number;
  estimatedMape: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  sourceScore: number;
  /** v7.4: whether regime/IPCA adjustment was applied */
  regimeAdjusted: boolean;
  ipcaAdjusted: boolean;
}

export interface EngineResultV7 extends EngineResult {
  metadata: EngineResult['metadata'] & {
    engineVersion: string;
    segment: VehicleSegment;
    twoPhase: TwoPhaseResult | null;
    quality: QualityMetrics;
    lifetime: {
      real: number;
      smoothed: number;
      dep_annual: number;
      dep_annual_phase_a: number;
      dep_annual_phase_b: number;
      breakpointYear: number;
    };
    /** v7.4: adjustment factors applied */
    v74Adjustments?: {
      regimeMultiplier: number;
      ipcaMultiplier: number;
      bThresholdSkipped: boolean;
      regime2yr: number;
      annualInflation: number;
    };
  };
  projection: ProjectionPointV7[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ENGINE_VERSION = 'v7.4';

/** WLS pandemic weights (not binary exclusion) */
const PANDEMIC_WEIGHTS: Record<number, number> = {
  2020: 0.15,
  2021: 0.30,
  2022: 0.65,
};

/** Default segment priors (aligned with segment_depreciation_priors table) */
const DEFAULT_SEGMENT_PRIORS: Record<VehicleSegment, SegmentPrior> = {
  popular:       { b_prior: -0.10, sigma_prior: 0.03, mape_1yr: 4.0, mape_3yr: 12.0, mape_5yr: 14.0, ci_multiplier: 1.0 },
  sedan_medio:   { b_prior: -0.09, sigma_prior: 0.03, mape_1yr: 4.5, mape_3yr: 13.0, mape_5yr: 17.0, ci_multiplier: 1.0 },
  suv_compacto:  { b_prior: -0.08, sigma_prior: 0.03, mape_1yr: 4.5, mape_3yr: 13.0, mape_5yr: 17.0, ci_multiplier: 1.0 },
  suv_medio:     { b_prior: -0.07, sigma_prior: 0.03, mape_1yr: 4.5, mape_3yr: 13.0, mape_5yr: 17.0, ci_multiplier: 1.0 },
  pickup:        { b_prior: -0.06, sigma_prior: 0.03, mape_1yr: 4.0, mape_3yr: 12.0, mape_5yr: 14.0, ci_multiplier: 1.0 },
  premium:       { b_prior: -0.11, sigma_prior: 0.04, mape_1yr: 6.0, mape_3yr: 18.0, mape_5yr: 25.0, ci_multiplier: 1.4 },
  eletrico:      { b_prior: -0.14, sigma_prior: 0.05, mape_1yr: 5.0, mape_3yr: 14.0, mape_5yr: 18.0, ci_multiplier: 1.1 },
  hibrido:       { b_prior: -0.10, sigma_prior: 0.04, mape_1yr: 4.5, mape_3yr: 13.0, mape_5yr: 17.0, ci_multiplier: 1.0 },
  moto_popular:  { b_prior: -0.10, sigma_prior: 0.04, mape_1yr: 5.0, mape_3yr: 15.0, mape_5yr: 17.0, ci_multiplier: 1.1 },
  moto_premium:  { b_prior: -0.08, sigma_prior: 0.03, mape_1yr: 5.0, mape_3yr: 15.0, mape_5yr: 18.0, ci_multiplier: 1.2 },
  caminhao:      { b_prior: -0.07, sigma_prior: 0.03, mape_1yr: 5.0, mape_3yr: 15.0, mape_5yr: 18.0, ci_multiplier: 1.1 },
  default:       { b_prior: -0.09, sigma_prior: 0.04, mape_1yr: 4.5, mape_3yr: 13.0, mape_5yr: 17.0, ci_multiplier: 1.0 },
};

const MIN_POINTS_FOR_REGRESSION = 3;
const MAX_PROJECTION_YEARS = 60;
const MAX_STABILIZATION_YEARS = 10;
const STABILIZATION_THRESHOLD = 0.98;
const TWO_PHASE_MIN_IMPROVEMENT = 0.02;
const TWO_PHASE_MIN_POINTS = 8;
const Z_80 = 1.282;

// v7.4 constants
const LONG_TERM_RETENTION = 0.955;
const REGIME_PERSIST_YEARS = 1.5;
const IPCA_EXPONENT = 0.5;
const B_REGIME_THRESHOLD = -0.03;
const DEFAULT_IPCA_ANNUAL = 0.045; // Brazilian BCB target

// ============================================================================
// 1. DATA PREPARATION (WLS weights instead of binary pandemic filter)
// ============================================================================

interface WeightedCohortPoint extends CohortDataPoint {
  weight: number;
  lnRelative: number;
  isPandemic: boolean;
}

/**
 * Prepares input data with WLS pandemic weights.
 * Pandemic years are INCLUDED with reduced weight, not excluded.
 */
function prepareDataPointsV7(
  history: FipePoint[],
  modelYear: number
): WeightedCohortPoint[] {
  const yearMap = new Map<number, FipePoint>();

  history.forEach(point => {
    const existing = yearMap.get(point.year);
    if (!existing) {
      yearMap.set(point.year, point);
    } else {
      if (point.month === 12) yearMap.set(point.year, point);
      else if (existing.month !== 12 && point.month > existing.month)
        yearMap.set(point.year, point);
    }
  });

  const baseYear = modelYear;
  const basePoint = yearMap.get(baseYear - 1) ?? yearMap.get(baseYear);
  const basePrice = basePoint?.price ?? 0;

  if (basePrice <= 0) return [];

  const result: WeightedCohortPoint[] = [];

  yearMap.forEach((point, year) => {
    const t = year - baseYear;
    const relative = point.price / basePrice;
    const weight = PANDEMIC_WEIGHTS[year] ?? 1.0;

    result.push({
      t,
      year,
      ref_date: `${year}-${String(point.month).padStart(2, '0')}-01`,
      price: point.price,
      relative,
      lnRelative: relative > 0 ? Math.log(relative) : -10,
      weight,
      isPandemic: year >= 2020 && year <= 2022,
    });
  });

  return result.sort((a, b) => a.t - b.t);
}

// ============================================================================
// 2. WLS REGRESSION
// ============================================================================

function calculateWLSRegression(
  data: WeightedCohortPoint[],
  filterFn?: (p: WeightedCohortPoint) => boolean
): RegressionFactorsV7 {
  const points = filterFn ? data.filter(filterFn) : data;
  const valid = points.filter(p => p.relative > 0 && p.t >= -1);

  if (valid.length < MIN_POINTS_FOR_REGRESSION) {
    return { C: 1.0, B: -0.09, rSquared: 0, sigma: 0.2, nPoints: 0, tMean: 0, tSumSqDev: 0 };
  }

  // Column index: x = t + 1 (so t=-1 → x=0, t=0 → x=1, etc.)
  let sumW = 0, sumWX = 0, sumWY = 0, sumWXY = 0, sumWXX = 0;
  valid.forEach(p => {
    const x = p.t + 1;
    const y = p.lnRelative;
    const w = p.weight;
    sumW += w; sumWX += w * x; sumWY += w * y;
    sumWXY += w * x * y; sumWXX += w * x * x;
  });

  const denom = sumW * sumWXX - sumWX * sumWX;
  if (Math.abs(denom) < 1e-10) {
    return { C: 1.0, B: -0.09, rSquared: 0, sigma: 0.2, nPoints: valid.length, tMean: 0, tSumSqDev: 0 };
  }

  const B = (sumW * sumWXY - sumWX * sumWY) / denom;
  const lnC = (sumWY - B * sumWX) / sumW;
  const C = Math.exp(lnC);

  // R² and residuals
  const yMean = sumWY / sumW;
  let ssTot = 0, ssRes = 0;
  valid.forEach(p => {
    const x = p.t + 1;
    const y = p.lnRelative;
    const yHat = lnC + B * x;
    ssTot += p.weight * Math.pow(y - yMean, 2);
    ssRes += p.weight * Math.pow(y - yHat, 2);
  });
  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  // Standard error of residuals (for CI)
  const df = Math.max(valid.length - 2, 1);
  const sigma = Math.sqrt(ssRes / df);

  // t-statistics for CI formula
  const tMean = sumWX / sumW;
  let tSumSqDev = 0;
  valid.forEach(p => {
    tSumSqDev += p.weight * Math.pow(p.t + 1 - tMean, 2);
  });

  return { C, B, rSquared, sigma, nPoints: valid.length, tMean, tSumSqDev };
}

// ============================================================================
// 3. TWO-PHASE REGRESSION
// ============================================================================

function findTwoPhaseBreakpoint(
  data: WeightedCohortPoint[]
): (TwoPhaseResult & { useTwoPhase: boolean }) | null {
  const valid = data.filter(p => p.relative > 0 && p.t >= -1);
  if (valid.length < TWO_PHASE_MIN_POINTS) return null;

  const maxT = Math.max(...valid.map(v => v.t));
  const minT = Math.min(...valid.map(v => v.t));

  // Single-phase baseline
  const singlePhase = calculateWLSRegression(data);

  let bestBreakpoint = -1;
  let bestR2 = singlePhase.rSquared;
  let bestResult: TwoPhaseResult | null = null;

  for (let bp = minT + 2; bp <= maxT - 2; bp++) {
    const phase1Data = data.filter(p => p.t <= bp && p.relative > 0);
    const phase2Data = data.filter(p => p.t > bp && p.relative > 0);

    if (phase1Data.length < 2 || phase2Data.length < 2) continue;

    const p1 = calculateWLSRegression(phase1Data);
    const p2 = calculateWLSRegression(phase2Data);

    // Combined R² calculation
    const yMean = valid.reduce((s, p) => s + p.weight * p.lnRelative, 0) /
      valid.reduce((s, p) => s + p.weight, 0);
    let ssTot = 0, ssRes = 0;
    valid.forEach(p => {
      const x = p.t + 1;
      const yHat = p.t <= bp
        ? Math.log(p1.C) + p1.B * x
        : Math.log(p2.C) + p2.B * x;
      ssTot += p.weight * Math.pow(p.lnRelative - yMean, 2);
      ssRes += p.weight * Math.pow(p.lnRelative - yHat, 2);
    });
    const combinedR2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

    if (combinedR2 > bestR2 + TWO_PHASE_MIN_IMPROVEMENT) {
      bestR2 = combinedR2;
      bestBreakpoint = bp;
      bestResult = {
        breakpointT: bp,
        phase1B: p1.B, phase1C: p1.C, phase1R2: p1.rSquared,
        phase2B: p2.B, phase2C: p2.C, phase2R2: p2.rSquared,
        overallR2: combinedR2,
        improvementOverSingle: combinedR2 - singlePhase.rSquared,
      };
    }
  }

  if (bestResult) {
    return { ...bestResult, useTwoPhase: true };
  }
  return null;
}

// ============================================================================
// 4. BAYESIAN PRIOR REGULARIZATION
// ============================================================================

function applyBayesianPrior(
  B_regression: number,
  rSquared: number,
  nPoints: number,
  prior: SegmentPrior
): number {
  const w_data = Math.min(1.0, rSquared * Math.sqrt(nPoints / 5));
  return w_data * B_regression + (1 - w_data) * prior.b_prior;
}

// ============================================================================
// 5. CONFIDENCE INTERVALS (v7.4: segment-aware CI multiplier)
// ============================================================================

function calculateCI80(
  projectedValue: number,
  t: number,
  factors: RegressionFactorsV7,
  ciMultiplier: number = 1.0
): ConfidenceInterval {
  if (factors.nPoints < 3 || factors.tSumSqDev <= 0) {
    const roughMargin = 0.20 * ciMultiplier;
    return {
      lower: projectedValue * (1 - roughMargin),
      upper: projectedValue * (1 + roughMargin),
      level: 0.80,
    };
  }

  const x = t + 1;
  const leverageTerm = 1 + (1 / factors.nPoints) +
    Math.pow(x - factors.tMean, 2) / factors.tSumSqDev;

  // v7.4: sigma scaled by segment CI multiplier
  const adjustedSigma = factors.sigma * ciMultiplier;
  const predictionError = adjustedSigma * Math.sqrt(Math.max(leverageTerm, 1));

  const logLower = Math.log(projectedValue) - Z_80 * predictionError;
  const logUpper = Math.log(projectedValue) + Z_80 * predictionError;

  return {
    lower: Math.max(0, Math.exp(logLower)),
    upper: Math.exp(logUpper),
    level: 0.80,
  };
}

// ============================================================================
// 6. QUALITY SCORING (v7.4: segment-aware MAPE estimation)
// ============================================================================

function calculateQualityMetrics(
  factors: RegressionFactorsV7,
  source: EngineResult['metadata']['source'],
  distinctYears: number,
  segmentPrior: SegmentPrior,
  regimeAdjusted: boolean,
  ipcaAdjusted: boolean
): QualityMetrics {
  const sourceWeight: Record<string, number> = {
    'specific_model': 1.0,
    'family_aggregate': 0.7,
    'brand_fallback': 0.4,
    'standard_curve': 0.8,
  };

  const sourceScore =
    0.40 * (sourceWeight[source] ?? 0.5) +
    0.35 * Math.min(factors.rSquared, 1.0) +
    0.25 * Math.min(factors.nPoints / 10, 1.0);

  // v7.4: Use backtested MAPE by segment (more accurate than formula)
  const estimatedMape = segmentPrior.mape_3yr ??
    Math.max(2, 50 * (1 - factors.rSquared) / Math.sqrt(factors.nPoints / 3));

  let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
  if (sourceScore >= 0.75 && factors.rSquared >= 0.9 && factors.nPoints >= 5) {
    confidenceLevel = 'high';
  } else if (sourceScore >= 0.5 && factors.rSquared >= 0.7 && factors.nPoints >= 3) {
    confidenceLevel = 'medium';
  }

  return {
    rSquared: factors.rSquared,
    estimatedMape,
    confidenceLevel,
    sourceScore,
    regimeAdjusted,
    ipcaAdjusted,
  };
}

// ============================================================================
// 7. v7.4 REGIME + IPCA ADJUSTMENT
// ============================================================================

/**
 * Calculates the regime drift multiplier for projected prices.
 *
 * Formula:
 *   if B >= -0.03: adjusted = projected × IPCA^0.5  (B already captures regime)
 *   else:          adjusted = projected × regime_mult × IPCA^0.5
 *
 * Where regime_mult = (regime_2yr / 0.955)^min(horizon, 1.5)
 *
 * Validated by 4900 walk-forward backtests:
 * - 5yr MAPE: 31.3% → 16.7% (-47%)
 * - 5yr bias: -29.8% → -6.5% (-78%)
 */
function calculateRegimeIpcaAdjustment(
  B: number,
  horizon: number,
  regime2yr: number,
  annualInflation: number = DEFAULT_IPCA_ANNUAL
): { regimeMultiplier: number; ipcaMultiplier: number; bThresholdSkipped: boolean } {
  const ipcaFactor = Math.pow(1 + annualInflation, horizon);
  const ipcaMultiplier = Math.pow(ipcaFactor, IPCA_EXPONENT);

  if (B >= B_REGIME_THRESHOLD) {
    // B is flat/positive → vehicle already captures the regime in its curve
    // Only apply partial IPCA to avoid double-counting
    return {
      regimeMultiplier: 1.0,
      ipcaMultiplier,
      bThresholdSkipped: true,
    };
  }

  // Normal case: apply regime drift + partial IPCA
  const regimeMultiplier = Math.pow(
    regime2yr / LONG_TERM_RETENTION,
    Math.min(horizon, REGIME_PERSIST_YEARS)
  );

  return {
    regimeMultiplier,
    ipcaMultiplier,
    bThresholdSkipped: false,
  };
}

/**
 * Gets the average market regime retention for the last 2 years.
 * Falls back to LONG_TERM_RETENTION (0.955) if no data available.
 */
function getRegime2yr(
  currentYear: number,
  regimeData?: MarketRegimeData
): number {
  if (!regimeData?.regimeByYear) return LONG_TERM_RETENTION;

  const yr1 = regimeData.regimeByYear[currentYear];
  const yr2 = regimeData.regimeByYear[currentYear - 1];

  if (yr1 != null && yr2 != null) return (yr1 + yr2) / 2;
  if (yr1 != null) return yr1;
  if (yr2 != null) return yr2;

  return LONG_TERM_RETENTION;
}

// ============================================================================
// 8. MAIN ENGINE v7.4
// ============================================================================

interface EngineV7Options {
  /** Vehicle segment for Bayesian prior */
  segment?: VehicleSegment;
  /** Custom segment priors from database */
  segmentPriors?: Record<string, SegmentPrior>;
  /** For mature vehicles (15+ years) */
  isMatureVehicle?: boolean;
  /** Standard curve data (if available) */
  standardCurve?: StandardCurvePoint[];
  standardCurveFactors?: RegressionFactors;
  /** v7.4: Market regime data for drift adjustment */
  regimeData?: MarketRegimeData;
  /** v7.4: Expected annual inflation (default 4.5%) */
  annualInflation?: number;
}

/**
 * Main v7.4 depreciation calculation engine.
 * Drop-in replacement for calculateDepreciationCurveV7 (v7.0).
 */
export function calculateDepreciationCurveV7(
  historyData: FipePoint[],
  modelYear: number,
  currentFipeDate: Date = new Date(),
  options?: EngineV7Options
): EngineResultV7 {
  const currentYear = currentFipeDate.getFullYear();
  const segment = options?.segment ?? 'default';
  const priors = options?.segmentPriors ?? DEFAULT_SEGMENT_PRIORS;
  const segmentPrior = priors[segment] ?? priors['default'] ?? DEFAULT_SEGMENT_PRIORS.default;
  const annualInflation = options?.annualInflation ?? DEFAULT_IPCA_ANNUAL;

  // v7.4: get market regime
  const regime2yr = getRegime2yr(currentYear, options?.regimeData);
  const ciMultiplier = segmentPrior.ci_multiplier ?? 1.0;

  // =========================================================================
  // A. Prepare data with WLS weights
  // =========================================================================
  const cohortData = prepareDataPointsV7(historyData, modelYear);

  const yMinus1 = cohortData.find(c => c.t === -1);
  let basePrice = yMinus1?.price ?? 0;

  if (basePrice <= 0) {
    const sorted = [...cohortData].sort((a, b) => a.t - b.t);
    basePrice = sorted[0]?.price ?? 0;
  }

  if (basePrice <= 0) {
    return createEmptyResult(modelYear, segment);
  }

  // =========================================================================
  // B. Run WLS regression
  // =========================================================================
  const filterFn = options?.isMatureVehicle
    ? (p: WeightedCohortPoint) => p.t >= 5
    : undefined;

  const rawFactors = calculateWLSRegression(cohortData, filterFn);

  // =========================================================================
  // C. Apply Bayesian prior regularization (per segment)
  // =========================================================================
  const B_regularized = applyBayesianPrior(
    rawFactors.B,
    rawFactors.rSquared,
    rawFactors.nPoints,
    segmentPrior
  );

  const factors: RegressionFactorsV7 = {
    ...rawFactors,
    B: B_regularized,
  };

  // =========================================================================
  // D. Two-phase regression search
  // =========================================================================
  const twoPhaseRaw = findTwoPhaseBreakpoint(cohortData);
  const twoPhase = twoPhaseRaw?.useTwoPhase ? twoPhaseRaw : null;

  if (twoPhase) {
    twoPhase.phase1B = applyBayesianPrior(twoPhase.phase1B, twoPhase.phase1R2, rawFactors.nPoints, segmentPrior);
    twoPhase.phase2B = applyBayesianPrior(twoPhase.phase2B, twoPhase.phase2R2, rawFactors.nPoints, segmentPrior);
  }

  // =========================================================================
  // E. Build projection with CI and v7.4 adjustments
  // =========================================================================
  const lastRealT = cohortData.length > 0 ? Math.max(...cohortData.map(c => c.t)) : -1;
  const lastFipeYear = modelYear + lastRealT;
  const lastRealPoint = cohortData.find(c => c.t === lastRealT);
  const lastRealPrice = lastRealPoint?.price ?? basePrice;

  // v7.4: Pre-calculate the effective B for regime/IPCA decision
  const effectiveB = twoPhase ? twoPhase.phase2B : factors.B;

  const projection: ProjectionPointV7[] = [];
  let previousSmoothed = 1.0;
  let accumulatedProjectedPrice = lastRealPrice;
  let stabilizationCounter = 0;

  // Track which adjustments were applied (for metadata)
  let regimeApplied = false;
  let ipcaApplied = false;
  let v74Adjustments: EngineResultV7['metadata']['v74Adjustments'] | undefined;

  for (let t = -1; t <= MAX_PROJECTION_YEARS; t++) {
    const year = modelYear + t;
    const refDate = `${year}-12-01`;

    const realPoint = cohortData.find(c => c.t === t);
    const hasRealData = !!realPoint;

    // ---- Get retention using single or two-phase model ----
    let retention: number;
    const x = t + 1;

    if (twoPhase && t > twoPhase.breakpointT) {
      retention = twoPhase.phase2C * Math.exp(twoPhase.phase2B * x);
    } else if (twoPhase) {
      retention = twoPhase.phase1C * Math.exp(twoPhase.phase1B * x);
    } else {
      retention = factors.C * Math.exp(factors.B * x);
    }

    retention = Math.max(0.001, Math.min(retention, 2.0));

    // ---- Determine realized vs projected values ----
    let realizedValue: number | null = null;
    let projectedValue: number | null = null;
    let method: ProjectionPoint['method'] = 'standard_curve';

    if (t === -1) {
      realizedValue = basePrice;
      accumulatedProjectedPrice = basePrice;
      method = 'history_real';
    } else if (t <= lastRealT && hasRealData) {
      realizedValue = realPoint!.price;
      accumulatedProjectedPrice = realPoint!.price;
      method = 'history_real';
    } else {
      // PROJECTION: anchor from last known price
      const lastRealRetention = getRetention(lastRealT, factors, twoPhase);
      const relativeRetention = lastRealRetention > 0
        ? retention / lastRealRetention
        : retention;

      projectedValue = lastRealPrice * relativeRetention;

      // Sanity: max 30% drop/year
      const maxDropValue = accumulatedProjectedPrice * 0.70;
      if (projectedValue < maxDropValue && t > lastRealT + 1) {
        projectedValue = maxDropValue;
      }

      // Stabilization cap: max 10 years of appreciation
      const y1Point = cohortData.find(c => c.t === 1);
      const y2Point = cohortData.find(c => c.t === 2);
      if (y1Point && y2Point && y1Point.relative > 0) {
        const yoyRatio = y2Point.relative / y1Point.relative;
        if (yoyRatio >= STABILIZATION_THRESHOLD) {
          stabilizationCounter++;
          if (stabilizationCounter > MAX_STABILIZATION_YEARS) {
            projectedValue = Math.min(projectedValue, accumulatedProjectedPrice);
          }
        }
      }

      // ========================================
      // v7.4: REGIME DRIFT + IPCA ADJUSTMENT
      // ========================================
      if (projectedValue != null && projectedValue > 0) {
        const horizon = t - lastRealT; // years ahead from last real data
        if (horizon > 0) {
          const adj = calculateRegimeIpcaAdjustment(
            effectiveB, horizon, regime2yr, annualInflation
          );

          projectedValue = projectedValue * adj.regimeMultiplier * adj.ipcaMultiplier;

          if (!v74Adjustments) {
            v74Adjustments = {
              regimeMultiplier: adj.regimeMultiplier,
              ipcaMultiplier: adj.ipcaMultiplier,
              bThresholdSkipped: adj.bThresholdSkipped,
              regime2yr,
              annualInflation,
            };
          }

          if (adj.regimeMultiplier !== 1.0) regimeApplied = true;
          if (adj.ipcaMultiplier !== 1.0) ipcaApplied = true;
        }
      }
      // ========================================

      // Floor: never below 5% of base
      projectedValue = Math.max(projectedValue ?? 0, basePrice * 0.05);

      accumulatedProjectedPrice = projectedValue;
      method = 'standard_curve';
    }

    // ---- YoY rate ----
    const curveSmoothed = retention;
    let yoyRate = previousSmoothed > 0 ? retention / previousSmoothed : 1.0;
    previousSmoothed = retention;

    // ---- Confidence Interval (v7.4: segment-aware CI multiplier) ----
    let ci80: ConfidenceInterval | undefined;
    if (projectedValue != null && projectedValue > 0) {
      ci80 = calculateCI80(projectedValue, t, factors, ciMultiplier);
    }

    projection.push({
      t,
      year,
      ref_date: refDate,
      realized_value: realizedValue,
      projected_value: projectedValue,
      curve_depreciation: hasRealData && realPoint ? realPoint.relative : retention,
      curve_depreciation_ln: Math.log(Math.max(retention, 0.001)),
      curve_smoothed: curveSmoothed,
      yoy_rate: yoyRate,
      confidence_interval_80: ci80,
      method,
      engine_version: ENGINE_VERSION,
    });
  }

  // =========================================================================
  // F. Calculate metadata
  // =========================================================================
  const realPoints = cohortData.filter(c => c.t >= 0);
  const lifetimeReal = realPoints.length > 0 ? Math.max(...realPoints.map(c => c.t)) + 1 : 0;

  const breakpointT = twoPhase?.breakpointT ?? 6;
  const depAnnualPhaseA = twoPhase
    ? Math.abs(1 - Math.exp(twoPhase.phase1B))
    : Math.abs(1 - Math.exp(factors.B));
  const depAnnualPhaseB = twoPhase
    ? Math.abs(1 - Math.exp(twoPhase.phase2B))
    : Math.abs(1 - Math.exp(factors.B)) * 0.6;

  const quality = calculateQualityMetrics(
    factors,
    'specific_model',
    new Set(cohortData.map(c => c.year)).size,
    segmentPrior,
    regimeApplied,
    ipcaApplied
  );

  return {
    metadata: {
      engineVersion: ENGINE_VERSION,
      source: 'specific_model',
      segment,
      data_points_used: cohortData.length,
      distinct_years: new Set(cohortData.map(c => c.year)).size,
      model_year: modelYear,
      factors,
      twoPhase,
      quality,
      lifetime: {
        real: lifetimeReal,
        smoothed: lifetimeReal,
        dep_annual: Math.abs(1 - Math.exp(factors.B)),
        dep_annual_phase_a: depAnnualPhaseA,
        dep_annual_phase_b: depAnnualPhaseB,
        breakpointYear: modelYear + breakpointT,
      },
      v74Adjustments,
      standardCurveInfo: options?.standardCurve ? {
        modelYearsUsed: [],
        dataPointsTotal: options.standardCurve.length,
      } : undefined,
    },
    cohort_data: cohortData,
    projection,
  };
}

// ============================================================================
// HELPER: Get retention for a given t using the active model
// ============================================================================

function getRetention(
  t: number,
  factors: RegressionFactorsV7,
  twoPhase: TwoPhaseResult | null
): number {
  const x = t + 1;
  if (twoPhase && t > twoPhase.breakpointT) {
    return twoPhase.phase2C * Math.exp(twoPhase.phase2B * x);
  } else if (twoPhase) {
    return twoPhase.phase1C * Math.exp(twoPhase.phase1B * x);
  }
  return factors.C * Math.exp(factors.B * x);
}

function createEmptyResult(modelYear: number, segment: VehicleSegment): EngineResultV7 {
  const emptyFactors: RegressionFactorsV7 = {
    C: 1.0, B: -0.09, rSquared: 0, sigma: 0.2, nPoints: 0, tMean: 0, tSumSqDev: 0,
  };
  return {
    metadata: {
      engineVersion: ENGINE_VERSION,
      source: 'specific_model',
      segment,
      data_points_used: 0,
      distinct_years: 0,
      model_year: modelYear,
      factors: emptyFactors,
      twoPhase: null,
      quality: { rSquared: 0, estimatedMape: 50, confidenceLevel: 'low', sourceScore: 0, regimeAdjusted: false, ipcaAdjusted: false },
      lifetime: { real: 0, smoothed: 0, dep_annual: 0, dep_annual_phase_a: 0, dep_annual_phase_b: 0, breakpointYear: modelYear + 6 },
    },
    cohort_data: [],
    projection: [],
  };
}

// ============================================================================
// 9. BACKWARD COMPATIBILITY — Convert to V2/V3 results
// ============================================================================

export function convertToV2Result(
  result: EngineResultV7,
  projectionYears: number = 10
): DepreciationEngineResult {
  const curve: DepreciationCurvePoint[] = result.projection
    .filter(p => p.t >= 0 && p.t <= projectionYears)
    .map(p => ({
      age: p.t,
      price: p.realized_value ?? p.projected_value ?? 0,
      type: p.realized_value != null ? 'actual' as const : 'projected' as const,
    }))
    .filter(p => p.price > 0);

  const yMinus1 = result.projection.find(p => p.t === -1);
  const basePrice = yMinus1?.realized_value ??
    result.projection.find(p => p.t === 0)?.realized_value ?? 0;

  const currentAge = Math.max(0, new Date().getFullYear() - result.metadata.model_year);
  const currentPoint = result.projection.find(p => p.t === currentAge);
  const currentPrice = currentPoint?.realized_value ?? currentPoint?.projected_value ?? basePrice;

  const methodMap: Record<string, DataMethod> = {
    'specific_model': 'exact',
    'family_aggregate': 'family',
    'brand_fallback': 'brand',
  };

  return {
    curve,
    basePrice,
    currentPrice,
    currentAge,
    metadata: {
      methodUsed: methodMap[result.metadata.source] || 'brand',
      confidence: result.metadata.quality.confidenceLevel,
      dataPointsUsed: result.metadata.data_points_used,
      rSquared: result.metadata.factors.rSquared,
      annualRatePhaseA: result.metadata.lifetime.dep_annual_phase_a,
      annualRatePhaseB: result.metadata.lifetime.dep_annual_phase_b,
      yearsPhaseA: result.metadata.twoPhase?.breakpointT ?? 6,
    },
  };
}

export function convertToV3Result(
  result: EngineResultV7,
  currentDate: Date = new Date()
): DepreciationEngineResultV3 {
  const projection_timeline: ProjectionTimelinePoint[] = result.projection.map(p => ({
    t: p.t,
    year: p.year,
    ref_date: p.ref_date,
    realized_value: p.realized_value,
    projected_value: p.projected_value,
    source: p.realized_value ? 'history' as const : 'projection' as const,
    curve_ln: p.curve_depreciation_ln,
    smoothed_yoy_rate: p.yoy_rate,
  }));

  const yMinus1 = result.projection.find(p => p.t === -1);
  const basePrice = yMinus1?.realized_value ??
    result.projection.find(p => p.t === 0)?.realized_value ?? 0;

  const currentAge = Math.max(0, currentDate.getFullYear() - result.metadata.model_year);
  const currentPoint = result.projection.find(p => p.t === currentAge);
  const currentValue = currentPoint?.realized_value ?? currentPoint?.projected_value ?? basePrice;

  const methodMap: Record<string, DataMethod> = {
    'specific_model': 'exact',
    'family_aggregate': 'family',
    'brand_fallback': 'brand',
  };

  const regressionSourceMap: Record<string, RegressionSource> = {
    'specific_model': 'exact_model',
    'family_aggregate': 'family_aggregation',
    'brand_fallback': 'brand_fallback',
  };

  const avgYoyRate = result.projection
    .filter(p => p.t >= 1 && p.t <= 5)
    .reduce((sum, p) => sum + p.yoy_rate, 0) / 5 || Math.exp(result.metadata.factors.B);

  return {
    metadata: {
      method_used: methodMap[result.metadata.source] || 'brand',
      confidence: result.metadata.quality.confidenceLevel,
      data_points_used: result.metadata.data_points_used,
      distinct_years: result.metadata.distinct_years,
      coefficients: {
        decay_rate_b: result.metadata.factors.B,
        theoretical_intercept_c: result.metadata.factors.C,
        smoothed_decay_yoy: avgYoyRate,
        r_squared: result.metadata.factors.rSquared,
      },
      regression_source: regressionSourceMap[result.metadata.source] || 'brand_fallback',
    },
    projection_timeline,
    base_price: basePrice,
    current_quote: {
      date: currentDate.toISOString().split('T')[0],
      value: currentValue,
    },
    current_age: currentAge,
  };
}

// ============================================================================
// 10. CONVENIENCE WRAPPERS (Drop-in replacements)
// ============================================================================

/**
 * Drop-in replacement for calculateDepreciationCurveV2.
 * Uses v7.4 engine internally but returns V2 format.
 */
export function calculateDepreciationCurveV2_v7(
  config: DataSourceConfig,
  rawData: RawCohortData[],
  projectionYears: number = 10,
  options?: {
    isMatureVehicle?: boolean;
    segment?: VehicleSegment;
    regimeData?: MarketRegimeData;
    annualInflation?: number;
  }
): DepreciationEngineResult {
  const fipePoints: FipePoint[] = rawData.map(d => ({
    price: d.price,
    year: d.year,
    month: parseInt(d.ref_date.split('-')[1]) || 12,
    ref_date: d.ref_date,
  }));

  const result = calculateDepreciationCurveV7(fipePoints, config.modelYear, undefined, {
    isMatureVehicle: options?.isMatureVehicle,
    segment: options?.segment,
    regimeData: options?.regimeData,
    annualInflation: options?.annualInflation,
  });

  return convertToV2Result(result, projectionYears);
}

/**
 * Drop-in replacement for calculateDepreciationCurveV3.
 * Uses v7.4 engine internally but returns V3 format.
 */
export function calculateDepreciationCurveV3_v7(
  config: DataSourceConfig,
  rawData: RawCohortData[],
  currentDate: Date = new Date(),
  options?: {
    isMatureVehicle?: boolean;
    segment?: VehicleSegment;
    regimeData?: MarketRegimeData;
    annualInflation?: number;
  }
): DepreciationEngineResultV3 {
  const fipePoints: FipePoint[] = rawData.map(d => ({
    price: d.price,
    year: d.year,
    month: parseInt(d.ref_date.split('-')[1]) || 12,
    ref_date: d.ref_date,
  }));

  const result = calculateDepreciationCurveV7(fipePoints, config.modelYear, currentDate, {
    isMatureVehicle: options?.isMatureVehicle,
    segment: options?.segment,
    regimeData: options?.regimeData,
    annualInflation: options?.annualInflation,
  });

  return convertToV3Result(result, currentDate);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ENGINE_VERSION,
  PANDEMIC_WEIGHTS,
  DEFAULT_SEGMENT_PRIORS,
  LONG_TERM_RETENTION,
  REGIME_PERSIST_YEARS,
  IPCA_EXPONENT,
  B_REGIME_THRESHOLD,
  DEFAULT_IPCA_ANNUAL,
  prepareDataPointsV7,
  calculateWLSRegression,
  findTwoPhaseBreakpoint,
  applyBayesianPrior,
  calculateCI80,
  calculateQualityMetrics,
  calculateRegimeIpcaAdjustment,
  getRegime2yr,
};

export type {
  WeightedCohortPoint,
  EngineV7Options,
};
