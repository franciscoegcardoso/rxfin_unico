import type { Benchmarks, PortfolioPerformance } from '@/hooks/usePortfolioPerformance';

export type ViewMode = 'patrimonio' | 'rentabilidade';
export type BenchmarkKey = 'CDI' | 'IPCA' | 'IBOVESPA';

export interface ChartPoint {
  date: string;
  carteira: number;
  benchmark: number;
}

function getBenchmarkValue(benchmarks: Benchmarks, benchmark: BenchmarkKey): number {
  if (benchmark === 'CDI') return benchmarks.cdi.desde_inicio;
  if (benchmark === 'IPCA') return benchmarks.ipca.desde_inicio;
  return benchmarks.ibovespa.desde_inicio;
}

export function buildChartSeries(
  data: PortfolioPerformance,
  viewMode: ViewMode,
  benchmark: BenchmarkKey
): ChartPoint[] {
  const snapshots = data.snapshot_history ?? [];
  if (snapshots.length === 0) return [];

  const basePatrimonio = snapshots[0]?.total_brl ?? 0;
  const benchmarkTotalPct = getBenchmarkValue(data.benchmarks, benchmark);
  const denom = Math.max(snapshots.length - 1, 1);

  return snapshots.map((snap, idx) => {
    const carteiraPct = basePatrimonio > 0 ? ((snap.total_brl / basePatrimonio) - 1) * 100 : 0;
    const progress = idx / denom;
    const benchmarkPctAtPoint = benchmarkTotalPct * progress;
    return {
      date: snap.date,
      carteira: viewMode === 'rentabilidade' ? Number(carteiraPct.toFixed(2)) : snap.total_brl,
      benchmark:
        viewMode === 'rentabilidade'
          ? Number(benchmarkPctAtPoint.toFixed(2))
          : basePatrimonio * (1 + benchmarkPctAtPoint / 100),
    };
  });
}

export function calcPctCDI(rentPct: number, cdiPct: number): string {
  if (!Number.isFinite(cdiPct) || cdiPct === 0) return '—';
  return ((rentPct / cdiPct) * 100).toFixed(2).replace('.', ',');
}
