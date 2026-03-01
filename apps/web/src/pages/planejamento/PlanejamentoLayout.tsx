import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calculator, TrendingUp, TrendingDown, PiggyBank, Target, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';
import { useBudgetVsActual } from '@/hooks/useBudgetVsActual';
import { cn, formatCurrency } from '@/lib/utils';

const TABS = [
  { id: 'visao-mensal', label: 'Visão Mensal' },
  { id: 'metas', label: 'Metas do Mês' },
  { id: 'analises', label: 'Análises' },
] as const;

const VALID_TABS: string[] = TABS.map(t => t.id);

const PlanejamentoLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const { data: budgetData, error: budgetError } = useBudgetVsActual(currentMonth);

  const totals = (budgetData as { totals?: { income_goal?: number; expense_goal?: number; savings_goal?: number; total_income?: number; total_spent?: number } })?.totals;
  const incomeGoal = totals?.income_goal ?? budgetData?.income?.planned ?? 0;
  const totalIncome = totals?.total_income ?? budgetData?.income?.actual ?? 0;
  const expenseGoal = totals?.expense_goal ?? budgetData?.expenses?.planned ?? 0;
  const totalSpent = totals?.total_spent ?? budgetData?.expenses?.actual ?? 0;
  const savingsGoal = totals?.savings_goal ?? budgetData?.savings?.planned ?? 0;
  const savingsActual = budgetData?.savings?.actual ?? (totalIncome - totalSpent);
  const incomePct = incomeGoal > 0 ? Math.min(100, (totalIncome / incomeGoal) * 100) : 0;
  const expensePct = expenseGoal > 0 ? (totalSpent / expenseGoal) * 100 : 0;
  const savingsPct = savingsGoal > 0 ? Math.min(100, (savingsActual / savingsGoal) * 100) : 0;
  const sobraProjetada = totalIncome - expenseGoal;
  const sobraReal = totalIncome - totalSpent;

  const pathSegment = location.pathname.split('/').filter(Boolean).pop() || '';
  const currentTab = VALID_TABS.includes(pathSegment) ? pathSegment : '';

  // Redirect index to first tab
  useEffect(() => {
    if (!currentTab && (location.pathname === '/planejamento' || location.pathname === '/planejamento/')) {
      navigate('/planejamento/visao-mensal', { replace: true });
    }
  }, [currentTab, location.pathname, navigate]);

  // Backward compat: redirect ?tab= query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'cartao') {
      navigate('/cartao-credito', { replace: true });
    } else if (tabParam && VALID_TABS.includes(tabParam)) {
      navigate(`/planejamento/${tabParam}`, { replace: true });
    }
  }, [location.search, navigate]);

  const handleTabChange = (value: string) => {
    navigate(`/planejamento/${value}`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {budgetError && (
          <Card className="rounded-[14px] border-destructive/50 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{budgetError}</p>
          </Card>
        )}
        {budgetData != null && (incomeGoal > 0 || expenseGoal > 0 || savingsGoal > 0) && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="rounded-[14px] border border-border/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" /> Receitas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">Meta: {formatCurrency(incomeGoal)}</p>
                  <p className="text-lg font-semibold text-green-600">Realizado: {formatCurrency(totalIncome)}</p>
                  <Progress value={incomePct} className="h-2" />
                  {incomePct >= 100 ? <Badge className="bg-green-600">100% atingido</Badge> : <Badge variant="secondary">{(100 - incomePct).toFixed(0)}% faltando</Badge>}
                </CardContent>
              </Card>
              <Card className="rounded-[14px] border border-border/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" /> Despesas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">Meta: {formatCurrency(expenseGoal)}</p>
                  <p className="text-lg font-semibold text-red-600">Gasto: {formatCurrency(totalSpent)}</p>
                  <Progress value={Math.min(100, expensePct)} className={cn('h-2', expensePct > 100 && '[&>div]:bg-red-600')} />
                  {expensePct <= 100 ? <Badge className="bg-green-600">Dentro do orçamento</Badge> : <Badge variant="destructive">Estourou {(expensePct - 100).toFixed(0)}%</Badge>}
                </CardContent>
              </Card>
              <Card className="rounded-[14px] border border-border/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-primary" /> Poupança
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">Meta: {formatCurrency(savingsGoal)}</p>
                  <p className={cn('text-lg font-semibold', savingsActual >= 0 ? 'text-green-600' : 'text-red-600')}>Poupado: {formatCurrency(savingsActual)}</p>
                  <Progress value={savingsPct} className="h-2" />
                  {savingsActual >= savingsGoal ? <Badge className="bg-green-600">Meta atingida</Badge> : savingsActual >= 0 ? <Badge variant="secondary">{(100 - savingsPct).toFixed(0)}% faltando</Badge> : <Badge variant="destructive">Negativo</Badge>}
                </CardContent>
              </Card>
            </div>
            <Card className="rounded-[14px] border border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Resumo visual
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Sobra projetada</p>
                  <p className="font-semibold">{formatCurrency(sobraProjetada)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sobra real</p>
                  <p className={cn('font-semibold', sobraReal >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(sobraReal)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status da meta de poupança</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {savingsActual >= savingsGoal ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                    <span className="text-sm font-medium">{savingsActual >= savingsGoal ? 'Meta atingida' : savingsActual >= 0 ? 'Em progresso' : 'Abaixo do esperado'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <PageHeader
          title="Planejamento Mensal"
          description="Consolidado mensal de receitas e despesas"
          icon={<Calculator className="h-5 w-5 text-primary" />}
        >
          <VisibilityToggle />
          <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.planejamentoMensal} />
        </PageHeader>

        <Tabs value={currentTab || 'visao-mensal'} onValueChange={handleTabChange} className="mt-5">
          <TabsList>
            {TABS.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Outlet />
      </div>
    </AppLayout>
  );
};

export default PlanejamentoLayout;
