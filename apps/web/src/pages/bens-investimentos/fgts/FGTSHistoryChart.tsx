import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FGTSMonthlyEntry } from '@/hooks/useFGTSEntries';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const formatMonth = (yyyyMm: string) => {
  const [y, m] = yyyyMm.split('-').map(Number);
  if (!m) return yyyyMm;
  const d = new Date(y, m - 1, 1);
  return format(d, 'MMM/yy', { locale: ptBR });
};

interface FGTSHistoryChartProps {
  entries: FGTSMonthlyEntry[];
  assetId?: string | null;
}

export function FGTSHistoryChart({ entries, assetId }: FGTSHistoryChartProps) {
  const filtered = assetId ? entries.filter(e => e.asset_id === assetId) : entries;
  const sorted = [...filtered].sort((a, b) => a.month.localeCompare(b.month));
  const chartData = sorted.map(e => ({
    month: e.month,
    label: formatMonth(e.month),
    saldo: e.final_balance,
    deposito: e.deposit,
    rendimento: e.yield,
  }));

  if (chartData.length === 0) {
    return (
      <Card className="rounded-xl border border-border/80">
        <CardHeader>
          <CardTitle className="text-base">Histórico de saldos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum lançamento ainda. Registre o saldo do mês para ver a evolução.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-border/80">
      <CardHeader>
        <CardTitle className="text-base">Evolução mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 11 }} width={72} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Saldo']}
                labelFormatter={label => label}
              />
              <Area type="monotone" dataKey="saldo" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="py-2 pr-4 font-medium">Mês</th>
                <th className="py-2 pr-4 font-medium text-right">Saldo inicial</th>
                <th className="py-2 pr-4 font-medium text-right">Depósito</th>
                <th className="py-2 pr-4 font-medium text-right">Rendimento</th>
                <th className="py-2 font-medium text-right">Saldo final</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(e => (
                <tr key={`${e.asset_id}-${e.month}`} className="border-b last:border-0">
                  <td className="py-2 pr-4">{formatMonth(e.month)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(e.previous_balance ?? 0)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(e.deposit ?? 0)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(e.yield ?? 0)}</td>
                  <td className="py-2 text-right font-medium tabular-nums">{formatCurrency(e.final_balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
