import React, { useState, useMemo, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
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
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeaderMetricCard } from '@/components/shared/HeaderMetricCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, RefreshCw } from 'lucide-react';
import { useAnnualOverview } from '@/hooks/useAnnualOverview';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { GoalCard } from '@/design-system/components/GoalCard';
import { ErrorCard } from '@/design-system/components/ErrorCard';
import { toast } from 'sonner';
import { usePlanejamentoAnual, useCloseMonth } from '@/hooks/planejamento/usePlanejamentoAnual';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNavigate, useSearchParams } from 'react-router-dom';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const PlanejamentoAnualVisaoGeral: React.FC = () => {
  const isMobile = useIsMobile();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, isLoading, error, refetch } = useAnnualOverview(year);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get('highlight');

  const {
    data: planejamentoAnual,
    isLoading: planejamentoLoading,
    error: planejamentoError,
  } = usePlanejamentoAnual(year);

  const closeMonth = useCloseMonth();
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeDialogMonth, setCloseDialogMonth] = useState<string | null>(null);

  const [highlightPulseMonth, setHighlightPulseMonth] = useState<string | null>(null);

  const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (!highlight) return;
    setHighlightPulseMonth(highlight);

    const pulseId = window.setTimeout(() => setHighlightPulseMonth(null), 2000);
    const scrollId = window.setTimeout(() => {
      const el = document.getElementById(`planejamento-anual-month-${highlight}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);

    return () => {
      window.clearTimeout(pulseId);
      window.clearTimeout(scrollId);
    };
  }, [highlight, planejamentoLoading]);

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

  if (isLoading || planejamentoLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
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

      {(error || planejamentoError) && (
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
                  <YAxis hide={isMobile} tick={{ fontSize: 12 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
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

      <Card className="rounded-xl border border-border bg-card p-6">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Resumo dos 12 meses</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-0">
          <div className="overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            <div className="flex md:grid md:grid-cols-4 md:grid-rows-3 gap-3 min-w-max md:min-w-0">
              {chartData.map((row, i) => {
                const plan = planejamentoAnual?.[i];
                const hasData = plan?.has_data ?? false;
                const hasPlanning = plan?.has_planning ?? false;
                const realizadoReceita = (plan?.realizado_receita ?? row.receita) as number;
                const realizadoDespesaExtrato = (plan?.realizado_despesa_extrato ?? 0) as number;
                const realizadoCartao = (plan?.realizado_cartao ?? 0) as number;
                const realizadoDespesaTotal = realizadoDespesaExtrato + realizadoCartao;
                const saldoRealizado = (plan?.saldo_realizado ?? row.saldo) as number;

                const status = hasData
                  ? {
                      label: saldoRealizado >= 0 ? 'Realizado' : 'Realizado',
                      variant: 'default' as const,
                      border: saldoRealizado >= 0 ? 'income' : 'expense',
                    }
                  : { label: '—', variant: 'secondary' as const, border: 'muted' as const };

                const isHighlighted = highlightPulseMonth === row.monthKey;
                const shouldShowClose = hasData && row.monthKey <= currentMonthKey && !closeMonth.isPending;

                return (
                  <div
                    id={`planejamento-anual-month-${row.monthKey}`}
                    key={row.monthKey}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/planejamento-mensal?mes=${row.monthKey}`)}
                    className={cn(
                      'rounded-xl border border-border bg-card p-3 min-w-[140px] md:min-w-0 shrink-0 cursor-pointer select-none transition-transform',
                      isHighlighted && 'ring-2 ring-primary animate-pulse',
                      status.border === 'income' && 'border-l-4 border-l-income',
                      status.border === 'warning' && 'border-l-4 border-l-warning',
                      status.border === 'expense' && 'border-l-4 border-l-expense',
                      status.border === 'muted' && 'border-l-4 border-l-muted'
                    )}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        navigate(`/planejamento-mensal?mes=${row.monthKey}`);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-foreground">{row.month}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={status.variant as 'default' | 'secondary' | 'destructive' | 'outline'}>{status.label}</Badge>
                        {hasData && !hasPlanning && (
                          <span
                            className="text-[10px] text-muted-foreground underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/planejamento-mensal');
                            }}
                            title="Configurar planejamento mensal"
                          >
                            Configurar
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs mt-1">
                      <span className="text-muted-foreground">Receita</span>
                      <span className={cn('text-right', hasData ? 'text-income' : 'text-muted-foreground')}>{hasData ? formatCurrency(realizadoReceita) : '—'}</span>
                      <span className="text-muted-foreground">Despesa</span>
                      <span className={cn('text-right', hasData ? 'text-expense' : 'text-muted-foreground')}>{hasData ? formatCurrency(realizadoDespesaTotal) : '—'}</span>
                      {hasData && (months[i]?.expense_cartao ?? 0) > 0 && (
                        <>
                          <span className="text-muted-foreground text-[10px] pl-2">↳ Cartão</span>
                          <span className="text-right text-[10px] text-muted-foreground">
                            {formatCurrency(months[i]?.expense_cartao ?? 0)}
                          </span>
                        </>
                      )}
                      <span className="text-muted-foreground">Saldo</span>
                      <span
                        className={cn(
                          'text-right font-medium',
                          hasData ? (saldoRealizado >= 0 ? 'text-income' : 'text-expense') : 'text-muted-foreground'
                        )}
                      >
                        {hasData ? formatCurrency(saldoRealizado) : '—'}
                      </span>
                    </div>

                    {hasData && (
                      <div className="mt-2 flex items-center justify-end">
                        {shouldShowClose && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCloseDialogMonth(row.monthKey);
                              setCloseDialogOpen(true);
                            }}
                          >
                            Fechar mês
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {savingsGoals.length > 0 && (
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

      <AlertDialog
        open={closeDialogOpen}
        onOpenChange={(open) => {
          setCloseDialogOpen(open);
          if (!open) setCloseDialogMonth(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar mês</AlertDialogTitle>
            <AlertDialogDescription>
              {closeDialogMonth
                ? `Isso vai salvar o resumo de ${closeDialogMonth} no histórico anual.`
                : 'Confirme para fechar o mês.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!closeDialogMonth) return;
                try {
                  await closeMonth.mutateAsync({ month: closeDialogMonth });
                  toast.success('Mês fechado com sucesso!');
                  setCloseDialogOpen(false);
                  setCloseDialogMonth(null);
                } catch (e) {
                  console.error(e);
                  toast.error('Erro ao fechar mês');
                }
              }}
              disabled={closeMonth.isPending}
            >
              {closeMonth.isPending ? 'Fechando...' : 'Fechar mês'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlanejamentoAnualVisaoGeral;
