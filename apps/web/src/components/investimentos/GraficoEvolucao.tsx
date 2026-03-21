import React, { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { PortfolioPerformance } from '@/hooks/usePortfolioPerformance';
import {
  buildChartSeries,
  buildStackedSeries,
  type BenchmarkKey,
  type ViewMode,
} from '@/utils/portfolioChart';

interface Props {
  data: PortfolioPerformance;
}

// ─── formatadores ────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const fmtCompact = (v: number) =>
  'R$\u202f' + new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

function fmtDateBR(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ─── Tooltip do BarChart empilhado ───────────────────────────────────────────

function TooltipStacked({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  const rentPositive = p.rent >= 0;
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-md text-xs min-w-[210px]">
      <p className="font-medium text-foreground mb-2 pb-1.5 border-b border-border/40">
        {fmtDateBR(label)}
      </p>
      <div className="space-y-1.5">
        <Row label="Patrimônio total" value={fmtCurrency(p.total)} bold />
        <div className="border-t border-border/40 my-1" />
        <Row label="Base inicial" value={fmtCurrency(p.base)} dot="#888780" />
        <Row label="Novos aportes" value={fmtCurrency(p.aportes)} dot="#378ADD" />
        <Row
          label="Rendimento"
          value={(rentPositive ? '+' : '') + fmtCurrency(p.rent)}
          dot={rentPositive ? '#16a34a' : '#dc2626'}
          color={rentPositive ? 'text-emerald-600' : 'text-red-500'}
          bold
        />
        <div className="border-t border-border/40 mt-1 pt-1">
          <Row label="Custo total" value={fmtCurrency(p.custo)} muted />
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  dot,
  color,
  bold,
  muted,
}: {
  label: string;
  value: string;
  dot?: string;
  color?: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={cn('flex justify-between gap-3', muted && 'opacity-60')}>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {dot && <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: dot }} />}
        {label}
      </span>
      <span className={cn('tabular-nums', bold && 'font-medium', color)}>{value}</span>
    </div>
  );
}

// ─── Tooltip do LineChart (%) ─────────────────────────────────────────────────

function TooltipPct({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-md text-xs min-w-[160px]">
      <p className="font-medium text-foreground mb-2">{fmtDateBR(label)}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex justify-between gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-sm" style={{ background: entry.color }} />
            {entry.name}
          </span>
          <span className="tabular-nums font-medium" style={{ color: entry.color }}>
            {entry.value >= 0 ? '+' : ''}
            {Number(entry.value).toFixed(2).replace('.', ',')}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Legenda custom ──────────────────────────────────────────────────────────

function LegendStacked({
  stacked,
  summary,
}: {
  stacked: ReturnType<typeof buildStackedSeries>;
  summary: PortfolioPerformance['summary'];
}) {
  const last = stacked[stacked.length - 1];
  if (!last) return null;
  const aportesTotais = summary.total_aplicado - last.base;
  const rentPositive = summary.rendimento_total >= 0;

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2.5 mt-2.5 border-t border-border/40 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-2 rounded-sm" style={{ background: '#888780' }} />
        Base inicial — <span className="tabular-nums text-foreground">{fmtCompact(last.base)}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-2 rounded-sm" style={{ background: '#378ADD' }} />
        Novos aportes —{' '}
        <span className="tabular-nums text-foreground">{fmtCompact(Math.max(0, aportesTotais))}</span>
      </span>
      <span className={cn('flex items-center gap-1.5', rentPositive ? 'text-emerald-600' : 'text-red-500')}>
        <span className="w-3 h-2 rounded-sm" style={{ background: rentPositive ? '#16a34a' : '#dc2626' }} />
        Rendimento —{' '}
        <span className="tabular-nums font-medium">
          {rentPositive ? '+' : ''}
          {fmtCompact(summary.rendimento_total)}
          <span className="ml-1 opacity-70">
            ({rentPositive ? '+' : ''}
            {summary.rendimento_pct.toFixed(2).replace('.', ',')}%)
          </span>
        </span>
      </span>
    </div>
  );
}

function LegendPct({ benchmark }: { benchmark: string }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2.5 mt-2.5 border-t border-border/40 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-2 rounded-sm" style={{ background: '#BA7517' }} />
        Carteira (rentabilidade bruta, inclui aportes)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-5 h-px border-t border-dashed" style={{ borderColor: '#378ADD' }} />
        {benchmark}
      </span>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function GraficoEvolucao({ data }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('patrimonio');
  const [benchmark, setBenchmark] = useState<BenchmarkKey>('CDI');

  const stackedData = useMemo(() => buildStackedSeries(data), [data]);
  const lineData = useMemo(
    () => buildChartSeries(data, 'rentabilidade', benchmark),
    [data, benchmark]
  );

  const hasData = (data.snapshot_history?.length ?? 0) >= 2;
  const { summary } = data;

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-border/40">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Patrimônio atual</p>
          <p className="text-lg font-medium tabular-nums">{fmtCurrency(summary.patrimonio_atual)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Rendimento total</p>
          <p
            className={cn(
              'text-lg font-medium tabular-nums',
              summary.rendimento_pct >= 0 ? 'text-emerald-600' : 'text-red-500'
            )}
          >
            {summary.rendimento_pct >= 0 ? '+' : ''}
            {summary.rendimento_pct.toFixed(2).replace('.', ',')}%
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {summary.rendimento_total >= 0 ? '+' : ''}
            {fmtCurrency(summary.rendimento_total)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Total aplicado</p>
          <p className="text-lg font-medium tabular-nums">{fmtCurrency(summary.total_aplicado)}</p>
        </div>
      </div>

      {/* ── Controles ────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 flex items-center gap-4 flex-wrap border-b border-border/40">
        <div className="flex items-center gap-4">
          {(['patrimonio', 'rentabilidade'] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={viewMode === mode}
                onChange={() => setViewMode(mode)}
                className="accent-foreground"
              />
              <span className="text-xs">
                {mode === 'patrimonio' ? 'Composição do patrimônio' : 'Rentabilidade (%)'}
              </span>
            </label>
          ))}
        </div>
        {viewMode === 'rentabilidade' && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">vs.</span>
            <select
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value as BenchmarkKey)}
              className="text-xs border border-border rounded px-2 py-1 bg-background"
            >
              <option value="CDI">CDI</option>
              <option value="IPCA">IPCA</option>
              <option value="IBOVESPA">IBOVESPA</option>
            </select>
          </div>
        )}
      </div>

      {/* ── Gráfico ───────────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2">
        {!hasData ? (
          <div className="h-52 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium">Histórico em construção</p>
            <p className="text-xs text-center max-w-xs">
              O gráfico ficará mais rico após alguns dias de uso. Dados coletados diariamente.
            </p>
          </div>
        ) : viewMode === 'patrimonio' ? (
          /* ── BarChart empilhado ──────────────────────────────────────── */
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={stackedData}
                margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDateBR}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtCompact}
                  tick={{ fontSize: 11 }}
                  width={60}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<TooltipStacked />} cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />

                {/* Stack s1: base + aportes + rendimento positivo */}
                <Bar
                  dataKey="base"
                  name="Base inicial"
                  stackId="s1"
                  fill="#88878055"
                  stroke="#888780"
                  strokeWidth={0.5}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="aportes"
                  name="Novos aportes"
                  stackId="s1"
                  fill="#378ADD55"
                  stroke="#378ADD"
                  strokeWidth={0.5}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="rentPos"
                  name="Rendimento"
                  stackId="s1"
                  fill="#16a34a55"
                  stroke="#16a34a"
                  strokeWidth={0.5}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />

                {/* Stack s2: rendimento negativo (independente, abaixo do zero) */}
                <Bar
                  dataKey="rentNeg"
                  name="Perda"
                  stackId="s2"
                  fill="#dc262655"
                  stroke="#dc2626"
                  strokeWidth={0.5}
                  radius={[0, 0, 3, 3]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
            <LegendStacked stacked={stackedData} summary={summary} />
          </>
        ) : (
          /* ── LineChart rentabilidade % ───────────────────────────────── */
          <>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDateBR}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                  tick={{ fontSize: 11 }}
                  width={48}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<TooltipPct />} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Line type="monotone" dataKey="carteira" name="Carteira" stroke="#BA7517" strokeWidth={2} dot={false} />
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  name={benchmark}
                  stroke="#378ADD"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="5 3"
                />
              </LineChart>
            </ResponsiveContainer>
            <LegendPct benchmark={benchmark} />
          </>
        )}
      </div>
    </div>
  );
}
