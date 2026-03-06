import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/layout/AppLayout";
import { useFinancial } from "@/contexts/FinancialContext";
import { useAuth } from "@/contexts/AuthContext";
import { useVisibility } from "@/contexts/VisibilityContext";
import { useTour } from "@/contexts/TourContext";
import { useFeaturePreferences } from "@/hooks/useFeaturePreferences";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useOnboardingCheckpoint } from "@/hooks/useOnboardingCheckpoint";
import { supabase } from "@/integrations/supabase/client";
import { VisibilityToggle } from "@/components/ui/visibility-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Target,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Shield,
  BarChart2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn, formatCurrency } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { BudgetInsightsSummary } from "@/components/inicio/BudgetInsightsSummary";
import { PackagesSummaryCard } from "@/components/inicio/PackagesSummaryCard";
import { InsuranceExpirationAlerts } from "@/components/inicio/InsuranceExpirationAlerts";
import { MobileHomeHero } from "@/components/inicio/MobileHomeHero";
import { OnboardingInsightCard } from "@/components/inicio/OnboardingInsightCard";
import { DemoBadge } from "@/components/inicio/DemoBadge";
import { ControlOnboardingBanner } from "@/components/shared/ControlOnboardingBanner";
import {
  MonthSummaryCard,
  ExpensesStatusCard,
  CreditCardSpendingCard,
  BudgetCompositionCard,
  PendingCategorizationCard,
} from "@/components/inicio/MobileHomeSections";
import { UpcomingEventsCard } from "@/components/inicio/UpcomingEventsCard";
import { EconomicIndicators } from "@/components/dashboard/EconomicIndicators";
import { useMonthlyGoals } from "@/hooks/useMonthlyGoals";
import { useLancamentosRealizados } from "@/hooks/useLancamentosRealizados";
import { isBillPaymentTransaction } from "@/hooks/useBillPaymentReconciliation";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import { BalanceCard } from "@/design-system/components/BalanceCard";
import { QuickActions } from "@/design-system/components/QuickActions";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// Componente de Categoria com Meta
const CategoryGoalItem: React.FC<{
  category: string;
  spent: number;
  goal: number;
  isHidden: boolean;
}> = ({ category, spent, goal, isHidden }) => {
  const percentage = goal > 0 ? Math.min((spent / goal) * 100, 100) : 0;
  const isOverBudget = spent > goal;

  const formatCurrencyLocal = (value: number) => {
    if (isHidden) return "••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-1.5 p-3.5 rounded-xl bg-muted/20 border border-border">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{category}</span>
        <span
          className={cn(
            "text-sm tabular-nums",
            isOverBudget ? "text-expense" : "text-muted-foreground"
          )}
        >
          {formatCurrencyLocal(spent)} / {formatCurrencyLocal(goal)}
        </span>
      </div>
      <Progress
        value={percentage}
        className={cn(
          "h-2 w-full overflow-hidden rounded-full bg-muted [&>div]:rounded-full",
          isOverBudget ? "[&>div]:bg-expense" : "[&>div]:bg-primary"
        )}
      />
    </div>
  );
};

/** Wrapper that adds demo visual treatment to cards */
const DemoCardWrapper: React.FC<{
  isDemoMode: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ isDemoMode, children, className }) => {
  if (!isDemoMode) return <>{children}</>;
  return (
    <div className={cn("relative", className)}>
      <div className="[&>*]:border-dashed [&>*]:opacity-80">{children}</div>
      <DemoBadge />
    </div>
  );
};

/** Últimas 5 transações para o dashboard */
const RecentTransactionsList: React.FC<{
  items: Array<{
    id: string;
    nome: string;
    valor_realizado: number;
    tipo: string;
    transaction_date?: string | null;
    data_vencimento?: string | null;
    categoria?: string | null;
  }>;
  isHidden: boolean;
}> = ({ items, isHidden }) => {
  const formatVal = (v: number, tipo: string) => {
    if (isHidden) return "••••";
    const n = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Math.abs(v));
    return tipo === "despesa" ? `- ${n}` : n;
  };
  const getDate = (l: (typeof items)[0]) =>
    l.transaction_date || l.data_vencimento || "";

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhuma transação recente.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((l) => (
        <li
          key={l.id}
          className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {l.nome || "Sem nome"}
              </p>
              <p className="text-xs text-muted-foreground">
                {getDate(l)
                  ? dateFmt.format(new Date(getDate(l)))
                  : "—"}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "text-sm font-sans font-semibold tabular-nums tracking-tight shrink-0",
              l.tipo === "receita" ? "text-income" : "text-expense"
            )}
          >
            {formatVal(l.valor_realizado ?? 0, l.tipo)}
          </span>
        </li>
      ))}
    </ul>
  );
};

/** Placeholder do gráfico de fluxo 30 dias — link para página de fluxo */
const FluxoPlaceholderCard: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-primary" />
          Fluxo — últimos 30 dias
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <button
          type="button"
          onClick={() => navigate("/fluxo-caixa")}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Ver fluxo de caixa
          <ChevronRight className="h-3 w-3" />
        </button>
      </CardContent>
    </Card>
  );
};

const Inicio: React.FC = () => {
  const { config } = useFinancial();
  const { user } = useAuth();
  const { isHidden } = useVisibility();
  const { hasCompletedTour, startTour } = useTour();
  const { isFeatureEnabled } = useFeaturePreferences();
  const { isDemoMode } = useDemoMode();
  const { currentPhase, controlDone } = useOnboardingCheckpoint();
  const showControlBanner = currentPhase === "completed" && !controlDone;
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [firstName, setFirstName] = useState<string>("");
  const [hasTriggeredTour, setHasTriggeredTour] = useState(false);

  const currentMonth = format(new Date(), "yyyy-MM");
  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
  } = useHomeDashboard(currentMonth);

  const { goals: monthlyGoals, getGoalByMonth } = useMonthlyGoals();
  const { lancamentos } = useLancamentosRealizados();

  const showMetasMensais = isFeatureEnabled("metas-mensais");

  const displayFirstName =
    dashboardData?.user?.full_name?.split(" ")[0] ?? firstName;

  useEffect(() => {
    if (!hasCompletedTour && !hasTriggeredTour && user) {
      const timer = setTimeout(() => {
        startTour();
        setHasTriggeredTour(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour, hasTriggeredTour, startTour, user]);

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) {
        setFirstName("");
        return;
      }
      const metaName = user.user_metadata?.full_name;
      if (metaName) {
        setFirstName(metaName.split(" ")[0]);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (data?.full_name) {
        setFirstName(data.full_name.split(" ")[0]);
      } else {
        setFirstName(user.email?.split("@")[0] || "Usuário");
      }
    };
    fetchUserName();
  }, [user]);

  const categoryGoals = useMemo(() => {
    const currentGoal = getGoalByMonth(currentMonth);
    const monthExpenses = lancamentos.filter(
      (l) =>
        l.tipo === "despesa" &&
        l.mes_referencia === currentMonth &&
        !isBillPaymentTransaction(l)
    );
    const spentByCategory = monthExpenses.reduce(
      (acc, l) => {
        const category = l.categoria || "Outros";
        acc[category] = (acc[category] || 0) + (l.valor_realizado ?? 0);
        return acc;
      },
      {} as Record<string, number>
    );

    if (
      currentGoal?.item_goals &&
      Object.keys(currentGoal.item_goals).length > 0
    ) {
      const enabledExpenses = config.expenseItems.filter((e) => e.enabled);
      const goalsByCategory = enabledExpenses.reduce(
        (acc, expense) => {
          const category = expense.category || "Outros";
          const itemGoal = currentGoal.item_goals[expense.id];
          const goalValue = itemGoal?.goal ?? expense.defaultValue;
          if (!acc[category]) acc[category] = 0;
          acc[category] += goalValue;
          return acc;
        },
        {} as Record<string, number>
      );
      return Object.entries(goalsByCategory).map(([category, goal]) => ({
        category,
        goal,
        spent: spentByCategory[category] || 0,
      }));
    }

    const enabledExpenses = config.expenseItems.filter((e) => e.enabled);
    const groupedByCategory = enabledExpenses.reduce(
      (acc, expense) => {
        const category = expense.category || "Outros";
        if (!acc[category]) acc[category] = { goal: 0 };
        acc[category].goal += expense.defaultValue;
        return acc;
      },
      {} as Record<string, { goal: number }>
    );
    return Object.entries(groupedByCategory).map(([category, values]) => ({
      category,
      goal: values.goal,
      spent: spentByCategory[category] || 0,
    }));
  }, [config.expenseItems, getGoalByMonth, lancamentos]);

  const CATEGORY_COLORS: Record<string, string> = {
    "Contas da Casa": "hsl(var(--chart-1))",
    Alimentação: "hsl(var(--income))",
    Saúde: "hsl(var(--expense))",
    Lazer: "hsl(var(--chart-3))",
    Transporte: "hsl(var(--chart-4))",
    Pessoal: "hsl(var(--chart-5))",
    Investimentos: "hsl(var(--primary))",
  };
  const getCategoryColor = (category: string) =>
    CATEGORY_COLORS[category] ?? "hsl(var(--primary))";

  const saldoLiquidoFromLancamentos = useMemo(() => {
    const monthItems = lancamentos.filter(
      (l) =>
        l.mes_referencia === currentMonth && !isBillPaymentTransaction(l)
    );
    const receitas = monthItems
      .filter((l) => l.tipo === "receita")
      .reduce((s, l) => s + (l.valor_realizado ?? 0), 0);
    const despesas = monthItems
      .filter((l) => l.tipo === "despesa")
      .reduce((s, l) => s + (l.valor_realizado ?? 0), 0);
    return {
      total_income: receitas,
      total_expense: despesas,
      balance: receitas - despesas,
    };
  }, [lancamentos, currentMonth]);

  const monthSummary = useMemo((): {
    total_income: number;
    total_expense: number;
    balance: number;
    count_total?: number;
  } => {
    const rpc = dashboardData?.month_summary as
      | {
          total_income?: number;
          total_expense?: number;
          balance?: number;
          count_total?: number;
          prev_income?: number;
          prev_expense?: number;
        }
      | undefined;
    if (
      rpc != null &&
      (rpc.total_income != null || rpc.total_expense != null)
    ) {
      return {
        total_income: rpc.total_income ?? 0,
        total_expense: rpc.total_expense ?? 0,
        balance:
          rpc.balance ??
          (rpc.total_income ?? 0) - (rpc.total_expense ?? 0),
        count_total: rpc.count_total,
      };
    }
    return {
      ...saldoLiquidoFromLancamentos,
      count_total: undefined,
    };
  }, [dashboardData?.month_summary, saldoLiquidoFromLancamentos]);

  const budgetComposition = (dashboardData?.budget_composition as Array<{
    category: string;
    total: number;
    pct?: number;
  }>) ??
    (dashboardData?.expenses_by_category as Array<{
      category: string;
      total: number;
      pct?: number;
    }>) ??
    [];
  const expensesForBars = Array.isArray(budgetComposition)
    ? budgetComposition
    : [];
  const totalExpensesForPct = expensesForBars.reduce(
    (s, i) => s + (i.total ?? 0),
    0
  );
  const creditCardsPayload = dashboardData?.credit_cards;
  const bills = Array.isArray(creditCardsPayload)
    ? creditCardsPayload
    : (creditCardsPayload as { bills?: unknown[] })?.bills ?? [];
  const insuranceAlerts = dashboardData?.insurance_alerts ?? [];

  const saldoLiquido = monthSummary.balance;

  const prevBalance = useMemo(() => {
    const rpc = dashboardData?.month_summary as
      | { prev_income?: number; prev_expense?: number }
      | undefined;
    if (rpc?.prev_income != null || rpc?.prev_expense != null) {
      return (rpc.prev_income ?? 0) - (rpc.prev_expense ?? 0);
    }
    return saldoLiquido;
  }, [dashboardData?.month_summary, saldoLiquido]);

  const balanceVariation = useMemo(() => {
    const prev = prevBalance;
    const value = saldoLiquido - prev;
    const pct = prev !== 0 ? (value / Math.abs(prev)) * 100 : 0;
    return { value, pct };
  }, [prevBalance, saldoLiquido]);

  const periodLabel = useMemo(
    () =>
      format(new Date(), "MMMM yyyy", { locale: ptBR }).replace(
        /^\w/,
        (c) => c.toUpperCase()
      ),
    []
  );

  const recentTransactions = useMemo(() => {
    const filtered = lancamentos.filter(
      (l) => l.mes_referencia === currentMonth && !isBillPaymentTransaction(l)
    );
    const withDate = filtered
      .map((l) => ({
        ...l,
        _sortDate:
          l.transaction_date || l.data_vencimento || l.created_at || "",
      }))
      .filter((l) => l._sortDate);
    withDate.sort(
      (a, b) =>
        new Date(b._sortDate).getTime() - new Date(a._sortDate).getTime()
    );
    return withDate.slice(0, 5);
  }, [lancamentos, currentMonth]);

  const top3Goals = categoryGoals.slice(0, 3);

  const formatCurrencyFull = (value: number) => {
    if (isHidden) return "••••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const errorBlock = dashboardError && (
    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
      Erro ao carregar resumo: {dashboardError}
    </p>
  );

  // ─── Mobile layout ────────────────────────────────────────
  if (isMobile) {
    return (
      <AppLayout>
        <div className="space-y-4">
          {errorBlock}
          <MobileHomeHero
            firstName={displayFirstName}
            saldoLiquido={saldoLiquido}
          />
          {isDemoMode && <OnboardingInsightCard />}
          {showControlBanner && <ControlOnboardingBanner />}

          <InsuranceExpirationAlerts />
          <UpcomingEventsCard />

          <QuickActions />

          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-base">Transações recentes</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {dashboardLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <RecentTransactionsList
                  items={recentTransactions}
                  isHidden={isHidden}
                />
              )}
            </CardContent>
          </Card>

          <FluxoPlaceholderCard />

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
      </AppLayout>
    );
  }

  // ─── Desktop layout ──────────────────────────────────────
  const avatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <AppLayout>
      <div className="space-y-6">
        {errorBlock}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start"
        >
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-4 min-w-0">
              <Avatar className="h-14 w-14 border-2 border-border shrink-0">
                <AvatarImage src={avatarUrl} alt={displayFirstName} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                  {getInitials(displayFirstName || "U")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-foreground">
                  Olá, {displayFirstName || "Usuário"}! 👋
                </h1>
                <p className="text-sm text-muted-foreground">
                  Saldo Líquido do Mês:{" "}
                  <span
                    className={cn(
                      "font-sans font-semibold tabular-nums tracking-tight",
                      saldoLiquido >= 0 ? "text-income" : "text-expense"
                    )}
                  >
                    {formatCurrencyFull(saldoLiquido)}
                  </span>
                </p>
              </div>
            </div>
            <VisibilityToggle />
          </div>
          {dashboardLoading ? (
            <Skeleton className="h-32 w-full rounded-xl" />
          ) : (
            <div className="w-full min-w-0">
              <BalanceCard
                balance={saldoLiquido}
                variationPercent={balanceVariation.pct}
                variationValue={balanceVariation.value}
                period={periodLabel}
              />
            </div>
          )}
        </motion.div>

        {isDemoMode && <OnboardingInsightCard />}
        {showControlBanner && <ControlOnboardingBanner />}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <InsuranceExpirationAlerts />
          <UpcomingEventsCard />
          <PackagesSummaryCard />
        </div>

        <QuickActions />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card className="rounded-xl border border-border bg-card">
              <CardHeader className="pb-2 p-4">
                <CardTitle className="text-base">Transações recentes</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {dashboardLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : (
                  <RecentTransactionsList
                    items={recentTransactions}
                    isHidden={isHidden}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <FluxoPlaceholderCard />

            {showMetasMensais && top3Goals.length > 0 && (
              <Card className="rounded-xl border border-border bg-card">
                <CardHeader className="pb-2 p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Metas rápidas (top 3)
                    </CardTitle>
                    <button
                      type="button"
                      onClick={() => navigate("/planejamento?tab=metas")}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Editar metas
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                  {top3Goals.map((item) => (
                    <CategoryGoalItem
                      key={item.category}
                      category={item.category}
                      spent={item.spent}
                      goal={item.goal}
                      isHidden={isHidden}
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {monthSummary && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            data-tour="metrics-cards"
          >
            <DemoCardWrapper isDemoMode={isDemoMode}>
              <Card className="rounded-xl border border-border bg-card">
                <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-income/10">
                    <TrendingUp className="h-5 w-5 text-income" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Receitas
                    </p>
                    <p className="text-sm sm:text-lg font-sans font-semibold tabular-nums tracking-tight text-income truncate">
                      {isHidden ? "••••••" : formatCurrency(monthSummary.total_income ?? 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </DemoCardWrapper>
            <DemoCardWrapper isDemoMode={isDemoMode}>
              <Card className="rounded-xl border border-border bg-card">
                <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-expense/10">
                    <TrendingDown className="h-5 w-5 text-expense" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Despesas
                    </p>
                    <p className="text-sm sm:text-lg font-sans font-semibold tabular-nums tracking-tight text-expense truncate">
                      {isHidden ? "••••••" : formatCurrency(monthSummary.total_expense ?? 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </DemoCardWrapper>
            <DemoCardWrapper isDemoMode={isDemoMode}>
              <Card className="rounded-xl border border-border bg-card">
                <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      (monthSummary.balance ?? 0) >= 0
                        ? "bg-income/10"
                        : "bg-expense/10"
                    )}
                  >
                    <Wallet
                      className={cn(
                        "h-5 w-5",
                        (monthSummary.balance ?? 0) >= 0
                          ? "text-income"
                          : "text-expense"
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Saldo
                    </p>
                    <p
                      className={cn(
                        "text-sm sm:text-lg font-sans font-semibold tabular-nums tracking-tight truncate",
                        (monthSummary.balance ?? 0) >= 0
                          ? "text-income"
                          : "text-expense"
                      )}
                    >
                      {isHidden ? "••••••" : formatCurrency(monthSummary.balance ?? 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </DemoCardWrapper>
            <DemoCardWrapper isDemoMode={isDemoMode}>
              <Card className="rounded-xl border border-border bg-card">
                <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Receipt className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Lançamentos
                    </p>
                    <p className="text-sm sm:text-lg font-sans font-semibold tabular-nums tracking-tight text-foreground truncate">
                      {monthSummary.count_total ?? "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </DemoCardWrapper>
          </div>
        )}

        {expensesForBars.length > 0 && (
          <DemoCardWrapper isDemoMode={isDemoMode}>
            <Card className="rounded-xl border border-border bg-card">
              <CardHeader className="pb-2 p-3 sm:p-4">
                <CardTitle className="text-base">
                  Despesas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-3 sm:p-4 pt-0">
                {expensesForBars.map((row) => {
                  const pct =
                    totalExpensesForPct > 0
                      ? ((row.total ?? 0) / totalExpensesForPct) * 100
                      : row.pct ?? 0;
                  const color = getCategoryColor(row.category ?? "");
                  return (
                    <div
                      key={row.category}
                      className="flex items-center gap-2 sm:gap-3 min-w-0"
                    >
                      <span className="w-24 sm:w-32 shrink-0 text-xs sm:text-sm font-medium truncate text-foreground">
                        {row.category}
                      </span>
                      <div className="flex-1 h-6 rounded-md bg-muted overflow-hidden min-w-0">
                        <div
                          className="h-full rounded-md transition-all"
                          style={{
                            width: `${Math.min(100, pct)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <span className="shrink-0 text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                        {isHidden ? "••••" : formatCurrency(row.total ?? 0)} (
                        {pct.toFixed(1)}%)
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </DemoCardWrapper>
        )}

        {bills.length > 0 && (
          <DemoCardWrapper isDemoMode={isDemoMode}>
            <Card className="rounded-xl border border-border bg-card">
              <CardHeader className="pb-2 p-3 sm:p-4">
                <CardTitle className="text-base">Cartões de Crédito</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3 sm:p-4 pt-0">
                {bills.map(
                  (
                    bill: {
                      card_name?: string | null;
                      status?: string;
                      total_value?: number;
                      is_overdue?: boolean;
                    },
                    i: number
                  ) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate text-foreground">
                          {bill.card_name ?? "Cartão"}
                        </span>
                        {bill.status === "paid" && (
                          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                            Paga
                          </span>
                        )}
                        {bill.status !== "paid" && bill.is_overdue && (
                          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                            Vencida
                          </span>
                        )}
                        {bill.status !== "paid" && !bill.is_overdue && (
                          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            Aberta
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-foreground">
                          {isHidden ? "••••" : formatCurrency(bill.total_value ?? 0)}
                        </span>
                        <Link
                          to="/cartao-credito"
                          className="text-xs text-primary hover:underline"
                        >
                          Ver detalhes →
                        </Link>
                      </div>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </DemoCardWrapper>
        )}

        {insuranceAlerts.length > 0 && (
          <Link to="/alertas" className="block">
            <Card className="rounded-xl border border-border bg-warning/10 p-4 hover:bg-warning/15 transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-warning shrink-0" />
                <div>
                  {(
                    insuranceAlerts as Array<{
                      nome?: string;
                      seguradora?: string;
                      days_left?: number;
                      dias_restantes?: number;
                    }>
                  ).map((a, i) => (
                    <p key={i} className="text-sm font-medium text-foreground">
                      {a.nome}
                      {a.seguradora ? ` (${a.seguradora})` : ""} vence em{" "}
                      {a.days_left ?? a.dias_restantes ?? 0} dia
                      {(a.days_left ?? a.dias_restantes) !== 1 ? "s" : ""}!
                    </p>
                  ))}
                </div>
              </div>
            </Card>
          </Link>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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

        <div
          className={cn(
            "grid gap-4",
            showMetasMensais ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
          )}
        >
          {showMetasMensais && (
            <DemoCardWrapper isDemoMode={isDemoMode}>
              <Card data-tour="category-goals" className="rounded-xl border border-border bg-card">
                <CardHeader className="pb-3 p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Gasto vs Meta por Categoria
                    </CardTitle>
                    <button
                      type="button"
                      onClick={() => navigate("/planejamento?tab=metas")}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Editar metas
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[300px] overflow-y-auto p-3 sm:p-4 pt-0">
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
    </AppLayout>
  );
};

export default Inicio;
