import React, { useEffect, useMemo, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Circle, Loader2 } from 'lucide-react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis, formatBRLCompact } from '@/components/charts/premiumChartTheme';
import type { ComparisonHistoryPoint } from '@/utils/buildFipeHistoryComparisonSeries';
import type { FipeStabilizationZone } from '@/utils/fipeProjectionWls';

export const FIPE_PROJECTION_YEARS_LS = 'fipe_projection_years';

/** IPCA médio ~últimos 3 anos (a.a.), alinhado à edge fipe-history-v2 até tabela dinâmica */
export const DEFAULT_FIPE_IPCA_3Y_AVG = 0.046;

export function readStoredFipeProjectionYears(): number {
  if (typeof window === 'undefined') return 5;
  const saved = localStorage.getItem(FIPE_PROJECTION_YEARS_LS);
  if (!saved) return 5;
  const n = Number(saved);
  return Number.isFinite(n) && n >= 1 && n <= 10 ? Math.floor(n) : 5;
}

interface FipeHistoryComparisonChartProps {
  historyA: ComparisonHistoryPoint[];
  historyB: ComparisonHistoryPoint[];
  loadingA: boolean;
  loadingB: boolean;
  nameA: string;
  nameB: string;
  hasHistoryA: boolean;
  hasHistoryB: boolean;
  /** Se true, inclui pontos isProjection (linha tracejada). */
  showProjection?: boolean;
  /** Se true, ajusta eixo X para modo híbrido (0 km com 1 ponto âncora). */
  hasZeroKmVehicle?: boolean;
  /** Controle opcional (ex.: toggle Mostrar projeção) para renderizar no header do card. */
  projectionControl?: React.ReactNode;
  /** Sincroniza horizonte (anos) com o pai para recompor a série de projeção. */
  onProjectionYearsChange?: (years: number) => void;
  /** Zona de estabilização FIPE (API fipe-history-v2) — Carro A */
  stabilizationZoneA?: FipeStabilizationZone | null;
  /** Zona de estabilização FIPE (API fipe-history-v2) — Carro B */
  stabilizationZoneB?: FipeStabilizationZone | null;
  /** Taxa IPCA média anualizada (ex.: resposta `ipca3yAvg` da API) */
  ipca3yAvg?: number;
}

interface PointWithX extends ComparisonHistoryPoint {
  x: number;
}

function normalizeForChart(
  seriesA: ComparisonHistoryPoint[],
  seriesB: ComparisonHistoryPoint[],
  hasZeroKm: boolean
): { dataA: PointWithX[]; dataB: PointWithX[] } {
  if (!hasZeroKm) {
    return {
      dataA: seriesA.map((p) => ({ ...p, x: p.date.getTime() })),
      dataB: seriesB.map((p) => ({ ...p, x: p.date.getTime() })),
    };
  }

  const historyA = seriesA.filter((d) => !d.isProjection);
  const historyB = seriesB.filter((d) => !d.isProjection);
  const maxHistLen = Math.max(historyA.length, historyB.length, 1);

  const indexedA = seriesA.map((d, i) => ({ ...d, x: i }));

  if (historyB.length <= 1) {
    const projB = seriesB.filter((d) => d.isProjection);
    const anchorB = historyB[0];
    const indexedB: PointWithX[] = [
      ...(anchorB ? [{ ...anchorB, x: maxHistLen - 1 }] : []),
      ...projB.map((d, i) => ({ ...d, x: maxHistLen + i })),
    ];
    return { dataA: indexedA, dataB: indexedB };
  }

  const indexedB = seriesB.map((d, i) => ({ ...d, x: i }));
  return { dataA: indexedA, dataB: indexedB };
}

type MergedRow = {
  x: number;
  label: string;
  histA?: number;
  projA?: number;
  projAUpper?: number;
  projALower?: number;
  bandStackBaseA?: number;
  bandSpanA?: number;
  histB?: number;
  projB?: number;
  projBUpper?: number;
  projBLower?: number;
  bandStackBaseB?: number;
  bandSpanB?: number;
  /** Valor nominal “corrigido” por IPCA (referência), série A */
  ipcaRefA?: number;
  /** Valor nominal “corrigido” por IPCA (referência), série B */
  ipcaRefB?: number;
};

function buildMergedDataset(dataA: PointWithX[], dataB: PointWithX[], hasZeroKm: boolean): MergedRow[] {
  const keySet = new Set<number>();
  for (const p of dataA) keySet.add(p.x);
  for (const p of dataB) keySet.add(p.x);
  const sortedKeys = Array.from(keySet).sort((a, b) => a - b);

  const byXA = new Map<number, PointWithX[]>();
  for (const p of dataA) {
    const list = byXA.get(p.x) ?? [];
    list.push(p);
    byXA.set(p.x, list);
  }
  const byXB = new Map<number, PointWithX[]>();
  for (const p of dataB) {
    const list = byXB.get(p.x) ?? [];
    list.push(p);
    byXB.set(p.x, list);
  }

  return sortedKeys.map((x) => {
    const ptsA = byXA.get(x) ?? [];
    const ptsB = byXB.get(x) ?? [];
    const projPtA = ptsA.find((p) => p.isProjection);
    const projPtB = ptsB.find((p) => p.isProjection);
    const histA = ptsA.find((p) => !p.isProjection)?.price;
    const projA = projPtA?.price;
    const projAUpper = projPtA?.upperBand;
    const projALower = projPtA?.lowerBand;
    const histB = ptsB.find((p) => !p.isProjection)?.price;
    const projB = projPtB?.price;
    const projBUpper = projPtB?.upperBand;
    const projBLower = projPtB?.lowerBand;
    const label =
      ptsA[0]?.monthLabel ?? ptsB[0]?.monthLabel ?? (hasZeroKm ? String(x) : '');
    let bandStackBaseA: number | undefined;
    let bandSpanA: number | undefined;
    if (
      projAUpper != null &&
      projALower != null &&
      projAUpper >= projALower
    ) {
      bandStackBaseA = projALower;
      bandSpanA = projAUpper - projALower;
    }
    let bandStackBaseB: number | undefined;
    let bandSpanB: number | undefined;
    if (
      projBUpper != null &&
      projBLower != null &&
      projBUpper >= projBLower
    ) {
      bandStackBaseB = projBLower;
      bandSpanB = projBUpper - projBLower;
    }
    return {
      x,
      label,
      histA,
      projA,
      projAUpper,
      projALower,
      bandStackBaseA,
      bandSpanA,
      histB,
      projB,
      projBUpper,
      projBLower,
      bandStackBaseB,
      bandSpanB,
    };
  });
}

function firstHistoricalPoint(series: PointWithX[]): PointWithX | undefined {
  const hist = series
    .filter((p) => !p.isProjection)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return hist[0];
}

/** Meses desde o primeiro ponto histórico (i=0 no primeiro mês). */
function monthIndexSinceLaunch(
  first: PointWithX,
  pt: PointWithX,
  hasZeroKm: boolean
): number {
  if (hasZeroKm) {
    return Math.max(0, Math.round(pt.x - first.x));
  }
  let months = (pt.date.getFullYear() - first.date.getFullYear()) * 12;
  months += pt.date.getMonth() - first.date.getMonth();
  return Math.max(0, months);
}

function enrichMergedWithIpcaRefs(
  rows: MergedRow[],
  dataA: PointWithX[],
  dataB: PointWithX[],
  hasZeroKm: boolean,
  ipca3yAvg: number
): MergedRow[] {
  const firstA = firstHistoricalPoint(dataA);
  const firstB = firstHistoricalPoint(dataB);
  const rM = ipca3yAvg / 12;
  return rows.map((row) => {
    let ipcaRefA: number | undefined;
    let ipcaRefB: number | undefined;
    if (firstA != null && row.histA != null) {
      const pt = dataA.find((p) => p.x === row.x && !p.isProjection);
      if (pt) {
        const i = monthIndexSinceLaunch(firstA, pt, hasZeroKm);
        ipcaRefA = firstA.price * Math.pow(1 + rM, i);
      }
    }
    if (firstB != null && row.histB != null) {
      const pt = dataB.find((p) => p.x === row.x && !p.isProjection);
      if (pt) {
        const i = monthIndexSinceLaunch(firstB, pt, hasZeroKm);
        ipcaRefB = firstB.price * Math.pow(1 + rM, i);
      }
    }
    return { ...row, ipcaRefA, ipcaRefB };
  });
}

function pointInStabilizationZone(
  x: number,
  zone: FipeStabilizationZone | null | undefined,
  maxHistX: number | undefined,
  hasZeroKm: boolean
): boolean {
  if (hasZeroKm || !zone?.active || maxHistX == null) return false;
  const t0 = Date.parse(zone.startDate);
  if (!Number.isFinite(t0)) return false;
  return x >= t0 && x <= maxHistX;
}

function ComparisonChartTooltip({
  active,
  payload,
  formatMoney,
  nameA,
  nameB,
  colorA,
  colorB,
  stabilizationZoneA,
  stabilizationZoneB,
  maxHistoricalX,
  hasZeroKmVehicle,
  showIpcaLine,
}: {
  active?: boolean;
  payload?: Array<{ payload: MergedRow; dataKey?: string }>;
  formatMoney: (n: number) => string;
  nameA: string;
  nameB: string;
  colorA: string;
  colorB: string;
  stabilizationZoneA?: FipeStabilizationZone | null;
  stabilizationZoneB?: FipeStabilizationZone | null;
  maxHistoricalX?: number;
  hasZeroKmVehicle: boolean;
  showIpcaLine: boolean;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const inA = pointInStabilizationZone(
    row.x,
    stabilizationZoneA,
    maxHistoricalX,
    hasZeroKmVehicle
  );
  const inB = pointInStabilizationZone(
    row.x,
    stabilizationZoneB,
    maxHistoricalX,
    hasZeroKmVehicle
  );
  const showStabBadge =
    (typeof row.histA === 'number' && inA) || (typeof row.histB === 'number' && inB);
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <p className="font-semibold text-foreground">{row.label}</p>
        {showStabBadge && (
          <span className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
            <span className="text-emerald-500">●</span> Zona de estabilização FIPE
          </span>
        )}
      </div>
      {typeof row.histA === 'number' && (
        <div className="text-foreground">
          <p>
            <span style={{ color: colorA }}>{nameA || 'Carro A'}:</span>{' '}
            <span className="font-medium">{formatMoney(row.histA)}</span>
            <span className="text-muted-foreground"> (realizado)</span>
          </p>
          {showIpcaLine && row.ipcaRefA != null && (
            <div className="mt-1 space-y-0.5 pl-0 text-[11px] text-muted-foreground">
              <p>Valor corrigido IPCA: {formatMoney(row.ipcaRefA)}</p>
              <p>
                Perda real:{' '}
                <span className="font-medium text-foreground">
                  {((row.histA / row.ipcaRefA - 1) * 100).toFixed(1)}%
                </span>
              </p>
            </div>
          )}
        </div>
      )}
      {typeof row.histB === 'number' && (
        <div className="text-foreground">
          <p>
            <span style={{ color: colorB }}>{nameB || 'Carro B'}:</span>{' '}
            <span className="font-medium">{formatMoney(row.histB)}</span>
            <span className="text-muted-foreground"> (realizado)</span>
          </p>
          {showIpcaLine && row.ipcaRefB != null && (
            <div className="mt-1 space-y-0.5 pl-0 text-[11px] text-muted-foreground">
              <p>Valor corrigido IPCA: {formatMoney(row.ipcaRefB)}</p>
              <p>
                Perda real:{' '}
                <span className="font-medium text-foreground">
                  {((row.histB / row.ipcaRefB - 1) * 100).toFixed(1)}%
                </span>
              </p>
            </div>
          )}
        </div>
      )}
      {typeof row.projA === 'number' && (
        <p className="mt-1 text-foreground">
          <span style={{ color: colorA }}>{nameA || 'Carro A'} (proj.):</span>{' '}
          <span className="font-medium">{formatMoney(row.projA)}</span>
        </p>
      )}
      {typeof row.projA === 'number' &&
        row.projALower != null &&
        row.projAUpper != null &&
        row.projAUpper !== row.projALower && (
          <p className="pl-2 text-[11px] text-muted-foreground">
            Faixa ±1σ: {formatMoney(row.projALower)} – {formatMoney(row.projAUpper)}
          </p>
        )}
      {typeof row.projB === 'number' && (
        <p className="mt-1 text-foreground">
          <span style={{ color: colorB }}>{nameB || 'Carro B'} (proj.):</span>{' '}
          <span className="font-medium">{formatMoney(row.projB)}</span>
        </p>
      )}
      {typeof row.projB === 'number' &&
        row.projBLower != null &&
        row.projBUpper != null &&
        row.projBUpper !== row.projBLower && (
          <p className="pl-2 text-[11px] text-muted-foreground">
            Faixa ±1σ: {formatMoney(row.projBLower)} – {formatMoney(row.projBUpper)}
          </p>
        )}
    </div>
  );
}

// Simplify X axis labels: show only Jan of each year as 'YY (for date strings)
function formatTickLabel(value: string | number, hasZeroKm: boolean): string {
  if (hasZeroKm && typeof value === 'number') return '';
  const s = String(value);
  const parts = s.split('/');
  if (parts.length === 2 && parts[0].toLowerCase() === 'jan') {
    return `'${parts[1]}`;
  }
  if (s === '0 km') return '0 km';
  return '';
}

export const FipeHistoryComparisonChart: React.FC<FipeHistoryComparisonChartProps> = ({
  historyA,
  historyB,
  loadingA,
  loadingB,
  nameA,
  nameB,
  hasHistoryA,
  hasHistoryB,
  showProjection = false,
  hasZeroKmVehicle = false,
  projectionControl,
  onProjectionYearsChange,
  stabilizationZoneA,
  stabilizationZoneB,
  ipca3yAvg = DEFAULT_FIPE_IPCA_3Y_AVG,
}) => {
  const isMobile = useIsMobile();
  const isLoading = loadingA || loadingB;

  const [projectionYears, setProjectionYears] = useState(readStoredFipeProjectionYears);
  const [showIpcaLine, setShowIpcaLine] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(FIPE_PROJECTION_YEARS_LS, String(projectionYears));
    } catch {
      /* ignore */
    }
  }, [projectionYears]);

  useEffect(() => {
    onProjectionYearsChange?.(projectionYears);
  }, [projectionYears, onProjectionYearsChange]);

  const { dataA, dataB } = useMemo(
    () => normalizeForChart(historyA, historyB, hasZeroKmVehicle),
    [historyA, historyB, hasZeroKmVehicle]
  );

  const mergedDataRaw = useMemo(
    () => buildMergedDataset(dataA, dataB, hasZeroKmVehicle),
    [dataA, dataB, hasZeroKmVehicle]
  );

  const mergedData = useMemo(() => {
    if (!showProjection) return mergedDataRaw;
    const out = mergedDataRaw.map((d) => ({ ...d }));

    const firstProjA = out.find((d) => typeof d.projA === 'number');
    if (firstProjA) {
      const idxA = out.findIndex((d) => d.x === firstProjA.x);
      if (idxA > 0 && typeof out[idxA - 1].histA === 'number' && out[idxA - 1].projA == null) {
        const h = out[idxA - 1].histA!;
        out[idxA - 1].projA = h;
        if (firstProjA.projAUpper != null && firstProjA.projALower != null) {
          out[idxA - 1].projAUpper = h;
          out[idxA - 1].projALower = h;
          out[idxA - 1].bandStackBaseA = h;
          out[idxA - 1].bandSpanA = 0;
        }
      }
    }

    const firstProjB = out.find((d) => typeof d.projB === 'number');
    if (firstProjB) {
      const idxB = out.findIndex((d) => d.x === firstProjB.x);
      if (idxB > 0 && typeof out[idxB - 1].histB === 'number' && out[idxB - 1].projB == null) {
        const h = out[idxB - 1].histB!;
        out[idxB - 1].projB = h;
        if (firstProjB.projBUpper != null && firstProjB.projBLower != null) {
          out[idxB - 1].projBUpper = h;
          out[idxB - 1].projBLower = h;
          out[idxB - 1].bandStackBaseB = h;
          out[idxB - 1].bandSpanB = 0;
        }
      }
    }

    return out;
  }, [mergedDataRaw, showProjection]);

  const chartData = useMemo(
    () => enrichMergedWithIpcaRefs(mergedData, dataA, dataB, hasZeroKmVehicle, ipca3yAvg),
    [mergedData, dataA, dataB, hasZeroKmVehicle, ipca3yAvg]
  );

  const maxHistoricalX = useMemo(() => {
    let m = -Infinity;
    for (const d of mergedData) {
      if (typeof d.histA === 'number' || typeof d.histB === 'number') {
        m = Math.max(m, d.x);
      }
    }
    return Number.isFinite(m) ? m : undefined;
  }, [mergedData]);

  const yDomain = useMemo(() => {
    const values = chartData.flatMap((d) => {
      const nums = [
        d.histA,
        d.projA,
        d.projAUpper,
        d.projALower,
        d.histB,
        d.projB,
        d.projBUpper,
        d.projBLower,
      ];
      if (showIpcaLine) {
        nums.push(d.ipcaRefA, d.ipcaRefB);
      }
      return nums.filter((v): v is number => typeof v === 'number');
    });
    if (values.length === 0) return undefined;
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const min = Math.min(dataMin - 5000, dataMax * 0.8);
    const max = dataMax + 5000;
    return [min, max] as [number, number];
  }, [chartData, showIpcaLine]);

  const hasBandA = useMemo(
    () => showProjection && mergedData.some((d) => d.bandSpanA != null && d.bandSpanA > 0),
    [mergedData, showProjection]
  );
  const hasBandB = useMemo(
    () => showProjection && mergedData.some((d) => d.bandSpanB != null && d.bandSpanB > 0),
    [mergedData, showProjection]
  );

  const projection5ySummary = useMemo(() => {
    if (!showProjection)
      return {
        a: null as null | {
          c: number;
          lo: number;
          hi: number;
          pctC: number | null;
          pctLo: number | null;
          pctHi: number | null;
        },
        b: null as null | {
          c: number;
          lo: number;
          hi: number;
          pctC: number | null;
          pctLo: number | null;
          pctHi: number | null;
        },
      };

    const idxFirstA = mergedData.findIndex((d) => typeof d.projA === 'number');
    const anchorA = idxFirstA > 0 ? mergedData[idxFirstA - 1]?.histA : undefined;
    const idxFirstB = mergedData.findIndex((d) => typeof d.projB === 'number');
    const anchorB = idxFirstB > 0 ? mergedData[idxFirstB - 1]?.histB : undefined;

    const lastA = [...mergedData].reverse().find((d) => typeof d.projA === 'number');
    const lastB = [...mergedData].reverse().find((d) => typeof d.projB === 'number');

    const pct = (anchor: number | undefined, v: number) =>
      anchor != null && anchor > 0 ? ((v / anchor - 1) * 100) : null;

    const a =
      lastA && typeof lastA.projA === 'number'
        ? {
            c: lastA.projA,
            lo: lastA.projALower ?? lastA.projA,
            hi: lastA.projAUpper ?? lastA.projA,
            pctC: pct(anchorA, lastA.projA),
            pctLo: pct(anchorA, lastA.projALower ?? lastA.projA),
            pctHi: pct(anchorA, lastA.projAUpper ?? lastA.projA),
          }
        : null;
    const b =
      lastB && typeof lastB.projB === 'number'
        ? {
            c: lastB.projB,
            lo: lastB.projBLower ?? lastB.projB,
            hi: lastB.projBUpper ?? lastB.projB,
            pctC: pct(anchorB, lastB.projB),
            pctLo: pct(anchorB, lastB.projBLower ?? lastB.projB),
            pctHi: pct(anchorB, lastB.projBUpper ?? lastB.projB),
          }
        : null;
    return { a, b };
  }, [mergedData, showProjection]);

  const tickFormatter = (value: number) => {
    if (hasZeroKmVehicle) return '';
    const d = new Date(value);
    const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const year = d.getFullYear().toString().slice(-2);
    return `${month}/${year}`;
  };

  const formatMoney = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatMoneyShort = (value: number) => {
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return formatMoney(value);
  };

  const colorA = 'hsl(217, 70%, 55%)';
  const colorB = 'hsl(38, 92%, 50%)';
  const ipcaLegendPct = (ipca3yAvg * 100).toFixed(1).replace('.', ',');

  const showHorizonCard =
    showProjection && (projection5ySummary.a != null || projection5ySummary.b != null);

  const stabAreaA = useMemo(() => {
    if (hasZeroKmVehicle || !stabilizationZoneA?.active || maxHistoricalX == null) return null;
    const x1 = Date.parse(stabilizationZoneA.startDate);
    if (!Number.isFinite(x1) || x1 >= maxHistoricalX) return null;
    return { x1, x2: maxHistoricalX };
  }, [hasZeroKmVehicle, stabilizationZoneA, maxHistoricalX]);

  const stabAreaB = useMemo(() => {
    if (hasZeroKmVehicle || !stabilizationZoneB?.active || maxHistoricalX == null) return null;
    const x1 = Date.parse(stabilizationZoneB.startDate);
    if (!Number.isFinite(x1) || x1 >= maxHistoricalX) return null;
    return { x1, x2: maxHistoricalX };
  }, [hasZeroKmVehicle, stabilizationZoneB, maxHistoricalX]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando histórico...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasHistoryA && !hasHistoryB) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-xs text-muted-foreground">
            Histórico FIPE indisponível para os veículos selecionados
          </p>
        </CardContent>
      </Card>
    );
  }

  if (mergedData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Histórico FIPE
        </CardTitle>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          {projectionControl}
          <div className="flex items-center gap-2 text-sm">
            <Switch
              id="fipe-chart-show-ipca"
              checked={showIpcaLine}
              onCheckedChange={setShowIpcaLine}
            />
            <Label htmlFor="fipe-chart-show-ipca" className="cursor-pointer font-normal">
              Mostrar linha IPCA
            </Label>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full bg-blue-500" />
            <span className="truncate max-w-[180px]">{nameA || 'Carro A'}</span>
            {stabilizationZoneA?.active && (
              <Badge variant="outline" className="h-5 gap-0.5 px-1.5 text-[9px] font-normal text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500" aria-hidden />
                Estabilizado
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full bg-amber-500" />
            <span className="truncate max-w-[180px]">{nameB || 'Carro B'}</span>
            {stabilizationZoneB?.active && (
              <Badge variant="outline" className="h-5 gap-0.5 px-1.5 text-[9px] font-normal text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500" aria-hidden />
                Estabilizado
              </Badge>
            )}
          </div>
          {showProjection && (hasBandA || hasBandB) && (
            <div className="flex items-center gap-1.5">
              {hasBandA && (
                <div
                  className="h-2.5 w-4 rounded-sm border border-foreground/10"
                  style={{ backgroundColor: colorA, opacity: 0.2 }}
                />
              )}
              {hasBandB && (
                <div
                  className="h-2.5 w-4 rounded-sm border border-foreground/10"
                  style={{ backgroundColor: colorB, opacity: 0.2 }}
                />
              )}
              <span className="text-[11px]">Banda ±1σ</span>
            </div>
          )}
          {showIpcaLine && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-6 border-t border-dashed border-muted-foreground/70" />
              <span className="text-[11px] text-muted-foreground">
                --- Corrigido IPCA (~{ipcaLegendPct}% a.a.)
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showHorizonCard && (
          <div className="mb-3 rounded-lg border border-muted-foreground/20 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">
              Projeção em {projectionYears} ano{projectionYears > 1 ? 's' : ''}
            </p>
            <div className="space-y-1">
              {projection5ySummary.a != null && (
                <p>
                  <span style={{ color: colorA }}>{nameA || 'Carro A'}:</span>{' '}
                  {projection5ySummary.a.hi !== projection5ySummary.a.lo ? (
                    <>
                      {formatMoneyShort(projection5ySummary.a.lo)} – {formatMoneyShort(projection5ySummary.a.hi)}{' '}
                      <span className="text-muted-foreground">
                        (central: {formatMoneyShort(projection5ySummary.a.c)}
                        {projection5ySummary.a.pctC != null && (
                          <span className="text-destructive">
                            {' '}
                            {projection5ySummary.a.pctC >= 0 ? '+' : ''}
                            {projection5ySummary.a.pctC.toFixed(1)}%
                          </span>
                        )}
                        , ±1σ)
                      </span>
                    </>
                  ) : (
                    <span>
                      {formatMoney(projection5ySummary.a.c)}
                      {projection5ySummary.a.pctC != null && (
                        <span className="text-destructive">
                          {' '}
                          ({projection5ySummary.a.pctC >= 0 ? '+' : ''}
                          {projection5ySummary.a.pctC.toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  )}
                </p>
              )}
              {projection5ySummary.b != null && (
                <p>
                  <span style={{ color: colorB }}>{nameB || 'Carro B'}:</span>{' '}
                  {projection5ySummary.b.hi !== projection5ySummary.b.lo ? (
                    <>
                      {formatMoneyShort(projection5ySummary.b.lo)} – {formatMoneyShort(projection5ySummary.b.hi)}{' '}
                      <span className="text-muted-foreground">
                        (central: {formatMoneyShort(projection5ySummary.b.c)}
                        {projection5ySummary.b.pctC != null && (
                          <span className="text-destructive">
                            {' '}
                            {projection5ySummary.b.pctC >= 0 ? '+' : ''}
                            {projection5ySummary.b.pctC.toFixed(1)}%
                          </span>
                        )}
                        , ±1σ)
                      </span>
                    </>
                  ) : (
                    <span>
                      {formatMoney(projection5ySummary.b.c)}
                      {projection5ySummary.b.pctC != null && (
                        <span className="text-destructive">
                          {' '}
                          ({projection5ySummary.b.pctC >= 0 ? '+' : ''}
                          {projection5ySummary.b.pctC.toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        )}
        <div className="h-[280px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 15, left: 15, bottom: 20 }}>
              <CartesianGrid {...premiumGrid} />
              {stabAreaB && (
                <ReferenceArea
                  x1={stabAreaB.x1}
                  x2={stabAreaB.x2}
                  fill={colorB}
                  fillOpacity={0.07}
                  strokeOpacity={0}
                />
              )}
              {stabAreaA && (
                <ReferenceArea
                  x1={stabAreaA.x1}
                  x2={stabAreaA.x2}
                  fill={colorA}
                  fillOpacity={0.09}
                  strokeOpacity={0}
                />
              )}
              <XAxis
                dataKey="x"
                type="number"
                scale="linear"
                {...premiumXAxis}
                tickFormatter={(v) => tickFormatter(Number(v))}
                domain={['dataMin', 'dataMax']}
                tickCount={isMobile ? 5 : 8}
                interval={0}
                minTickGap={22}
                hide={hasZeroKmVehicle}
              />
              <YAxis
                hide={isMobile}
                {...premiumYAxis}
                tickFormatter={formatBRLCompact}
                domain={yDomain}
                width={52}
                tick={{ fontSize: 11, fill: 'hsl(var(--chart-axis))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={(tooltipProps) => (
                  <ComparisonChartTooltip
                    active={tooltipProps.active}
                    payload={tooltipProps.payload as Array<{ payload: MergedRow; dataKey?: string }> | undefined}
                    formatMoney={formatMoney}
                    nameA={nameA}
                    nameB={nameB}
                    colorA={colorA}
                    colorB={colorB}
                    stabilizationZoneA={stabilizationZoneA}
                    stabilizationZoneB={stabilizationZoneB}
                    maxHistoricalX={maxHistoricalX}
                    hasZeroKmVehicle={hasZeroKmVehicle}
                    showIpcaLine={showIpcaLine}
                  />
                )}
              />
              {showProjection && hasBandB && (
                <>
                  <Area
                    type="monotone"
                    dataKey="bandStackBaseB"
                    stackId="bandB"
                    stroke="none"
                    fill="rgba(0,0,0,0)"
                    connectNulls
                    isAnimationActive={false}
                    legendType="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="bandSpanB"
                    stackId="bandB"
                    stroke="none"
                    fill={colorB}
                    fillOpacity={0.2}
                    connectNulls
                    isAnimationActive={false}
                    legendType="none"
                  />
                </>
              )}
              {showProjection && hasBandA && (
                <>
                  <Area
                    type="monotone"
                    dataKey="bandStackBaseA"
                    stackId="bandA"
                    stroke="none"
                    fill="rgba(0,0,0,0)"
                    connectNulls
                    isAnimationActive={false}
                    legendType="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="bandSpanA"
                    stackId="bandA"
                    stroke="none"
                    fill={colorA}
                    fillOpacity={0.2}
                    connectNulls
                    isAnimationActive={false}
                    legendType="none"
                  />
                </>
              )}
              {showIpcaLine && hasHistoryA && (
                <Line
                  type="monotone"
                  dataKey="ipcaRefA"
                  name="IPCA ref A"
                  stroke="hsl(var(--muted-foreground) / 0.85)"
                  strokeWidth={1.2}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                  legendType="none"
                />
              )}
              {showIpcaLine && hasHistoryB && (
                <Line
                  type="monotone"
                  dataKey="ipcaRefB"
                  name="IPCA ref B"
                  stroke="hsl(var(--muted-foreground) / 0.85)"
                  strokeWidth={1.2}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                  legendType="none"
                />
              )}
              {hasHistoryA && (
                <Line
                  type="monotone"
                  dataKey="histA"
                  name={nameA || 'Carro A'}
                  stroke={colorA}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  connectNulls
                />
              )}
              {showProjection && (
                <Line
                  type="monotone"
                  dataKey="projA"
                  name={`${nameA || 'Carro A'} (proj.)`}
                  stroke={colorA}
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  opacity={0.7}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  connectNulls
                />
              )}
              {hasHistoryB && (
                <Line
                  type="monotone"
                  dataKey="histB"
                  name={nameB || 'Carro B'}
                  stroke={colorB}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  connectNulls
                />
              )}
              {showProjection && (
                <Line
                  type="monotone"
                  dataKey="projB"
                  name={`${nameB || 'Carro B'} (proj.)`}
                  stroke={colorB}
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  opacity={0.7}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-foreground/60 rounded-full" />
            Dados realizados
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t border-dashed border-foreground/60" />
            Dados projetados
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
