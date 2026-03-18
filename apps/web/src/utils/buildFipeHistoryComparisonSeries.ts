/**
 * Monta série histórico + projeção para o gráfico comparativo Carro A/B (Histórico FIPE).
 * Alinhado à lógica de TimeSeriesDepreciationChart (motor V2 + regressão legada).
 */
import type { ParsedHistoryPoint } from '@/hooks/useFipeFullHistory';
import type { DepreciationEngineResult } from '@/utils/depreciationCoreEngine';
import {
  calculateProjectionFromHistory,
  type CohortAnalysisData,
  type HistoricalPricePoint,
} from '@/utils/depreciationRegression';

export type ComparisonHistoryPoint = ParsedHistoryPoint & { isProjection?: boolean };

export interface BuildVehicleFipeComparisonSeriesParams {
  priceHistory: ParsedHistoryPoint[];
  currentPrice: number;
  isZeroKm: boolean;
  modelYear: number;
  engineV2Result: DepreciationEngineResult | null;
  cohortData: CohortAnalysisData | null;
}

function projectFromEngineV2(
  engineV2Result: DepreciationEngineResult,
  filteredHistory: ParsedHistoryPoint[],
  modelYear: number,
  isZeroKm: boolean
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
  for (let year = 1; year <= 5; year++) {
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
  const { currentPrice, isZeroKm, modelYear, engineV2Result, cohortData } = p;
  const priceHistory = p.priceHistory;

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
    const proj = projectFromEngineV2(engineV2Result, [anchor], modelYear, true);
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

  if (engineV2Result && engineV2Result.curve.length > 0) {
    projectionPoints = projectFromEngineV2(engineV2Result, filteredHistory, modelYear, false);
  } else {
    const historyForProjection: HistoricalPricePoint[] = filteredHistory.map((pt) => ({
      date: pt.date,
      price: pt.price,
      monthLabel: pt.monthLabel,
      isLaunchPrice: pt.isLaunchPrice,
    }));
    const projection = calculateProjectionFromHistory(historyForProjection, 5, cohortData);
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
