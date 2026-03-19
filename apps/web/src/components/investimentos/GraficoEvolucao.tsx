import React, { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { PortfolioPerformance } from '@/hooks/usePortfolioPerformance';
import { buildChartSeries, type BenchmarkKey, type ViewMode } from '@/utils/portfolioChart';

interface Props {
  data: PortfolioPerformance;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function formatDateBR(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function GraficoEvolucao({ data }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('rentabilidade');
  const [benchmark, setBenchmark] = useState<BenchmarkKey>('CDI');
  const chartData = useMemo(
    () => buildChartSeries(data, viewMode, benchmark),
    [data, viewMode, benchmark]
  );

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="px-4 py-3 flex flex-wrap gap-6 border-b border-border/40">
        <div>
          <p className="text-xs text-muted-foreground">Patrimonio atual</p>
          <p className="text-xl font-semibold tabular-nums">{formatCurrency(data.summary.patrimonio_atual)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Rendimento total</p>
          <p className={cn('text-xl font-semibold tabular-nums', data.summary.rendimento_pct >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {data.summary.rendimento_pct >= 0 ? '+' : ''}{data.summary.rendimento_pct.toFixed(2).replace('.', ',')}%
          </p>
          <p className="text-xs text-muted-foreground">
            {data.summary.rendimento_total >= 0 ? '+' : ''}{formatCurrency(data.summary.rendimento_total)}
          </p>
        </div>
      </div>

      <div className="px-4 py-2 flex items-center gap-4 flex-wrap border-b border-border/40">
        <div className="flex items-center gap-3 text-sm">
          {(['rentabilidade', 'patrimonio'] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={viewMode === mode}
                onChange={() => setViewMode(mode)}
                className="accent-foreground"
              />
              <span className="text-xs">
                {mode === 'rentabilidade' ? 'Visualizar por rentabilidade' : 'Visualizar por patrimonio'}
              </span>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">Comparar com</span>
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
      </div>

      <div className="px-2 pb-4 pt-3">
        {data.summary.snapshot_count < 7 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium">Historico em construcao</p>
            <p className="text-xs text-center max-w-xs">
              O grafico ficara mais rico apos alguns dias de uso. Seus dados sao coletados diariamente.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tickFormatter={formatDateBR} tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) =>
                  viewMode === 'rentabilidade'
                    ? `${Number(v).toFixed(0)}%`
                    : new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short' }).format(Number(v))
                }
                tick={{ fontSize: 11 }}
                width={viewMode === 'rentabilidade' ? 48 : 56}
              />
              <Tooltip
                formatter={(value: number) =>
                  viewMode === 'rentabilidade'
                    ? `${value >= 0 ? '+' : ''}${value.toFixed(2).replace('.', ',')}%`
                    : formatCurrency(value)
                }
                labelFormatter={(label) => `Data: ${formatDateBR(label)}`}
              />
              <Legend />
              <Line type="monotone" dataKey="carteira" name="Carteira" stroke="#F59E0B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="benchmark" name={benchmark} stroke="#10B981" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
