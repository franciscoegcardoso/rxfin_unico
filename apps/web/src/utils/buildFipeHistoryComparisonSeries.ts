/**
 * Monta série histórico + projeção para o gráfico comparativo Carro A/B (Histórico FIPE).
 * Alinhado à lógica de TimeSeriesDepreciationChart (motor V2 + regressão legada).
 */
import type { ParsedHistoryPoint } from '@/hooks/useFipeFullHistory';
import type { DepreciationEngineResult } from '@/utils/depreciationCoreEngine';
import type { FipeHistoryProjectionMeta } from '@/utils/fipeProjectionWls';
import {
  calculateProjectionFromHistory,
  type CohortAnalysisData,
  type HistoricalPricePoint,
} from '@/utils/depreciationRegression';

export type ComparisonHistoryPoint = ParsedHistoryPoint & {
  isProjection?: boolean;
  /** Banda ±1σ (projeção): limites por composição mensal com r ± stdDev mensal */
  upperBand?: number;
  lowerBand?: number;
};

export interface BuildVehicleFipeComparisonSeriesParams {
  priceHistory: ParsedHistoryPoint[];
  currentPrice: number;
  isZeroKm: boolean;
  modelYear: number;
  engineV2Result: DepreciationEngineResult | null;
  cohortData: CohortAnalysisData | null;
  /** WLS (histórico recente): habilita projeção central + bandas ±1σ quando presente */
  historyProjectionMeta?: FipeHistoryProjectionMeta | null;
  /** Horizonte da projeção em anos (1–10). Padrão: 5. */
  projectionYears?: number;
}

function clampProjectionYears(n: number): number {
  if (!Number.isFinite(n)) return 5;
  return Math.min(10, Math.max(1, Math.floor(n)));
}

function projectFromWlsWithBands(
  filteredHistory: ParsedHistoryPoint[],
  meta: FipeHistoryProjectionMeta,
  projectionYears: number
): ComparisonHistoryPoint[] {
  const lastHistoricalPrice = filteredHistory[filteredHistory.length - 1].price;
  const lastHistoricalDate = filteredHistory[filteredHistory.length - 1].date;
  const lastHistoricalYear = lastHistoricalDate.getUTCFullYear();
  const lastHistoricalMonth = lastHistoricalDate.getUTCMonth();
  const projectionStartsThisYear = lastHistoricalMonth < 11;
  const r = meta.projectionRate;
  const sd = meta.stdDevMonthly;

  const out: ComparisonHistoryPoint[] = [];
  for (let year = 1; year <= projectionYears; year++) {
    const yearOffset = projectionStartsThisYear ? year - 1 : year;
    const targetYear = lastHistoricalYear + yearOffset;
    const i = 12 * year;
    const base = Math.max(1e-9, 1 + r);
    const baseLow = Math.max(1e-9, 1 + r - sd);
    const baseHigh = Math.max(1e-9, 1 + r + sd);
    out.push({
      date: new Date(Date.UTC(targetYear, 11, 1)),
      monthLabel: `Dez/${targetYear}`,
      price: lastHistoricalPrice * Math.pow(base, i),
      upperBand: lastHistoricalPrice * Math.pow(baseHigh, i),
      lowerBand: lastHistoricalPrice * Math.pow(baseLow, i),
      reference: '',
      isProjection: true,
    });
  }
  return out;
}

function projectFromEngineV2(
  engineV2Result: DepreciationEngineResult,
  filteredHistory: ParsedHistoryPoint[],
  modelYear: number,
  isZeroKm: boolean,
  projectionYears: number
): ComparisonHistoryPoint[] {
  const launchYear = isZeroKm ? modelYear : modelYear - 1;
  const currentYear = new Date().getFullYear();
  const currentAge = Math.max(0, currentYear - launchYear - 1);

  let lastHistoricalYear: number;
  let projectionStartsThisYear: boolean;

  if (isZeroKm) {
    lastHistoricalYear = currentYear;
    projectionStartsThisYear = false;
  } else {
    const lastHistoricalDate = filteredHistory[filteredHistory.length - 1].date;
    lastHistoricalYear = lastHistoricalDate.getUTCFullYear();
    const lastHistoricalMonth = lastHistoricalDate.getUTCMonth();
    projectionStartsThisYear = lastHistoricalMonth < 11;
  }

  const out: ComparisonHistoryPoint[] = [];
  for (let year = 1; year <= projectionYears; year++) {
    const targetAge = currentAge + year;
    const curvePoint = engineV2Result.curve.find((p) => p.age === targetAge);
    const yearOffset = projectionStartsThisYear ? year - 1 : year;
    const targetYear = lastHistoricalYear + yearOffset;
    if (curvePoint) {
      out.push({
        date: new Date(Date.UTC(targetYear, 11, 1)),
        monthLabel: `Dez/${targetYear}`,
        price: curvePoint.price,
        reference: '',
        isProjection: true,
      });
    }
  }
  return out;
}

/**
 * Série completa (histórico + projeção marcada com isProjection) para um veículo.
 */
export function buildVehicleFipeComparisonSeries(
  p: BuildVehicleFipeComparisonSeriesParams
): ComparisonHistoryPoint[] {
  const {
    currentPrice,
    isZeroKm,
    modelYear,
    engineV2Result,
    cohortData,
    historyProjectionMeta,
  } = p;
  const priceHistory = p.priceHistory;
  const projectionYears = clampProjectionYears(p.projectionYears ?? 5);

  if (currentPrice <= 0) return [];

  if (isZeroKm) {
    const anchor: ComparisonHistoryPoint = {
      date: new Date(),
      monthLabel: '0 km',
      price: currentPrice,
      reference: 'anchor',
      isLaunchPrice: true,
      isProjection: false,
    };
    if (!engineV2Result?.curve?.length) {
      return [anchor];
    }
    const proj = projectFromEngineV2(engineV2Result, [anchor], modelYear, true, projectionYears);
    return [anchor, ...proj];
  }

  const filteredHistory = priceHistory
    .filter((pt) => pt.price > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (filteredHistory.length === 0) return [];

  const historical: ComparisonHistoryPoint[] = filteredHistory.map((pt) => ({
    ...pt,
    isProjection: false,
  }));

  let projectionPoints: ComparisonHistoryPoint[] = [];

  if (historyProjectionMeta) {
    projectionPoints = projectFromWlsWithBands(
      filteredHistory,
      historyProjectionMeta,
      projectionYears
    );
  } else if (engineV2Result && engineV2Result.curve.length > 0) {
    projectionPoints = projectFromEngineV2(
      engineV2Result,
      filteredHistory,
      modelYear,
      false,
      projectionYears
    );
  } else {
    const historyForProjection: HistoricalPricePoint[] = filteredHistory.map((pt) => ({
      date: pt.date,
      price: pt.price,
      monthLabel: pt.monthLabel,
      isLaunchPrice: pt.isLaunchPrice,
    }));
    const projection = calculateProjectionFromHistory(
      historyForProjection,
      projectionYears,
      cohortData
    );
    projectionPoints = projection.projectedPoints.map((pt) => ({
      date: pt.date,
      monthLabel: pt.monthLabel,
      price: pt.price,
      reference: '',
      isProjection: true,
    }));
  }

  return [...historical, ...projectionPoints];
}
