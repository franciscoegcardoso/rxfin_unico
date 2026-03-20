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

/** CDI/IPCA/Ibov como taxa diária composta no período real (alinhado a VisoesComplementares). */
export function buildChartSeries(
  data: PortfolioPerformance,
  viewMode: ViewMode,
  benchmark: BenchmarkKey
): ChartPoint[] {
  const snapshots = data.snapshot_history ?? [];
  if (snapshots.length < 2) return [];

  const baseTotal = snapshots[0]?.total_brl ?? 0;
  if (!Number.isFinite(baseTotal) || baseTotal <= 0) return [];

  const baseDate = new Date(snapshots[0].date);
  const lastDate = new Date(snapshots[snapshots.length - 1].date);
  const totalDias = Math.max(
    (lastDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24),
    1
  );

  const bmkTotal = getBenchmarkValue(data.benchmarks, benchmark);
  const taxaDiaria = Math.pow(1 + bmkTotal / 100, 1 / totalDias) - 1;

  return snapshots.map((snap) => {
    const snapDate = new Date(snap.date);
    const diasDecorridos = Math.max(
      (snapDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24),
      0
    );

    const carteiraPct = (snap.total_brl / baseTotal - 1) * 100;
    const bmkPct = (Math.pow(1 + taxaDiaria, diasDecorridos) - 1) * 100;

    return {
      date: snap.date,
      carteira:
        viewMode === 'rentabilidade' ? Number(carteiraPct.toFixed(2)) : snap.total_brl,
      benchmark:
        viewMode === 'rentabilidade'
          ? Number(bmkPct.toFixed(2))
          : baseTotal * (1 + bmkPct / 100),
    };
  });
}

export function calcPctCDI(rentPct: number, cdiPct: number): string {
  if (!Number.isFinite(cdiPct) || cdiPct === 0) return '—';
  return ((rentPct / cdiPct) * 100).toFixed(2).replace('.', ',');
}
