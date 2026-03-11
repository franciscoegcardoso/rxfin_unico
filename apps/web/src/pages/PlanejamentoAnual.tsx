import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeaderMetricCard } from '@/components/shared/HeaderMetricCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, RefreshCw, BarChart2 } from 'lucide-react';
import { useAnnualOverview } from '@/hooks/useAnnualOverview';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { GoalCard } from '@/design-system/components/GoalCard';
import { EmptyMetas } from '@/design-system/components/empty-states';
import { ErrorCard } from '@/design-system/components/ErrorCard';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const PlanejamentoAnual: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, isLoading, error, refetch } = useAnnualOverview(year);

  const months = data?.months ?? [];
  const totals = data?.totals;
  const savingsGoals = data?.savings_goals ?? [];

  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = months[i];
      const monthNum = i + 1;
      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
      return {
        month: MONTH_NAMES[i],
        receita: m?.income ?? 0,
        despesa: m?.expense ?? 0,
        saldo: (m?.income ?? 0) - (m?.expense ?? 0),
        monthKey,
      };
    });
  }, [year, months]);

  const totalIncome = totals?.total_income ?? chartData.reduce((s, d) => s + d.receita, 0);
  const totalExpense = totals?.total_expense ?? chartData.reduce((s, d) => s + d.despesa, 0);
  const totalBalance = totalIncome - totalExpense;

  const getMonthStatus = (m: { income?: number; expense?: number; savings_goal?: number }, monthIndex: number) => {
    const now = new Date();
    const isFuture = year > now.getFullYear() || (year === now.getFullYear() && monthIndex + 1 > now.getMonth());
    if (isFuture) return { label: '—', variant: 'secondary' as const, border: 'muted' as const };
    const balance = (m.income ?? 0) - (m.expense ?? 0);
    const goal = m.savings_goal ?? 0;
    if (goal <= 0) return { label: '—', variant: 'secondary' as const, border: 'muted' as const };
    if (balance >= goal) return { label: 'Ok', variant: 'default' as const, border: 'income' as const };
    if (balance >= 0) return { label: 'Parcial', variant: 'outline' as const, border: 'warning' as const };
    return { label: 'Atenção', variant: 'destructive' as const, border: 'expense' as const };
  };

  if (isLoading) {
    return (
      <>
        <PageHeader icon={BarChart2} title="Planejamento Anual" subtitle="Visão anual de receitas, despesas e saldo" />
        <PageSkeleton />
      </>
    );
  }

  return (
    <div className="space-y-6">
        <PageHeader
          icon={BarChart2}
          title="Planejamento Anual"
          subtitle="Visão anual de receitas, despesas e saldo"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="min-h-[44px] touch-manipulation" onClick={() => setYear((y) => y - 1)} aria-label="Ano anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[80px] text-center font-semibold text-sm sm:text-base">{year}</span>
              <Button variant="outline" size="sm" className="min-h-[44px] touch-manipulation" onClick={() => setYear((y) => y + 1)} aria-label="Próximo ano">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] touch-manipulation" onClick={() => refetch()} aria-label="Atualizar">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          }
        />

        {error && (
          <ErrorCard message="Não foi possível carregar os dados." onRetry={() => refetch()} />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <HeaderMetricCard label="Total receitas" value={formatCurrency(totalIncome)} variant="positive" icon={<TrendingUp className="h-4 w-4" />} />
          <HeaderMetricCard label="Total despesas" value={formatCurrency(totalExpense)} variant="negative" icon={<TrendingDown className="h-4 w-4" />} />
          <HeaderMetricCard label="Saldo do ano" value={formatCurrency(totalBalance)} variant={totalBalance >= 0 ? 'positive' : 'negative'} icon={<Target className="h-4 w-4" />} />
        </div>

        <Card className="rounded-xl border border-border bg-card p-6">
          <CardHeader>
            <CardTitle className="text-base text-foreground">Receitas e despesas por mês</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados para o ano selecionado.</p>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="receita" name="Receita" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesa" name="Despesa" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grid 12 meses: mobile scroll horizontal, desktop grid-cols-4 grid-rows-3 */}
        <Card className="rounded-xl border border-border bg-card p-6">
          <CardHeader>
            <CardTitle className="text-base text-foreground">Resumo dos 12 meses</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-0">
            <div className="overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              <div className="flex md:grid md:grid-cols-4 md:grid-rows-3 gap-3 min-w-max md:min-w-0">
                {chartData.map((row, i) => {
                  const m = months[i];
                  const status = getMonthStatus(m ?? {}, i);
                  return (
                    <div
                      key={row.monthKey}
                      className={cn(
                        'rounded-xl border border-border bg-card p-3 min-w-[140px] md:min-w-0 shrink-0',
                        status.border === 'income' && 'border-l-4 border-l-income',
                        status.border === 'warning' && 'border-l-4 border-l-warning',
                        status.border === 'expense' && 'border-l-4 border-l-expense',
                        status.border === 'muted' && 'border-l-4 border-l-muted'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-foreground">{row.month}</span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs mt-1">
                        <span className="text-muted-foreground">Receita</span>
                        <span className="text-right text-income">{formatCurrency(row.receita)}</span>
                        <span className="text-muted-foreground">Despesa</span>
                        <span className="text-right text-expense">{formatCurrency(row.despesa)}</span>
                        <span className="text-muted-foreground">Saldo</span>
                        <span className={cn('text-right font-medium', row.saldo >= 0 ? 'text-income' : 'text-expense')}>{formatCurrency(row.saldo)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {savingsGoals.length === 0 ? (
          <EmptyMetas />
        ) : (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Metas de economia</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savingsGoals.map((goal, i) => {
                const target = goal.target ?? 0;
                const current = goal.current ?? 0;
                const deadlineStr = goal.deadline ? format(new Date(goal.deadline), 'dd/MM/yyyy', { locale: ptBR }) : '';
                const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                const status = daysLeft < 0 ? 'overdue' : daysLeft <= 30 ? 'attention' : 'on_track';
                return (
                  <GoalCard
                    key={i}
                    title={goal.name ?? 'Meta'}
                    currentValue={current}
                    targetValue={target}
                    deadline={deadlineStr ? `Prazo: ${deadlineStr}` : 'Sem prazo'}
                    category={goal.category ?? 'Economia'}
                    status={status}
                    deadlineIso={goal.deadline ?? undefined}
                  />
                );
              })}
            </div>
          </div>
        )}
    </div>
  );
};

export default PlanejamentoAnual;
