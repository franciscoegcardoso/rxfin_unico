import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart2,
  GitCompare,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type {
  SnapshotPoint,
  AnnualRow,
  Benchmarks,
  PerformanceSummary,
  BenchmarkPeriod,
} from '@/types/investments';

export interface VisoesComplementaresProps {
  snapshotHistory: SnapshotPoint[];
  annualEvolution: AnnualRow[];
  benchmarks: Benchmarks | null;
  performanceSummary: PerformanceSummary | null;
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtPct = (v: number | null, plus = false) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const s = v.toFixed(2).replace('.', ',') + '%';
  return plus && v > 0 ? '+' + s : s;
};

const fmtCompact = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmt(v);
};

type BenchmarkKey = 'CDI' | 'IPCA' | 'IBOVESPA';

export function VisoesComplementares({
  snapshotHistory,
  annualEvolution,
  benchmarks,
  performanceSummary,
}: VisoesComplementaresProps) {
  const [activeTab, setActiveTab] = useState<'grafico' | 'evolucao' | 'comparativo'>('grafico');
  const [expanded, setExpanded] = useState(true);

  const tabs = [
    { key: 'grafico' as const, icon: TrendingUp, label: 'Evolução' },
    { key: 'evolucao' as const, icon: BarChart2, label: 'Por período' },
    { key: 'comparativo' as const, icon: GitCompare, label: 'Comparativo' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
      >
        <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium">Análise da carteira</span>
        <div className="flex-1" />
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <>
          <div className="flex border-b border-border/50 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div>
            {activeTab === 'grafico' && (
              <PortfolioEvolutionChart
                snapshotHistory={snapshotHistory}
                performanceSummary={performanceSummary}
                benchmarks={benchmarks}
              />
            )}
            {activeTab === 'evolucao' && (
              <PortfolioAnnualTable
                annualEvolution={annualEvolution}
                performanceSummary={performanceSummary}
                benchmarks={benchmarks}
              />
            )}
            {activeTab === 'comparativo' && (
              <PortfolioBenchmarkTable
                benchmarks={benchmarks}
                performanceSummary={performanceSummary}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PortfolioEvolutionChart({
  snapshotHistory,
  performanceSummary,
  benchmarks,
}: {
  snapshotHistory: SnapshotPoint[];
  performanceSummary: PerformanceSummary | null;
  benchmarks: Benchmarks | null;
}) {
  const [viewMode, setViewMode] = useState<'rentabilidade' | 'patrimonio'>('rentabilidade');
  const [benchmark, setBenchmark] = useState<BenchmarkKey>('CDI');

  const hasEnoughData = snapshotHistory.length >= 3;
  const baseTotal = snapshotHistory[0]?.total_brl ?? 1;

  const chartData = snapshotHistory.map((snap, i) => {
    const carteiraPct = (snap.total_brl / baseTotal - 1) * 100;
    const diasProporcao = i / Math.max(snapshotHistory.length - 1, 1);
    const bmkPct =
      benchmark === 'CDI'
        ? (benchmarks?.cdi.desde_inicio ?? 0) * diasProporcao
        : benchmark === 'IPCA'
          ? (benchmarks?.ipca.desde_inicio ?? 0) * diasProporcao
          : (benchmarks?.ibovespa.desde_inicio ?? 0) * diasProporcao;

    return {
      date: snap.date,
      carteira:
        viewMode === 'rentabilidade'
          ? parseFloat(carteiraPct.toFixed(2))
          : snap.total_brl,
      benchmark:
        viewMode === 'rentabilidade'
          ? parseFloat(bmkPct.toFixed(2))
          : baseTotal * (1 + bmkPct / 100),
    };
  });

  const rendPct =
    performanceSummary && performanceSummary.total_aplicado > 0
      ? ((performanceSummary.patrimonio_atual - performanceSummary.total_aplicado) /
          performanceSummary.total_aplicado) *
        100
      : 0;
  const rendAbs = performanceSummary
    ? performanceSummary.patrimonio_atual - performanceSummary.total_aplicado
    : 0;

  const bmkRef =
    benchmark === 'CDI'
      ? benchmarks?.cdi
      : benchmark === 'IPCA'
        ? benchmarks?.ipca
        : benchmarks?.ibovespa;
  const pctDoBenchmark =
    bmkRef && bmkRef.desde_inicio > 0
      ? ((rendPct / bmkRef.desde_inicio) * 100).toFixed(2).replace('.', ',')
      : '—';

  return (
    <div className="px-4 py-4">
      <div className="flex flex-wrap gap-6 mb-4">
        <div>
          <p className="text-xs text-muted-foreground">Rendimento total</p>
          <p className="text-2xl font-semibold tabular-nums">{fmt(rendAbs)}</p>
          <p className="text-xs text-muted-foreground">Rendimento no período selecionado</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Rentabilidade</p>
          <p
            className={cn(
              'text-2xl font-semibold tabular-nums',
              rendPct >= 0 ? 'text-emerald-600' : 'text-red-500'
            )}
          >
            {fmtPct(rendPct, true)}
          </p>
          <p className="text-xs text-muted-foreground">Rentabilidade no período</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">vs {benchmark}</p>
          <p className="text-2xl font-semibold tabular-nums text-emerald-600">{pctDoBenchmark}%</p>
          <p className="text-xs text-muted-foreground font-medium">Quando comparado ao {benchmark}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap mb-3">
        <div className="flex items-center gap-4">
          {(['rentabilidade', 'patrimonio'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <div
                className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                  viewMode === mode ? 'border-foreground' : 'border-muted-foreground'
                )}
              >
                {viewMode === mode && <div className="w-2 h-2 rounded-full bg-foreground" />}
              </div>
              <span className="text-xs text-muted-foreground">
                {mode === 'rentabilidade' ? 'Por rentabilidade' : 'Por patrimônio'}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">Comparar com</span>
          <select
            value={benchmark}
            onChange={(e) => setBenchmark(e.target.value as BenchmarkKey)}
            className="text-xs border border-border rounded-md px-2 py-1 bg-background"
          >
            <option value="CDI">CDI</option>
            <option value="IPCA">IPCA</option>
            <option value="IBOVESPA">IBOVESPA</option>
          </select>
        </div>
      </div>

      {!hasEnoughData ? (
        <div className="h-48 flex flex-col items-center justify-center gap-2 bg-muted/10 rounded-lg">
          <TrendingUp className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">Histórico em construção</p>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            O gráfico ficará disponível após alguns dias de uso. Seus dados são coletados
            automaticamente todo dia.
          </p>
          <div className="flex gap-4 mt-1 flex-wrap justify-center">
            {snapshotHistory.map((s) => (
              <div key={s.date} className="text-center">
                <p className="text-xs font-medium tabular-nums">{fmtCompact(s.total_brl)}</p>
                <p className="text-[10px] text-muted-foreground">{s.date}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => format(new Date(String(d)), 'dd/MM', { locale: ptBR })}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              tickFormatter={(v: number) =>
                viewMode === 'rentabilidade' ? `${Number(v).toFixed(0)}%` : fmtCompact(Number(v))
              }
              tick={{ fontSize: 10 }}
              width={viewMode === 'rentabilidade' ? 42 : 52}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                viewMode === 'rentabilidade' ? fmtPct(value) : fmt(value),
                name,
              ]}
              labelFormatter={(l) => format(new Date(String(l)), 'dd/MM/yyyy', { locale: ptBR })}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="carteira"
              name="Carteira"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="benchmark"
              name={benchmark}
              stroke="#10B981"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function PortfolioAnnualTable({
  annualEvolution,
  performanceSummary,
  benchmarks,
}: {
  annualEvolution: AnnualRow[];
  performanceSummary: PerformanceSummary | null;
  benchmarks: Benchmarks | null;
}) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  if (!performanceSummary) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        Resumo de performance ainda não disponível para esta visão.
      </div>
    );
  }

  const anoAtual = new Date().getFullYear();
  let patrimonioAcum = 0;

  const rowsReversed = [...annualEvolution].reverse();
  const rows = rowsReversed
    .map((row, i) => {
      const isFirst = i === 0;
      const isLast = row.ano === anoAtual;

      const patInicial = isFirst ? 0 : patrimonioAcum;
      const patFinal = isLast ? performanceSummary.patrimonio_atual : patInicial + row.aportes;
      const rendimento = patFinal - patInicial - row.aportes + row.ir_pago;
      const rentPct = patInicial > 0 ? (rendimento / patInicial) * 100 : 0;
      const pctCdi = row.cdi_pct > 0 ? (rentPct / row.cdi_pct) * 100 : 0;

      patrimonioAcum = patFinal;

      return { ...row, patInicial, patFinal, rendimento, rentPct, pctCdi };
    })
    .reverse();

  const totalAportes = rows.reduce((s, r) => s + r.aportes, 0);
  const totalIR = performanceSummary.total_ir_retido;
  const rendimentoTotal = performanceSummary.patrimonio_atual - totalAportes + totalIR;
  const rentTotalPct = totalAportes > 0 ? (rendimentoTotal / totalAportes) * 100 : 0;
  const pctCdiTotal =
    (benchmarks?.cdi.desde_inicio ?? 0) > 0
      ? (rentTotalPct / (benchmarks?.cdi.desde_inicio ?? 1)) * 100
      : 0;

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-4 h-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold">Evolução patrimonial por período</p>
          <p className="text-xs text-muted-foreground">
            Histórico, movimentações e evolução da sua carteira
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Sem dados anuais ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-border">
                {[
                  '',
                  'Patrimônio inicial',
                  'Movimentações',
                  'IR Pago',
                  'IOF Pago',
                  'Patrimônio final',
                  'Rendimento',
                  'Rentabilidade',
                  '% CDI',
                ].map((h) => (
                  <th
                    key={h || 'y'}
                    className={cn(
                      'py-2 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap',
                      h === '' ? 'text-left' : 'text-right'
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <React.Fragment key={row.ano}>
                  <tr
                    className="border-b border-border/40 hover:bg-muted/20 cursor-pointer"
                    onClick={() => setExpandedYear(expandedYear === row.ano ? null : row.ano)}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <span className="font-semibold">{row.ano}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">{fmt(row.patInicial)}</td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      <span className={row.aportes >= 0 ? '' : 'text-red-500'}>
                        {row.aportes < 0 ? '-' : ''}
                        {fmt(Math.abs(row.aportes))}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-red-500">
                      {row.ir_pago > 0 ? `-${fmt(row.ir_pago)}` : fmt(0)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">
                      {fmt(row.iof_pago)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-medium">{fmt(row.patFinal)}</td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      <span
                        className={row.rendimento >= 0 ? 'text-emerald-600' : 'text-red-500'}
                      >
                        {row.rendimento >= 0 ? '+' : ''}
                        {fmt(row.rendimento)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      <span className={row.rentPct >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                        {fmtPct(row.rentPct, true)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-medium">
                          {row.pctCdi.toFixed(2).replace('.', ',')}%
                        </span>
                        <ChevronDown
                          className={cn(
                            'w-3 h-3 text-muted-foreground transition-transform shrink-0',
                            expandedYear === row.ano && 'rotate-180'
                          )}
                        />
                      </div>
                    </td>
                  </tr>

                  {expandedYear === row.ano && (
                    <tr>
                      <td colSpan={9} className="bg-muted/10 px-8 py-3">
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p className="font-medium mb-2">Detalhes de {row.ano}</p>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-1 max-w-md">
                            <span>Total aportado</span>
                            <span className="tabular-nums text-right">{fmt(row.aportes)}</span>
                            <span>IR retido na fonte</span>
                            <span className="tabular-nums text-right text-red-500">
                              -{fmt(row.ir_pago)}
                            </span>
                            <span>CDI no período</span>
                            <span className="tabular-nums text-right">{fmtPct(row.cdi_pct, true)}</span>
                            <span>IPCA no período</span>
                            <span className="tabular-nums text-right">{fmtPct(row.ipca_pct, true)}</span>
                            <span>Rendimento estimado</span>
                            <span
                              className={cn(
                                'tabular-nums text-right',
                                row.rendimento >= 0 ? 'text-emerald-600' : 'text-red-500'
                              )}
                            >
                              {row.rendimento >= 0 ? '+' : ''}
                              {fmt(row.rendimento)}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              <tr className="border-t-2 border-border font-semibold">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Total</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-right tabular-nums">{fmt(0)}</td>
                <td className="py-3 px-3 text-right tabular-nums">{fmt(totalAportes)}</td>
                <td className="py-3 px-3 text-right tabular-nums text-red-500">-{fmt(totalIR)}</td>
                <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">{fmt(0)}</td>
                <td className="py-3 px-3 text-right tabular-nums">
                  {fmt(performanceSummary.patrimonio_atual)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-emerald-600">
                  +{fmt(rendimentoTotal)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-emerald-600">
                  {fmtPct(rentTotalPct, true)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums">
                  {pctCdiTotal.toFixed(2).replace('.', ',')}%
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex items-center gap-1 mt-3">
            <div className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Data de referência:{' '}
              {performanceSummary.data_referencia
                ? format(new Date(performanceSummary.data_referencia), 'dd/MM/yyyy', {
                    locale: ptBR,
                  })
                : '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

type ComparativaLinha =
  | {
      label: string;
      destaque: boolean;
      info?: string;
      values: {
        no_mes: number | null;
        no_semestre: number | null;
        no_ano: number | null;
        doze_meses: number | null;
        desde_inicio: number | null;
      };
    }
  | {
      label: string;
      destaque: boolean;
      info?: string;
      values: BenchmarkPeriod;
    };

function PortfolioBenchmarkTable({
  benchmarks,
  performanceSummary,
}: {
  benchmarks: Benchmarks | null;
  performanceSummary: PerformanceSummary | null;
}) {
  if (!benchmarks || !performanceSummary) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        Dados de comparativo ainda não disponíveis.
      </div>
    );
  }

  const rendPct =
    performanceSummary.total_aplicado > 0
      ? ((performanceSummary.patrimonio_atual - performanceSummary.total_aplicado) /
          performanceSummary.total_aplicado) *
        100
      : null;

  const rentReal =
    rendPct !== null && benchmarks.ipca.desde_inicio > 0
      ? ((1 + rendPct / 100) / (1 + benchmarks.ipca.desde_inicio / 100) - 1) * 100
      : null;

  const COLUNAS = ['no_mes', 'no_semestre', 'no_ano', 'doze_meses', 'desde_inicio'] as const;
  const COL_LABELS = ['No mês', 'Semestre', 'No ano', '12 meses', 'Desde o início'];

  const linhas: ComparativaLinha[] = [
    {
      label: 'Sua carteira',
      destaque: true,
      values: {
        no_mes: null,
        no_semestre: null,
        no_ano: null,
        doze_meses: null,
        desde_inicio: rendPct,
      },
    },
    { label: 'CDI %', destaque: false, values: benchmarks.cdi },
    { label: 'IPCA', destaque: false, values: benchmarks.ipca },
    { label: 'IBOVESPA', destaque: false, values: benchmarks.ibovespa },
    {
      label: 'Rentabilidade real',
      destaque: false,
      info: 'Rentabilidade da carteira descontada a inflação (IPCA)',
      values: {
        no_mes: null,
        no_semestre: null,
        no_ano: null,
        doze_meses: null,
        desde_inicio: rentReal,
      },
    },
  ];

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <GitCompare className="w-4 h-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold">Rentabilidade comparada</p>
          <p className="text-xs text-muted-foreground">
            Performance da sua carteira comparada a outros indicadores
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[640px]">
          <thead>
            <tr>
              <th className="pb-3 text-left text-xs font-medium text-muted-foreground w-40" />
              {COL_LABELS.map((l) => (
                <th
                  key={l}
                  className="pb-3 text-right text-xs font-medium text-muted-foreground px-4 whitespace-nowrap"
                >
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.label} className="border-t border-border/40">
                <td className={cn('py-3 text-sm', linha.destaque && 'font-semibold')}>
                  <div className="flex items-center gap-1">
                    {linha.label}
                    {linha.info && (
                      <span title={linha.info}>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help shrink-0" />
                      </span>
                    )}
                  </div>
                </td>
                {COLUNAS.map((col) => {
                  const val = linha.values[col];
                  return (
                    <td key={col} className="py-3 text-right px-4 tabular-nums">
                      {val === null || val === undefined ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <span
                          className={cn(
                            'text-sm',
                            linha.destaque && val >= 0 && 'text-emerald-600 font-semibold',
                            linha.destaque && val < 0 && 'text-red-500 font-semibold'
                          )}
                        >
                          {val >= 0 && linha.destaque ? '+' : ''}
                          {val.toFixed(2).replace('.', ',')}%
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs font-medium text-muted-foreground mt-4">
        Data de referência:{' '}
        {(() => {
          const d = performanceSummary.data_referencia
            ? new Date(performanceSummary.data_referencia)
            : null;
          return d && !Number.isNaN(d.getTime())
            ? format(d, 'dd/MM/yyyy', { locale: ptBR })
            : '—';
        })()}
      </p>
    </div>
  );
}
