import React, { useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis, premiumTooltipStyle, formatBRLCompact } from '@/components/charts/premiumChartTheme';
import type { ComparisonHistoryPoint } from '@/utils/buildFipeHistoryComparisonSeries';

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

function buildMergedDataset(
  dataA: PointWithX[],
  dataB: PointWithX[],
  hasZeroKm: boolean
): Array<{ x: number; label: string; histA?: number; projA?: number; histB?: number; projB?: number }> {
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
    const histA = ptsA.find((p) => !p.isProjection)?.price;
    const projA = ptsA.find((p) => p.isProjection)?.price;
    const histB = ptsB.find((p) => !p.isProjection)?.price;
    const projB = ptsB.find((p) => p.isProjection)?.price;
    const label =
      ptsA[0]?.monthLabel ?? ptsB[0]?.monthLabel ?? (hasZeroKm ? String(x) : '');
    return { x, label, histA, projA, histB, projB };
  });
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
}) => {
  const isMobile = useIsMobile();
  const isLoading = loadingA || loadingB;

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
        out[idxA - 1].projA = out[idxA - 1].histA;
      }
    }

    const firstProjB = out.find((d) => typeof d.projB === 'number');
    if (firstProjB) {
      const idxB = out.findIndex((d) => d.x === firstProjB.x);
      if (idxB > 0 && typeof out[idxB - 1].histB === 'number' && out[idxB - 1].projB == null) {
        out[idxB - 1].projB = out[idxB - 1].histB;
      }
    }

    return out;
  }, [mergedDataRaw, showProjection]);

  const yDomain = useMemo(() => {
    const values = mergedData.flatMap((d) =>
      [d.histA, d.projA, d.histB, d.projB].filter(
        (v): v is number => typeof v === 'number'
      )
    );
    if (values.length === 0) return undefined;
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const min = Math.min(dataMin - 5000, dataMax * 0.8);
    const max = dataMax + 5000;
    return [min, max] as [number, number];
  }, [mergedData]);

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

  const colorA = 'hsl(217, 70%, 55%)';
  const colorB = 'hsl(38, 92%, 50%)';

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
        {projectionControl ? <div className="pt-1">{projectionControl}</div> : null}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full bg-blue-500" />
            <span className="truncate max-w-[180px]">{nameA || 'Carro A'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full bg-amber-500" />
            <span className="truncate max-w-[180px]">{nameB || 'Carro B'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={mergedData}
              margin={{ top: 5, right: 15, left: 15, bottom: 20 }}
            >
              <CartesianGrid {...premiumGrid} />
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
                contentStyle={premiumTooltipStyle}
                labelFormatter={(label, payload) =>
                  (payload?.[0]?.payload as { label?: string } | undefined)?.label ?? String(label)
                }
                formatter={(value: number, name: string) => [
                  formatMoney(value),
                  name,
                ]}
              />
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
            </LineChart>
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
