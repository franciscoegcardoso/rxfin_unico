import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAuth } from '@/contexts/AuthContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useFeaturePreferences } from '@/hooks/useFeaturePreferences';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useOnboardingCheckpoint } from '@/hooks/useOnboardingCheckpoint';
import { supabase } from '@/integrations/supabase/client';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Target,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { BudgetInsightsSummary } from '@/components/inicio/BudgetInsightsSummary';
import { PackagesSummaryCard } from '@/components/inicio/PackagesSummaryCard';
import { InsuranceExpirationAlerts } from '@/components/inicio/InsuranceExpirationAlerts';
import { MobileHomeHero } from '@/components/inicio/MobileHomeHero';
import { OnboardingInsightCard } from '@/components/inicio/OnboardingInsightCard';
import { ControlOnboardingBanner } from '@/components/shared/ControlOnboardingBanner';
import {
  MonthSummaryCard,
  ExpensesStatusCard,
  CreditCardSpendingCard,
  BudgetCompositionCard,
  PendingCategorizationCard,
} from '@/components/inicio/MobileHomeSections';
import { UpcomingEventsCard } from '@/components/inicio/UpcomingEventsCard';
import { EconomicIndicators } from '@/components/dashboard/EconomicIndicators';
import { useMonthlyGoals } from '@/hooks/useMonthlyGoals';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { isBillPaymentTransaction } from '@/hooks/useBillPaymentReconciliation';

// Componente de Categoria com Meta
const CategoryGoalItem: React.FC<{
  category: string;
  spent: number;
  goal: number;
  isHidden: boolean;
}> = ({ category, spent, goal, isHidden }) => {
  const percentage = goal > 0 ? Math.min((spent / goal) * 100, 100) : 0;
  const isOverBudget = spent > goal;
  
  const formatCurrency = (value: number) => {
    if (isHidden) return '••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const pctLabel = goal > 0 ? `${Math.round((spent / goal) * 100)}%` : '0%';

  return (
    <div className="space-y-1.5 p-3.5 rounded-[14px] bg-muted/20 border border-border/50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{category}</span>
        <span
          className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-md shrink-0",
            isOverBudget ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
          )}
        >
          {pctLabel}
        </span>
      </div>
      <Progress
        value={percentage}
        className={cn(
          "h-2 w-full overflow-hidden rounded-full bg-muted [&>div]:rounded-full [&>div]:transition-transform",
          isOverBudget ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"
        )}
      />
      <p className="text-xs text-muted-foreground">
        {formatCurrency(spent)} / {formatCurrency(goal)}
      </p>
    </div>
  );
};

/** Wrapper for cards; demo mode only affects banner, no blur/overlay (data comes from real demo account). */
const DemoCardWrapper: React.FC<{ isDemoMode: boolean; children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return <div className={cn(className)}>{children}</div>;
};

const Inicio: React.FC = () => {
  const { config } = useFinancial();
  const { user } = useAuth();
  const { isHidden } = useVisibility();
  const { isFeatureEnabled } = useFeaturePreferences();
  const { isDemoMode } = useDemoMode();
  const { currentPhase, controlDone } = useOnboardingCheckpoint();
  const showControlBanner = currentPhase === 'completed' && !controlDone;
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [firstName, setFirstName] = useState<string>('');
  
  // Hooks para metas mensais e lançamentos realizados
  const { goals: monthlyGoals, getGoalByMonth } = useMonthlyGoals();
  const { lancamentos } = useLancamentosRealizados();
  
  // Feature flags
  const showMetasMensais = isFeatureEnabled('metas-mensais');

  // Busca nome do usuário
  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) {
        setFirstName('');
        return;
      }

      const metaName = user.user_metadata?.full_name;
      if (metaName) {
        setFirstName(metaName.split(' ')[0]);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (data?.full_name) {
        setFirstName(data.full_name.split(' ')[0]);
      } else {
        setFirstName(user.email?.split('@')[0] || 'Usuário');
      }
    };

    fetchUserName();
  }, [user]);

  // Categorias com metas
  const categoryGoals = useMemo(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const currentGoal = getGoalByMonth(currentMonth);
    
    const monthExpenses = lancamentos.filter(l => 
      l.tipo === 'despesa' && 
      l.mes_referencia === currentMonth &&
      !isBillPaymentTransaction(l)
    );
    
    const spentByCategory = monthExpenses.reduce((acc, l) => {
      const category = l.categoria || 'Outros';
      acc[category] = (acc[category] || 0) + (l.valor_realizado ?? l.valor_previsto ?? 0);
      return acc;
    }, {} as Record<string, number>);
    
    if (currentGoal && currentGoal.item_goals && Object.keys(currentGoal.item_goals).length > 0) {
      const enabledExpenses = config.expenseItems.filter(e => e.enabled);
      
      const goalsByCategory = enabledExpenses.reduce((acc, expense) => {
        const category = expense.category || 'Outros';
        const itemGoal = currentGoal.item_goals[expense.id];
        const goalValue = itemGoal?.goal ?? expense.defaultValue;
        
        if (!acc[category]) acc[category] = 0;
        acc[category] += goalValue;
        return acc;
      }, {} as Record<string, number>);
      
      return Object.entries(goalsByCategory).map(([category, goal]) => ({
        category,
        goal,
        spent: spentByCategory[category] || 0,
      }));
    }
    
    const enabledExpenses = config.expenseItems.filter(e => e.enabled);
    const groupedByCategory = enabledExpenses.reduce((acc, expense) => {
      const category = expense.category || 'Outros';
      if (!acc[category]) acc[category] = { goal: 0 };
      acc[category].goal += expense.defaultValue;
      return acc;
    }, {} as Record<string, { goal: number }>);
    
    return Object.entries(groupedByCategory).map(([category, values]) => ({
      category,
      goal: values.goal,
      spent: spentByCategory[category] || 0,
    }));
  }, [config.expenseItems, getGoalByMonth, lancamentos]);

  // Saldo líquido do mês
  const saldoLiquido = useMemo(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const monthItems = lancamentos.filter(l => l.mes_referencia === currentMonth && !isBillPaymentTransaction(l));
    const receitas = monthItems.filter(l => l.tipo === 'receita').reduce((s, l) => s + (l.valor_realizado ?? l.valor_previsto ?? 0), 0);
    const despesas = monthItems.filter(l => l.tipo === 'despesa').reduce((s, l) => s + (l.valor_realizado ?? l.valor_previsto ?? 0), 0);
    return receitas - despesas;
  }, [lancamentos]);

  const formatCurrencyFull = (value: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // ─── Mobile layout ────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="space-y-4">
          <MobileHomeHero firstName={firstName} saldoLiquido={saldoLiquido} />

          {/* Onboarding Insight (replaces legacy checklist) */}
          {isDemoMode && <OnboardingInsightCard />}
          {showControlBanner && <ControlOnboardingBanner />}

          <InsuranceExpirationAlerts />
          <UpcomingEventsCard />

          <DemoCardWrapper isDemoMode={isDemoMode}>
            <MonthSummaryCard />
          </DemoCardWrapper>
          <DemoCardWrapper isDemoMode={isDemoMode}>
            <ExpensesStatusCard />
          </DemoCardWrapper>
          <DemoCardWrapper isDemoMode={isDemoMode}>
            <CreditCardSpendingCard />
          </DemoCardWrapper>
          <DemoCardWrapper isDemoMode={isDemoMode}>
            <BudgetCompositionCard />
          </DemoCardWrapper>
          <DemoCardWrapper isDemoMode={isDemoMode}>
            <PendingCategorizationCard />
          </DemoCardWrapper>

          {!isDemoMode && <EconomicIndicators />}

          <BudgetInsightsSummary />
        </div>
    );
  }

  // ─── Desktop / Tablet layout ──────────────────────────────
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarImage src={avatarUrl} alt={firstName} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {getInitials(firstName || 'U')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Bom dia, {firstName || 'Usuário'}! 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Saldo Líquido do Mês:{' '}
                <span className="font-semibold text-primary">
                  {formatCurrencyFull(saldoLiquido)}
                </span>
              </p>
            </div>
          </div>
          <VisibilityToggle />
        </motion.div>

        {/* Onboarding Insight (replaces legacy checklist) */}
        {isDemoMode && <OnboardingInsightCard />}
        {showControlBanner && <ControlOnboardingBanner />}

        <InsuranceExpirationAlerts />
        <UpcomingEventsCard />
        <PackagesSummaryCard />

        {/* Main content grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <DemoCardWrapper isDemoMode={isDemoMode}>
            <MonthSummaryCard />
          </DemoCardWrapper>
          <DemoCardWrapper isDemoMode={isDemoMode}>
            <ExpensesStatusCard />
          </DemoCardWrapper>
          <DemoCardWrapper isDemoMode={isDemoMode}>
            <CreditCardSpendingCard />
          </DemoCardWrapper>
        </div>

        <div className={cn(
          "grid gap-4 mb-6",
          showMetasMensais ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
        )}>
          {showMetasMensais && (
            <DemoCardWrapper isDemoMode={isDemoMode}>
              <Card>
                <CardHeader className="pb-3 p-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Gasto vs Meta por Categoria
                    </CardTitle>
                    <button
                      onClick={() => navigate('/planejamento?tab=metas')}
                      className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      Editar metas
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-3 flex flex-col">
                  {categoryGoals.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[240px] min-h-0">
                        {categoryGoals.map((item) => (
                          <CategoryGoalItem
                            key={item.category}
                            category={item.category}
                            spent={item.spent}
                            goal={item.goal}
                            isHidden={isHidden}
                          />
                        ))}
                      </div>
                      {(() => {
                        const withGoal = categoryGoals.filter((g) => typeof g.goal === 'number' && !Number.isNaN(g.goal) && g.goal > 0);
                        const withinGoal = withGoal.filter((g) => g.spent <= g.goal).length;
                        const totalSpent = categoryGoals.reduce((s, g) => s + g.spent, 0);
                        const totalGoal = categoryGoals.reduce((s, g) => s + (typeof g.goal === 'number' && !Number.isNaN(g.goal) ? g.goal : 0), 0);
                        if (withGoal.length === 0) return null;
                        return (
                          <div className="pt-3 border-t border-border shrink-0">
                            <p className="text-xs text-muted-foreground">
                              {withinGoal} de {withGoal.length} categorias dentro da meta
                              {totalGoal > 0 && !isHidden && (
                                <span className="ml-1.5 tabular-nums">
                                  · Total {formatCurrency(totalSpent)} / {formatCurrency(totalGoal)}
                                </span>
                              )}
                            </p>
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma categoria configurada. Configure em Parâmetros.
                    </p>
                  )}
                </CardContent>
              </Card>
            </DemoCardWrapper>
          )}

          <DemoCardWrapper isDemoMode={isDemoMode}>
            <BudgetCompositionCard />
          </DemoCardWrapper>
        </div>

        <DemoCardWrapper isDemoMode={isDemoMode}>
          <PendingCategorizationCard />
        </DemoCardWrapper>

        {!isDemoMode && <EconomicIndicators />}

        <BudgetInsightsSummary />
      </div>
  );
};

export default Inicio;
