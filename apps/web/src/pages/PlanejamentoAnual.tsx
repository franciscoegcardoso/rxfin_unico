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
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, RefreshCw } from 'lucide-react';
import { useAnnualOverview } from '@/hooks/useAnnualOverview';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

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

  const getMonthStatus = (m: { income?: number; expense?: number; savings_goal?: number }) => {
    const balance = (m.income ?? 0) - (m.expense ?? 0);
    const goal = m.savings_goal ?? 0;
    if (goal <= 0) return { label: '—', variant: 'secondary' as const };
    if (balance >= goal) return { label: 'Ok', variant: 'default' as const };
    if (balance >= 0) return { label: 'Parcial', variant: 'outline' as const };
    return { label: 'Atenção', variant: 'destructive' as const };
  };

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Planejamento Anual" />
        <PageSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Planejamento Anual"
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
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 border-destructive/50 bg-destructive/5">
            <p className="text-sm text-destructive">{String(error)}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-[hsl(150,60%,40%)]" />
                Total receitas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-xl font-semibold text-[hsl(150,60%,40%)]">{formatCurrency(totalIncome)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Total despesas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-xl font-semibold text-red-600">{formatCurrency(totalExpense)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Target className="h-4 w-4" />
                Saldo do ano
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className={cn(
                'text-xl font-semibold',
                totalBalance >= 0 ? 'text-[hsl(210,80%,45%)]' : 'text-red-600'
              )}>
                {formatCurrency(totalBalance)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <CardHeader>
            <CardTitle className="text-base">Receitas e despesas por mês</CardTitle>
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
                    <Bar dataKey="receita" name="Receita" fill="hsl(150,60%,40%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesa" name="Despesa" fill="rgb(220, 38, 38)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <CardHeader>
            <CardTitle className="text-base">Resumo dos 12 meses</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-0">
            {/* Mobile: cards empilhados por mês */}
            <div className="md:hidden space-y-3">
              {chartData.map((row, i) => {
                const m = months[i];
                const status = getMonthStatus(m ?? {});
                return (
                  <div key={row.monthKey} className="rounded-lg border border-border/80 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{row.month}</span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
                      <span className="text-muted-foreground">Receita</span>
                      <span className="text-right text-[hsl(150,60%,40%)]">{formatCurrency(row.receita)}</span>
                      <span className="text-muted-foreground">Despesa</span>
                      <span className="text-right text-red-600">{formatCurrency(row.despesa)}</span>
                      <span className="text-muted-foreground">Saldo</span>
                      <span className={cn('text-right font-medium', row.saldo >= 0 ? 'text-[hsl(210,80%,45%)]' : 'text-red-600')}>{formatCurrency(row.saldo)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop: tabela */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Mês</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Receita</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Despesa</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Saldo</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Meta economia</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, i) => {
                    const m = months[i];
                    const status = getMonthStatus(m ?? {});
                    return (
                      <tr key={row.monthKey} className="border-b border-gray-50">
                        <td className="py-2 px-2 font-medium">{row.month}</td>
                        <td className="py-2 px-2 text-right text-[hsl(150,60%,40%)]">{formatCurrency(row.receita)}</td>
                        <td className="py-2 px-2 text-right text-red-600">{formatCurrency(row.despesa)}</td>
                        <td className={cn(
                          'py-2 px-2 text-right font-medium',
                          row.saldo >= 0 ? 'text-[hsl(210,80%,45%)]' : 'text-red-600'
                        )}>
                          {formatCurrency(row.saldo)}
                        </td>
                        <td className="py-2 px-2 text-right text-muted-foreground">
                          {formatCurrency(m?.savings_goal ?? 0)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {savingsGoals.length > 0 && (
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <CardHeader>
              <CardTitle className="text-base">Metas de economia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {savingsGoals.map((goal, i) => {
                const target = goal.target ?? 0;
                const current = goal.current ?? 0;
                const pct = target > 0 ? Math.min(100, (current / target) * 100) : (goal.pct ?? 0);
                return (
                  <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" title={goal.icon ?? ''}>{goal.icon ?? '🎯'}</span>
                        <span className="font-medium">{goal.name ?? 'Meta'}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(current)} / {formatCurrency(target)}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    {goal.deadline && (
                      <p className="text-xs text-muted-foreground">
                        Prazo: {format(new Date(goal.deadline), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default PlanejamentoAnual;
