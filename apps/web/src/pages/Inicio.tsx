import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAuth } from '@/contexts/AuthContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useTour } from '@/contexts/TourContext';
import { useFeaturePreferences } from '@/hooks/useFeaturePreferences';
import { supabase } from '@/integrations/supabase/client';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CheckCircle2, 
  Circle, 
  CircleDot,
  Settings,
  CreditCard,
  FileText,
  Building2,
  Link2,
  CalendarRange,
  Target,
  Star,
  ChevronRight,
  Wallet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { BudgetInsightsSummary } from '@/components/inicio/BudgetInsightsSummary';
import { PackagesSummaryCard } from '@/components/inicio/PackagesSummaryCard';
import { OnboardingStepsDialog } from '@/components/inicio/OnboardingStepsDialog';
import { InsuranceExpirationAlerts } from '@/components/inicio/InsuranceExpirationAlerts';
import { MobileHomeHero } from '@/components/inicio/MobileHomeHero';
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

// Interface para steps do onboarding
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  status: 'done' | 'partial' | 'pending';
  path: string;
  icon: React.ReactNode;
}

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

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{category}</span>
        <span className={cn(
          "text-xs",
          isOverBudget ? "text-expense" : "text-muted-foreground"
        )}>
          {formatCurrency(spent)} / {formatCurrency(goal)}
        </span>
      </div>
      <Progress 
        value={percentage} 
        className={cn("h-2", isOverBudget && "[&>div]:bg-expense")}
      />
    </div>
  );
};

const Inicio: React.FC = () => {
  const { config } = useFinancial();
  const { user } = useAuth();
  const { isHidden } = useVisibility();
  const { hasCompletedTour, startTour } = useTour();
  const { isFeatureEnabled } = useFeaturePreferences();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [firstName, setFirstName] = useState<string>('');
  const [onboardingDialogOpen, setOnboardingDialogOpen] = useState(false);
  const [hasTriggeredTour, setHasTriggeredTour] = useState(false);
  
  // Hooks para metas mensais e lançamentos realizados
  const { goals: monthlyGoals, getGoalByMonth } = useMonthlyGoals();
  const { lancamentos } = useLancamentosRealizados();
  
  // Feature flags
  const showMetasMensais = isFeatureEnabled('metas-mensais');
  
  // Estado para dados do onboarding vindos do banco
  const [creditCardImportsCount, setCreditCardImportsCount] = useState(0);
  const [irImportsCount, setIrImportsCount] = useState(0);
  const [hasIrLinkedAssets, setHasIrLinkedAssets] = useState(false);
  const [hasBudgetGoals, setHasBudgetGoals] = useState(false);
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  const prevCompletedRef = useRef<number>(0);

  // Auto-start tour for new users after first load
  useEffect(() => {
    if (!hasCompletedTour && !hasTriggeredTour && user) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        startTour();
        setHasTriggeredTour(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour, hasTriggeredTour, startTour, user]);

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

  // Busca dados de onboarding do banco
  useEffect(() => {
    const fetchOnboardingData = async () => {
      if (!user) return;

      try {
        // Busca importações de cartão de crédito
        const { data: cardImports } = await supabase
          .from('credit_card_imports')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        setCreditCardImportsCount(cardImports?.length || 0);

        // Busca importações de IR
        const { data: irData } = await supabase
          .from('ir_imports')
          .select('id, bens_direitos')
          .limit(10);
        setIrImportsCount(irData?.length || 0);
        
        // Verifica se há bens vinculados ao IR (através de bens_direitos)
        const hasLinked = irData?.some(ir => {
          const bens = ir.bens_direitos as any[];
          return bens?.some(bem => bem.linkedAssetId);
        }) || false;
        setHasIrLinkedAssets(hasLinked);

        // Busca pacotes de orçamento com metas definidas
        const { data: packages } = await supabase
          .from('budget_packages')
          .select('id')
          .eq('user_id', user.id)
          .eq('has_budget_goal', true)
          .limit(1);
        setHasBudgetGoals((packages?.length || 0) > 0);
      } catch (error) {
        console.error('Error fetching onboarding data:', error);
      }
    };

    fetchOnboardingData();
  }, [user]);

  // Calcula status dos steps de onboarding
  const onboardingSteps = useMemo((): OnboardingStep[] => {
    const hasIncome = config.incomeItems.some(i => i.enabled);
    const hasExpenses = config.expenseItems.some(e => e.enabled);
    const hasInstitutions = config.financialInstitutions && config.financialInstitutions.length > 0;
    const hasAssets = config.assets && config.assets.length > 0;
    const hasGoals = config.goals && config.goals.length > 0;
    
    // Step 1: Configurar receitas, despesas e instituições
    let step1Status: 'done' | 'partial' | 'pending' = 'pending';
    if (hasIncome && hasExpenses && hasInstitutions) step1Status = 'done';
    else if (hasIncome || hasExpenses || hasInstitutions) step1Status = 'partial';

    // Step 2: Importar histórico de cartão
    let step2Status: 'done' | 'partial' | 'pending' = 'pending';
    if (creditCardImportsCount > 0) step2Status = 'done';

    // Step 3: Importar IR
    let step3Status: 'done' | 'partial' | 'pending' = 'pending';
    if (irImportsCount >= 3) step3Status = 'done';
    else if (irImportsCount > 0) step3Status = 'partial';

    // Step 4: Registro de bens
    let step4Status: 'done' | 'partial' | 'pending' = 'pending';
    if (hasAssets) step4Status = 'done';

    // Step 5: Vincular IR com patrimônio
    let step5Status: 'done' | 'partial' | 'pending' = 'pending';
    if (hasIrLinkedAssets) step5Status = 'done';
    else if (irImportsCount > 0 && hasAssets) step5Status = 'partial';

    // Step 6: Projeção do orçamento (baseado em monthlyEntries)
    let step6Status: 'done' | 'partial' | 'pending' = 'pending';
    if (config.monthlyEntries && config.monthlyEntries.length > 0) step6Status = 'done';

    // Step 7: Primeira meta mensal
    let step7Status: 'done' | 'partial' | 'pending' = 'pending';
    if (hasBudgetGoals) step7Status = 'done';

    // Step 8: Sonhos
    let step8Status: 'done' | 'partial' | 'pending' = 'pending';
    if (hasGoals) step8Status = 'done';

    return [
      {
        id: 'config',
        title: 'Configurar receitas e despesas',
        description: 'Defina suas fontes de renda e categorias de gastos',
        status: step1Status,
        path: '/parametros',
        icon: <Settings className="h-4 w-4 text-primary" />,
      },
      {
        id: 'import-card',
        title: 'Importar histórico de cartão',
        description: 'Importe faturas para análise automática',
        status: step2Status,
        path: '/cartao-credito',
        icon: <CreditCard className="h-4 w-4 text-primary" />,
      },
      {
        id: 'import-ir',
        title: 'Importar IR dos últimos 3 anos',
        description: 'Conecte suas declarações para visão completa',
        status: step3Status,
        path: '/meu-ir',
        icon: <FileText className="h-4 w-4 text-primary" />,
      },
      {
        id: 'register-assets',
        title: 'Registrar bens e patrimônio',
        description: 'Cadastre imóveis, veículos e bens financeiros',
        status: step4Status,
        path: '/bens-investimentos',
        icon: <Building2 className="h-4 w-4 text-primary" />,
      },
      {
        id: 'link-ir',
        title: 'Vincular IR com patrimônio',
        description: 'Conecte declarações aos seus bens',
        status: step5Status,
        path: '/meu-ir',
        icon: <Link2 className="h-4 w-4 text-primary" />,
      },
      {
        id: 'projection',
        title: 'Projetar orçamento do ano',
        description: 'Crie projeções mensais e anuais',
        status: step6Status,
        path: '/planejamento-anual',
        icon: <CalendarRange className="h-4 w-4 text-primary" />,
      },
      {
        id: 'first-goal',
        title: 'Criar primeira meta mensal',
        description: 'Defina limites de gastos por categoria',
        status: step7Status,
        path: '/planejamento',
        icon: <Target className="h-4 w-4 text-primary" />,
      },
      {
        id: 'first-dream',
        title: 'Cadastrar seu primeiro sonho',
        description: 'Planeje objetivos de médio e longo prazo',
        status: step8Status,
        path: '/sonhos',
        icon: <Star className="h-4 w-4 text-primary" />,
      },
    ];
  }, [config, creditCardImportsCount, irImportsCount, hasIrLinkedAssets, hasBudgetGoals]);

  const completedSteps = onboardingSteps.filter(s => s.status === 'done').length;
  const onboardingProgress = (completedSteps / onboardingSteps.length) * 100;
  const showOnboarding = onboardingProgress < 100;

  // Efeito para disparar confetti quando todos os steps forem completados
  useEffect(() => {
    if (completedSteps === 8 && prevCompletedRef.current < 8 && !hasShownConfetti) {
      // Dispara confetti de celebração
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      setHasShownConfetti(true);
    }
    prevCompletedRef.current = completedSteps;
  }, [completedSteps, hasShownConfetti]);

  // Mock data para métricas (substituir por dados reais)
  const currentMonthSpending = 4850;
  const lastMonthSpending = 5200;
  const spendingDiff = lastMonthSpending - currentMonthSpending;
  const spendingDiffPercent = ((spendingDiff / lastMonthSpending) * 100).toFixed(0);

  const monthlyGoal = 6000;
  const goalProgress = (currentMonthSpending / monthlyGoal) * 100;
  const daysInMonth = 30;
  const currentDay = new Date().getDate();
  const idealPace = (currentDay / daysInMonth) * monthlyGoal;
  const paceStatus = currentMonthSpending <= idealPace ? 'on-track' : 'over-pace';

  // Categorias com metas - buscar do monthly_goals e lançamentos realizados
  const categoryGoals = useMemo(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const currentGoal = getGoalByMonth(currentMonth);
    
    // Calcular gastos realizados do mês atual por categoria
    const monthExpenses = lancamentos.filter(l => 
      l.tipo === 'despesa' && 
      l.mes_referencia === currentMonth &&
      !isBillPaymentTransaction(l)
    );
    
    const spentByCategory = monthExpenses.reduce((acc, l) => {
      const category = l.categoria || 'Outros';
      acc[category] = (acc[category] || 0) + l.valor_realizado;
      return acc;
    }, {} as Record<string, number>);
    
    // Se temos metas salvas, usar item_goals
    if (currentGoal && currentGoal.item_goals && Object.keys(currentGoal.item_goals).length > 0) {
      const enabledExpenses = config.expenseItems.filter(e => e.enabled);
      
      // Agrupar metas por categoria
      const goalsByCategory = enabledExpenses.reduce((acc, expense) => {
        const category = expense.category || 'Outros';
        const itemGoal = currentGoal.item_goals[expense.id];
        const goalValue = itemGoal?.goal ?? expense.defaultValue;
        
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += goalValue;
        return acc;
      }, {} as Record<string, number>);
      
      return Object.entries(goalsByCategory).map(([category, goal]) => ({
        category,
        goal,
        spent: spentByCategory[category] || 0,
      }));
    }
    
    // Fallback: usar despesas habilitadas com defaultValue
    const enabledExpenses = config.expenseItems.filter(e => e.enabled);
    const groupedByCategory = enabledExpenses.reduce((acc, expense) => {
      const category = expense.category || 'Outros';
      if (!acc[category]) {
        acc[category] = { goal: 0 };
      }
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
    const receitas = monthItems.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor_realizado, 0);
    const despesas = monthItems.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor_realizado, 0);
    return receitas - despesas;
  }, [lancamentos]);

  const formatCurrencyFull = (value: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // ─── Mobile layout ────────────────────────────────────────
  if (isMobile) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <MobileHomeHero firstName={firstName} saldoLiquido={saldoLiquido} />

          {/* Onboarding */}
          <AnimatePresence>
            {showOnboarding && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                onClick={() => setOnboardingDialogOpen(true)}
                className="w-full text-left"
              >
                <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">Configure sua conta</h3>
                      <Badge variant="secondary" className="text-xs">{completedSteps}/{onboardingSteps.length}</Badge>
                    </div>
                    <Progress value={onboardingProgress} className="h-1.5" />
                  </CardContent>
                </Card>
              </motion.button>
            )}
          </AnimatePresence>

          <OnboardingStepsDialog
            open={onboardingDialogOpen}
            onOpenChange={setOnboardingDialogOpen}
            steps={onboardingSteps}
            completedSteps={completedSteps}
            progress={onboardingProgress}
          />

          <InsuranceExpirationAlerts />

          <UpcomingEventsCard />

          <MonthSummaryCard />
          <ExpensesStatusCard />
          <CreditCardSpendingCard />
          <BudgetCompositionCard />
          <PendingCategorizationCard />

          <EconomicIndicators />

          <BudgetInsightsSummary />
        </div>
      </AppLayout>
    );
  }

  // ─── Desktop / Tablet layout ──────────────────────────────
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <AppLayout>
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
              <h1 className="text-2xl font-bold">
                Olá, {firstName || 'Usuário'}! 👋
              </h1>
              <p className="text-sm text-muted-foreground">
                Saldo Líquido do Mês:{' '}
                <span className={cn(
                  "font-semibold",
                  saldoLiquido >= 0 ? "text-income" : "text-expense"
                )}>
                  {formatCurrencyFull(saldoLiquido)}
                </span>
              </p>
            </div>
          </div>
          <VisibilityToggle />
        </motion.div>

        {/* Onboarding Section */}
        <AnimatePresence>
          {showOnboarding && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              onClick={() => setOnboardingDialogOpen(true)}
              className="w-full text-left"
              data-tour="onboarding-progress"
            >
              <Card className="hover:border-primary/30 transition-colors cursor-pointer hover:shadow-md">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-base">Configure sua conta</h3>
                      <p className="text-sm text-muted-foreground">
                        Complete os passos abaixo para aproveitar ao máximo
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-sm shrink-0 ml-3">
                      {completedSteps}/{onboardingSteps.length}
                    </Badge>
                  </div>
                  <Progress value={onboardingProgress} className="h-2" />
                </CardContent>
              </Card>
            </motion.button>
          )}
        </AnimatePresence>

        <OnboardingStepsDialog
          open={onboardingDialogOpen}
          onOpenChange={setOnboardingDialogOpen}
          steps={onboardingSteps}
          completedSteps={completedSteps}
          progress={onboardingProgress}
        />

        <InsuranceExpirationAlerts />

        <UpcomingEventsCard />

        <PackagesSummaryCard />

        {/* Main content grid - reusing mobile components */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4" data-tour="metrics-cards">
          <MonthSummaryCard />
          <ExpensesStatusCard />
          <CreditCardSpendingCard />
        </div>

        <div className={cn(
          "grid gap-4",
          showMetasMensais ? "grid-cols-2" : "grid-cols-1"
        )}>
          {/* Gasto vs Meta por Categoria */}
          {showMetasMensais && (
            <Card data-tour="category-goals">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Gasto vs Meta por Categoria
                  </CardTitle>
                  <button
                    onClick={() => navigate('/planejamento?tab=metas')}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Editar metas
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
                {categoryGoals.length > 0 ? (
                  categoryGoals.map((item) => (
                    <CategoryGoalItem
                      key={item.category}
                      category={item.category}
                      spent={item.spent}
                      goal={item.goal}
                      isHidden={isHidden}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma categoria configurada. Configure em Parâmetros.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <BudgetCompositionCard />
        </div>

        <PendingCategorizationCard />

        <EconomicIndicators />

        <BudgetInsightsSummary />
      </div>
    </AppLayout>
  );
};

export default Inicio;
