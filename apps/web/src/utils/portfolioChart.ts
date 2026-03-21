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

export interface StackedPoint {
  date: string;
  base: number; // patrimônio do snapshot[0], constante
  aportes: number; // aportes acumulados APÓS o mês do snapshot[0]
  rentPos: number; // max(0, patrimônio - custo)
  rentNeg: number; // min(0, patrimônio - custo) — negativo ou zero
  rent: number; // valor real (pode ser negativo)
  custo: number; // base + aportes
  total: number; // = base + aportes + rentPos + rentNeg = snapshot.total_brl
}

/**
 * Decompõe cada snapshot em Base + Aportes + Rendimento.
 *
 * Consistência garantida: base + aportes + rentPos + rentNeg = snapshot.total_brl
 *
 * Armadilha evitada: contributions_by_month inclui o mês do snapshot[0].
 * Apenas meses POSTERIORES ao baseMonth são somados como "novos aportes"
 * para não duplicar o que já está embutido em `base`.
 */
export function buildStackedSeries(data: PortfolioPerformance): StackedPoint[] {
  const snapshots = data.snapshot_history ?? [];
  if (snapshots.length < 2) return [];

  const base = snapshots[0].total_brl;
  if (!Number.isFinite(base) || base <= 0) return [];

  const baseMonth = snapshots[0].date.slice(0, 7); // 'YYYY-MM'
  const contribs = data.contributions_by_month ?? [];

  // Mapa: YYYY-MM → aportes acumulados APÓS o baseMonth (exclusivo)
  const sorted = [...contribs]
    .filter((c) => c.month > baseMonth)
    .sort((a, b) => a.month.localeCompare(b.month));

  let running = 0;
  const accumMap = new Map<string, number>();
  for (const c of sorted) {
    running += c.amount;
    accumMap.set(c.month, running);
  }

  function getAportes(dateStr: string): number {
    const month = dateStr.slice(0, 7);
    // Maior entrada do mapa cujo mês <= month
    let best = 0;
    for (const [m, val] of accumMap) {
      if (m <= month) best = val;
    }
    return Math.max(0, best);
  }

  return snapshots.map((snap) => {
    const aportes = getAportes(snap.date);
    const custo = base + aportes;
    const rent = snap.total_brl - custo;
    return {
      date: snap.date,
      base: Math.round(base),
      aportes: Math.round(aportes),
      rentPos: Math.round(Math.max(0, rent)),
      rentNeg: Math.round(Math.min(0, rent)),
      rent: Math.round(rent),
      custo: Math.round(custo),
      total: Math.round(snap.total_brl),
    };
  });
}
