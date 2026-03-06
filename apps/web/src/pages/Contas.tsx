import React, { useState, useMemo } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, Receipt, CheckCircle2, Circle, RefreshCw } from 'lucide-react';
import { useMonthlyConsolidation } from '@/hooks/useMonthlyConsolidation';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

const MONTH_FORMAT = 'yyyy-MM';

const Contas: React.FC = () => {
  const [month, setMonth] = useState(() => format(new Date(), MONTH_FORMAT));
  const { data, isLoading, error, refetch } = useMonthlyConsolidation(month);

  const totals = data?.totals;
  const incomeItems = data?.income_items ?? [];
  const expenseItems = data?.expense_items ?? [];
  const pendingCount = totals?.pending_payments ?? 0;

  const plannedIncome = totals?.planned_income ?? 0;
  const realizedIncome = totals?.realized_income ?? 0;
  const plannedExpense = totals?.planned_expense ?? 0;
  const realizedExpense = totals?.realized_expense ?? 0;
  const projectedBalance = plannedIncome - plannedExpense;
  const actualBalance = realizedIncome - realizedExpense;

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
      <AppLayout>
        <PageHeader title="Contas a Pagar e Receber" />
        <PageSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Contas a Pagar e Receber"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-income" />
                Receita Prevista
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-xl font-semibold text-income">{formatCurrency(plannedIncome)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Wallet className="h-4 w-4" />
                Receita Recebida
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-xl font-semibold">{formatCurrency(realizedIncome)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-expense" />
                Despesa Prevista
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-xl font-semibold text-expense">{formatCurrency(plannedExpense)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Receipt className="h-4 w-4" />
                Despesa Paga
              </CardTitle>
              {pendingCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {pendingCount} pendência{pendingCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-xl font-semibold text-expense">{formatCurrency(realizedExpense)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <CardHeader>
              <CardTitle className="text-base">Receitas</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              {incomeItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhuma receita neste mês.</p>
              ) : (
                <div className="space-y-2">
                  {incomeItems.map((item, i) => (
                    <div
                      key={item.id ?? i}
                      className={cn(
                        'flex items-center justify-between py-2 px-3 rounded-xl border border-border',
                        item.is_received && 'bg-income/10'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {item.is_received ? (
                          <CheckCircle2 className="h-4 w-4 text-income shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="font-medium">{item.name ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">{formatCurrency(item.planned ?? 0)}</span>
                        <span className="font-medium">{formatCurrency(item.realized ?? 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <CardHeader>
              <CardTitle className="text-base">Despesas</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              {expenseItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhuma despesa neste mês.</p>
              ) : (
                <div className="space-y-2">
                  {expenseItems.map((item, i) => (
                    <div
                      key={item.id ?? i}
                      className={cn(
                        'flex items-center justify-between py-2 px-3 rounded-xl border border-border',
                        item.is_paid && 'bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {item.is_paid ? (
                          <CheckCircle2 className="h-4 w-4 text-income shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="font-medium truncate block">{item.name ?? '—'}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.category ?? '—'}
                            {item.due_date && ` · Venc. ${format(new Date(item.due_date), 'dd/MM')}`}
                          </span>
                        </div>
                        {item.is_recurring && (
                          <Badge variant="outline" className="text-xs shrink-0">Recorrente</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm shrink-0">
                        <span className="text-muted-foreground">{formatCurrency(item.planned ?? 0)}</span>
                        <span className="font-medium text-expense">{formatCurrency(item.realized ?? 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card rounded-2xl shadow-sm border border-border p-6">
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Saldo projetado</p>
                <p className={cn(
                  'text-lg font-semibold',
                  projectedBalance >= 0 ? 'text-income' : 'text-expense'
                )}>
                  {formatCurrency(projectedBalance)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo real</p>
                <p className={cn(
                  'text-lg font-semibold',
                  actualBalance >= 0 ? 'text-income' : 'text-expense'
                )}>
                  {formatCurrency(actualBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Contas;
