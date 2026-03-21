import React, { useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';
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
  Line,
  ComposedChart,
} from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, RefreshCw, BarChart2 } from 'lucide-react';
import { useDashboardEnhanced } from '@/hooks/useDashboardEnhanced';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

const MONTH_FORMAT = 'yyyy-MM';

const FluxoFinanceiro: React.FC = () => {
  const isMobile = useIsMobile();
  const [month, setMonth] = useState(() => format(new Date(), MONTH_FORMAT));
  const { data, isLoading, error, refetch } = useDashboardEnhanced(month);

  const summary = data?.month_summary;
  const income = summary?.income ?? 0;
  const expense = summary?.expense ?? 0;
  const balance = summary?.balance ?? income - expense;
  const lancamentos = (data?.lancamentos ?? []) as Array<{ date?: string; nome?: string; valor?: number; tipo?: string }>;
  const last10 = lancamentos.slice(0, 10);

  const chartData = useMemo(() => {
    const start = startOfMonth(new Date(month + '-01'));
    const end = endOfMonth(start);
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 });
    return weeks.map((w) => {
      const wStart = startOfWeek(w, { weekStartsOn: 0 });
      const wEnd = endOfWeek(w, { weekStartsOn: 0 });
      const weekLabel = format(wStart, 'dd/MM', { locale: ptBR });
      let weekIncome = 0;
      let weekExpense = 0;
      lancamentos.forEach((l) => {
        if (!l.date) return;
        const d = new Date(l.date);
        if (d >= wStart && d <= wEnd) {
          if (l.tipo === 'receita') weekIncome += l.valor ?? 0;
          else weekExpense += l.valor ?? 0;
        }
      });
      const weekBalance = weekIncome - weekExpense;
      return {
        week: weekLabel,
        receita: weekIncome,
        despesa: weekExpense,
        saldo: weekBalance,
        acumulado: 0,
      };
    }).map((row, i, arr) => {
      let acc = 0;
      for (let j = 0; j <= i; j++) acc += arr[j].saldo;
      return { ...row, acumulado: acc };
    });
  }, [month, lancamentos]);

  const monthLabel = useMemo(() => {
    try {
      const d = new Date(month + '-01');
      return format(d, 'MMMM yyyy', { locale: ptBR });
    } catch {
      return month;
    }
  }, [month]);

  const prevMonth = () => setMonth((m) => format(subMonths(new Date(m + '-01'), 1), MONTH_FORMAT));
  const nextMonth = () => setMonth((m) => format(addMonths(new Date(m + '-01'), 1), MONTH_FORMAT));

  if (isLoading) {
    return (
      <>
        <PageHeader icon={BarChart2} title="Fluxo Financeiro" subtitle="Receitas, despesas e saldo do mês" />
        <PageSkeleton />
      </>
    );
  }

  return (
    
      <div className="space-y-6">
        <PageHeader
          icon={BarChart2}
          title="Fluxo Financeiro"
          subtitle="Receitas, despesas e saldo do mês"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevMonth} aria-label="Mês anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[160px] text-center font-medium capitalize">{monthLabel}</span>
              <Button variant="outline" size="sm" onClick={nextMonth} aria-label="Próximo mês">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Atualizar">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          }
        />

        {error && (
          <Card className="bg-card rounded-2xl shadow-sm border border-border p-6 border-destructive/50 bg-destructive/5">
            <p className="text-sm text-destructive mb-3">{String(error)}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-income" />
                Entrada total
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-xl font-semibold text-income">{formatCurrency(income)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-expense" />
                Saída total
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-xl font-semibold text-expense">{formatCurrency(expense)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Minus className="h-4 w-4" />
                Fluxo líquido
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className={cn(
                'text-xl font-semibold',
                balance >= 0 ? 'text-[hsl(210,80%,45%)]' : 'text-expense'
              )}>
                {formatCurrency(balance)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card rounded-2xl shadow-sm border border-border p-6">
          <CardHeader>
            <CardTitle className="text-base">Receitas e despesas por semana</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados para exibir no gráfico.</p>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis hide={isMobile} tick={{ fontSize: 12 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Semana ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="receita" name="Receita" fill="hsl(150,60%,40%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesa" name="Despesa" fill="rgb(220, 38, 38)" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="acumulado" name="Fluxo acumulado" stroke="hsl(210,80%,45%)" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card rounded-2xl shadow-sm border border-border p-6">
          <CardHeader>
            <CardTitle className="text-base">Últimos 10 lançamentos</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-0">
            {last10.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhum lançamento neste mês.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Data</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Nome</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Valor</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {last10.map((l, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="py-2 px-2">{l.date ? format(new Date(l.date), 'dd/MM/yyyy') : '—'}</td>
                        <td className="py-2 px-2 font-medium">{l.nome ?? '—'}</td>
                        <td className={cn(
                          'py-2 px-2 text-right font-medium',
                          l.tipo === 'receita' ? 'text-income' : 'text-expense'
                        )}>
                          {formatCurrency(l.valor ?? 0)}
                        </td>
                        <td className="py-2 px-2 capitalize">{l.tipo === 'receita' ? 'Receita' : 'Despesa'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    
  );
};

export default FluxoFinanceiro;
