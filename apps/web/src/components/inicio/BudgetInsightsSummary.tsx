import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { useFinancial } from '@/contexts/FinancialContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useContasPagarReceber } from '@/hooks/useContasPagarReceber';
import { useCreditCardTransactions } from '@/hooks/useCreditCardTransactions';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Sparkles, 
  AlertTriangle, 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  CreditCard,
  RefreshCw,
  ChevronRight,
  PiggyBank,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MonthStartSummary {
  title: string;
  preCommittedAmount: number;
  preCommittedPercentage: number;
  analysis: string;
  trend: 'up' | 'down' | 'stable';
  trendDescription: string;
}

interface Concern {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  category?: string;
}

interface Opportunity {
  title: string;
  description: string;
  potentialSaving?: number | null;
  category?: string;
}

interface CreditCardInsight {
  analysis: string;
  recommendation: string;
}

interface MonthlyComparison {
  trend: 'improving' | 'worsening' | 'stable';
  analysis: string;
  keyChanges: string[];
}

interface BudgetInsights {
  monthStartSummary: MonthStartSummary;
  concerns: Concern[];
  opportunities: Opportunity[];
  creditCardInsight: CreditCardInsight;
  monthlyComparison: MonthlyComparison;
  quickTip: string;
}

export const BudgetInsightsSummary: React.FC = () => {
  const { config, getMonthlyEntry } = useFinancial();
  const { isHidden } = useVisibility();
  const { contas } = useContasPagarReceber();
  const { transactions } = useCreditCardTransactions();
  
  const [insights, setInsights] = useState<BudgetInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const currentDate = new Date();
  const currentMonth = format(currentDate, 'yyyy-MM');
  const previousMonth = format(subMonths(currentDate, 1), 'yyyy-MM');
  const twoMonthsAgo = format(subMonths(currentDate, 2), 'yyyy-MM');

  // Get enabled items
  const enabledExpenseItems = useMemo(() => 
    config.expenseItems.filter(item => item.enabled), 
    [config.expenseItems]
  );

  const enabledIncomeItems = useMemo(() => 
    config.incomeItems.filter(item => item.enabled), 
    [config.incomeItems]
  );

  // Calculate financial data for AI
  const financialData = useMemo(() => {
    const safeNumber = (val: number | undefined | null): number => val ?? 0;

    const recurringExpenses = enabledExpenseItems
      .filter(item => item.isRecurring)
      .map(item => {
        const value = getMonthlyEntry(currentMonth, item.id, 'expense');
        return {
          name: item.name,
          category: item.category,
          value: safeNumber(value) || safeNumber(item.defaultValue),
          paymentMethod: item.paymentMethod || 'other'
        };
      });

    const currentMonthContas = contas.filter(c => 
      c.dataVencimento.startsWith(currentMonth) && 
      c.tipoCobranca === 'parcelada' &&
      c.tipo === 'pagar'
    );

    const installments = currentMonthContas.map(c => ({
      name: c.nome,
      value: safeNumber(c.valor),
      currentInstallment: c.parcelaAtual || 1,
      totalInstallments: c.totalParcelas || 1
    }));

    const creditCardTransactions = transactions.filter(t => 
      t.transaction_date.startsWith(currentMonth)
    );
    const creditCardTotal = creditCardTransactions.reduce((sum, t) => sum + safeNumber(t.value), 0);

    const monthlyBudget = enabledExpenseItems.reduce((sum, item) => {
      const entry = getMonthlyEntry(currentMonth, item.id, 'expense');
      return sum + (safeNumber(entry) || safeNumber(item.defaultValue));
    }, 0);

    const prevMonthExpenses = enabledExpenseItems.reduce((sum, item) => {
      const entry = getMonthlyEntry(previousMonth, item.id, 'expense');
      return sum + (safeNumber(entry) || safeNumber(item.defaultValue));
    }, 0);
    const prevMonthIncome = enabledIncomeItems.reduce((sum, item) => {
      const entry = getMonthlyEntry(previousMonth, item.id, 'income');
      return sum + (safeNumber(entry) || safeNumber(item.defaultValue));
    }, 0);
    const prevSavingsRate = prevMonthIncome > 0 
      ? ((prevMonthIncome - prevMonthExpenses) / prevMonthIncome) * 100 
      : 0;

    const twoMonthsAgoExpenses = enabledExpenseItems.reduce((sum, item) => {
      const entry = getMonthlyEntry(twoMonthsAgo, item.id, 'expense');
      return sum + (safeNumber(entry) || safeNumber(item.defaultValue));
    }, 0);
    const twoMonthsAgoIncome = enabledIncomeItems.reduce((sum, item) => {
      const entry = getMonthlyEntry(twoMonthsAgo, item.id, 'income');
      return sum + (safeNumber(entry) || safeNumber(item.defaultValue));
    }, 0);
    const twoMonthsSavingsRate = twoMonthsAgoIncome > 0 
      ? ((twoMonthsAgoIncome - twoMonthsAgoExpenses) / twoMonthsAgoIncome) * 100 
      : 0;

    const categoryTotals: Record<string, { projected: number; prev: number; twoMonths: number }> = {};
    enabledExpenseItems.forEach(item => {
      if (!categoryTotals[item.category]) {
        categoryTotals[item.category] = { projected: 0, prev: 0, twoMonths: 0 };
      }
      const currentEntry = getMonthlyEntry(currentMonth, item.id, 'expense');
      const prevEntry = getMonthlyEntry(previousMonth, item.id, 'expense');
      const twoMonthsEntry = getMonthlyEntry(twoMonthsAgo, item.id, 'expense');
      
      categoryTotals[item.category].projected += safeNumber(currentEntry) || safeNumber(item.defaultValue);
      categoryTotals[item.category].prev += safeNumber(prevEntry) || safeNumber(item.defaultValue);
      categoryTotals[item.category].twoMonths += safeNumber(twoMonthsEntry) || safeNumber(item.defaultValue);
    });

    const categoryBreakdown = Object.entries(categoryTotals).map(([category, totals]) => ({
      category,
      projected: totals.projected,
      previousMonth: totals.prev,
      twoMonthsAgo: totals.twoMonths
    }));

    const incomeProjected = enabledIncomeItems.reduce((sum, item) => {
      const entry = getMonthlyEntry(currentMonth, item.id, 'income');
      return sum + (safeNumber(entry) || safeNumber(item.defaultValue));
    }, 0);

    return {
      currentMonth,
      recurringExpenses,
      installments,
      creditCardTotal,
      monthlyBudget,
      previousMonthData: {
        totalExpenses: prevMonthExpenses,
        totalIncome: prevMonthIncome,
        savingsRate: prevSavingsRate
      },
      twoMonthsAgoData: {
        totalExpenses: twoMonthsAgoExpenses,
        totalIncome: twoMonthsAgoIncome,
        savingsRate: twoMonthsSavingsRate
      },
      categoryBreakdown,
      incomeProjected
    };
  }, [enabledExpenseItems, enabledIncomeItems, contas, transactions, currentMonth, previousMonth, twoMonthsAgo, getMonthlyEntry]);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('budget-insights', {
        body: financialData
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setInsights(data);
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar insights');
      toast.error('Erro ao gerar insights. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabledExpenseItems.length > 0 && !insights && !loading) {
      fetchInsights();
    }
  }, [enabledExpenseItems.length]);

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-expense bg-expense/10 border-expense/30';
      case 'medium': return 'text-warning bg-warning/10 border-warning/30';
      case 'low': return 'text-muted-foreground bg-muted border-border';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': 
      case 'worsening':
        return <TrendingUp className="h-4 w-4 text-expense" />;
      case 'down':
      case 'improving':
        return <TrendingDown className="h-4 w-4 text-income" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (enabledExpenseItems.length === 0) {
    return null;
  }

  // Counts for summary
  const concernsCount = insights?.concerns?.length || 0;
  const opportunitiesCount = insights?.opportunities?.length || 0;

  return (
    <>
      {/* Compact Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Card 
          className="border-primary/20 bg-gradient-to-br from-primary/5 to-background cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group"
          onClick={() => setDialogOpen(true)}
        >
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">Insights do Mês</h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {format(currentDate, 'MMM', { locale: ptBR })}
                  </Badge>
                </div>
                {loading ? (
                  <Skeleton className="h-4 w-full" />
                ) : error ? (
                  <p className="text-xs text-muted-foreground">Erro ao carregar. Clique para tentar novamente.</p>
                ) : insights ? (
                  <>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {insights.quickTip}
                    </p>
                    <p className="text-xs text-primary mt-2 group-hover:underline">
                      Clique para saber mais →
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Gerando análise...</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Full Insights Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <DialogTitle className="text-lg">Insights do Mês</DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchInsights();
                  }}
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </div>
            </div>
            <DialogDescription>
              Análise inteligente do seu orçamento
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : error ? (
                <div className="text-center py-6">
                  <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={fetchInsights}>
                    Tentar novamente
                  </Button>
                </div>
              ) : insights ? (
                <>
                  {/* Month Start Summary */}
                  <Card className="bg-card/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">{insights.monthStartSummary.title}</h4>
                            <div className="flex items-center gap-1">
                              {getTrendIcon(insights.monthStartSummary.trend)}
                            </div>
                          </div>
                          <p className="text-2xl font-bold mt-1">
                            {formatCurrency(insights.monthStartSummary.preCommittedAmount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {insights.monthStartSummary.preCommittedPercentage}% do orçamento já comprometido
                          </p>
                          <p className="text-sm mt-2 text-muted-foreground">
                            {insights.monthStartSummary.analysis}
                          </p>
                          {insights.monthStartSummary.trendDescription && (
                            <p className="text-xs text-primary mt-1">
                              {insights.monthStartSummary.trendDescription}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Tip */}
                  {insights.quickTip && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-income/10 border border-income/20">
                      <Lightbulb className="h-4 w-4 text-income shrink-0 mt-0.5" />
                      <p className="text-sm">{insights.quickTip}</p>
                    </div>
                  )}

                  {/* Credit Card Insight */}
                  <Card className="bg-card/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-expense/10">
                          <CreditCard className="h-5 w-5 text-expense" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">Cartão de Crédito</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {insights.creditCardInsight.analysis}
                          </p>
                          <p className="text-xs text-primary mt-2">
                            💡 {insights.creditCardInsight.recommendation}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Monthly Comparison */}
                  <Card className="bg-card/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {getTrendIcon(insights.monthlyComparison.trend)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">Evolução Mensal</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {insights.monthlyComparison.analysis}
                          </p>
                          {insights.monthlyComparison.keyChanges.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {insights.monthlyComparison.keyChanges.map((change, idx) => (
                                <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span className="text-primary">•</span> {change}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Concerns */}
                  {insights.concerns.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        Pontos de Atenção
                      </h4>
                      <div className="space-y-2">
                        {insights.concerns.map((concern, idx) => (
                          <div 
                            key={idx} 
                            className={cn(
                              "p-3 rounded-lg border",
                              getSeverityColor(concern.severity)
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{concern.title}</span>
                              {concern.category && (
                                <Badge variant="outline" className="text-xs">
                                  {concern.category}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs mt-1 opacity-80">{concern.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Opportunities */}
                  {insights.opportunities.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <PiggyBank className="h-4 w-4 text-income" />
                        Oportunidades
                      </h4>
                      <div className="space-y-2">
                        {insights.opportunities.map((opp, idx) => (
                          <div 
                            key={idx} 
                            className="p-3 rounded-lg border border-income/20 bg-income/5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{opp.title}</span>
                              {opp.potentialSaving && (
                                <Badge className="bg-income/20 text-income border-0">
                                  Economia: {formatCurrency(opp.potentialSaving)}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs mt-1 text-muted-foreground">{opp.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Clique em atualizar para gerar insights
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
