import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { isBillPaymentTransaction } from '@/hooks/useBillPaymentReconciliation';
import { useVisibility } from '@/contexts/VisibilityContext';
import { BarChart2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number, isHidden: boolean) => {
  if (isHidden) return '••••••';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const CashFlowChart: React.FC = () => {
  const { lancamentos } = useLancamentosRealizados();
  const { isHidden } = useVisibility();

  const data = useMemo(() => {
    const now = new Date();
    const months: { monthKey: string; monthLabel: string; receitas: number; despesas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const monthKey = format(d, 'yyyy-MM');
      const monthLabel = format(d, 'MMM/yy', { locale: ptBR });
      const monthItems = lancamentos.filter(
        (l) => l.mes_referencia === monthKey && !isBillPaymentTransaction(l)
      );
      const receitas = monthItems
        .filter((l) => l.tipo === 'receita')
        .reduce((s, l) => s + (l.valor_realizado ?? 0), 0);
      const despesas = monthItems
        .filter((l) => l.tipo === 'despesa')
        .reduce((s, l) => s + (l.valor_realizado ?? 0), 0);
      months.push({ monthKey, monthLabel, receitas, despesas });
    }
    return months;
  }, [lancamentos]);

  return (
    <Card className="rounded-xl border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))]">
      <CardHeader className="pb-2 p-4 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-[hsl(var(--color-text-primary))] flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-primary" />
          Fluxo de caixa — últimos 6 meses
        </CardTitle>
        <Link
          to="/movimentacoes"
          className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
        >
          Ver relatório
          <ChevronRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border-subtle))" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11, fill: 'hsl(var(--color-text-muted))' }}
                axisLine={{ stroke: 'hsl(var(--color-border-subtle))' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--color-text-muted))' }}
                axisLine={false}
                tickFormatter={(v) => (isHidden ? '•••' : formatCurrency(v, false).replace(/\s/g, '\u00A0'))}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value, isHidden), '']}
                labelFormatter={(label) => label}
                contentStyle={{
                  background: 'hsl(var(--color-surface-raised))',
                  border: '1px solid hsl(var(--color-border-subtle))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--color-text-success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--color-text-danger))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
