/**
 * Projeção FIPE — regressão log-linear com WLS nos últimos N meses.
 * Alinhado à metodologia da API fipe-history-v2 (λ=0.94, janela 18 meses).
 */

export const FIPE_WLS_LAMBDA = 0.94;
export const FIPE_WLS_MONTHS_WINDOW = 18;
export const FIPE_WLS_MIN_POINTS = 6;

/** Zona de estabilização FIPE (API fipe-history-v2 e consumo no front) */
export type FipeStabilizationZone = {
  active: boolean;
  startDate: string;
  floorPrice: number;
};

export type FipeHistoryProjectionMeta = {
  /** Taxa composta mensal (ex.: -0.002 ≈ -0,2% a.m.) */
  projectionRate: number;
  /** Taxa composta anual equivalente: (1 + projectionRate)^12 - 1 */
  projectionRateAnnual: number;
  /** Desvio padrão ponderado dos resíduos em log-preço (por passo mensal) */
  stdDevMonthly: number;
  /** Heurística simples: |taxa anual| < 3% a.a. */
  stabilizationZone: boolean;
  /** Quando a API expõe detecção de oscilação mínima (ex.: var. média abaixo de 0,5%/mês por 6+ meses) */
  stabilizationZoneDetail?: FipeStabilizationZone | null;
};

export function computeWlsProjectionFromHistory(
  points: Array<{ date: Date; price: number }>
): FipeHistoryProjectionMeta | null {
  const sorted = [...points]
    .filter((p) => p.price > 0 && !Number.isNaN(p.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (sorted.length < FIPE_WLS_MIN_POINTS) return null;

  const slice = sorted.slice(-FIPE_WLS_MONTHS_WINDOW);
  const n = slice.length;
  const lnP = slice.map((p) => Math.log(p.price));

  let sw = 0;
  let swx = 0;
  let swy = 0;
  let swxx = 0;
  let swxy = 0;

  for (let i = 0; i < n; i++) {
    const w = Math.pow(FIPE_WLS_LAMBDA, n - 1 - i);
    const x = i;
    const y = lnP[i];
    sw += w;
    swx += w * x;
    swy += w * y;
    swxx += w * x * x;
    swxy += w * x * y;
  }

  const den = sw * swxx - swx * swx;
  if (Math.abs(den) < 1e-14) return null;

  const b = (sw * swxy - swx * swy) / den;
  const a = (swy - b * swx) / sw;
  const monthlyMultiplier = Math.exp(b);
  const projectionRate = monthlyMultiplier - 1;
  const projectionRateAnnual = Math.pow(monthlyMultiplier, 12) - 1;

  let sumWRes2 = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.pow(FIPE_WLS_LAMBDA, n - 1 - i);
    const pred = a + b * i;
    const res = lnP[i] - pred;
    sumWRes2 += w * res * res;
  }
  const stdDevMonthly = Math.sqrt(sumWRes2 / sw);
  const stabilizationZone = Math.abs(projectionRateAnnual) < 0.03;

  return {
    projectionRate,
    projectionRateAnnual,
    stdDevMonthly,
    stabilizationZone,
  };
}
