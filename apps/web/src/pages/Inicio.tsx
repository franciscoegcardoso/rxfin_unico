import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/layout/AppLayout";
import { useFinancial } from "@/contexts/FinancialContext";
import { useAuth } from "@/contexts/AuthContext";
import { useVisibility } from "@/contexts/VisibilityContext";
import { useFeaturePreferences } from "@/hooks/useFeaturePreferences";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useDemoUserId } from "@/hooks/useDemoUserId";
import { useOnboardingCheckpoint } from "@/hooks/useOnboardingCheckpoint";
import { supabase } from "@/integrations/supabase/client";
import { VisibilityToggle } from "@/components/ui/visibility-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  ChevronRight,
  Receipt,
  Shield,
  BarChart2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn, formatCurrency } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { BudgetInsightsSummary } from "@/components/inicio/BudgetInsightsSummary";
import { InsuranceExpirationAlerts } from "@/components/inicio/InsuranceExpirationAlerts";
import { OnboardingInsightCard } from "@/components/inicio/OnboardingInsightCard";
import { ControlOnboardingBanner } from "@/components/shared/ControlOnboardingBanner";
import {
  CreditCardSpendingCard,
  BudgetCompositionCard,
  PendingCategorizationCard,
  MonthSummaryCard,
  ExpensesStatusCard,
} from "@/components/inicio/MobileHomeSections";
import { HomeHeader } from "@/components/inicio/HomeHeader";
import { MobileHomeHero } from "@/components/inicio/MobileHomeHero";
import { InicioKpiBar } from "@/components/inicio/InicioKpiBar";
import { CashFlowChart } from "@/components/inicio/CashFlowChart";
import { AcoesImediatas } from "@/components/inicio/AcoesImediatas";
import { ContasBancarias } from "@/components/inicio/ContasBancarias";
import { CartaoCreditoInicio } from "@/components/inicio/CartaoCreditoInicio";
import { useMonthSummary } from "@/hooks/useMonthSummary";
import { UpcomingEventsCard } from "@/components/inicio/UpcomingEventsCard";
import { EconomicIndicators } from "@/components/dashboard/EconomicIndicators";
import { useMonthlyGoals } from "@/hooks/useMonthlyGoals";
import { useLancamentosRealizados } from "@/hooks/useLancamentosRealizados";
import { isBillPaymentTransaction } from "@/hooks/useBillPaymentReconciliation";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import { useBankingOverview } from "@/hooks/useBankingOverview";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// Componente de Categoria com Meta — formato lista compacta
const CategoryGoalItem: React.FC<{
  category: string;
  spent: number;
  goal: number;
  isHidden: boolean;
}> = ({ category, spent, goal, isHidden }) => {
  const validGoal = typeof goal === "number" && !Number.isNaN(goal) && goal > 0;
  const percentage = validGoal ? Math.min((spent / goal) * 100, 100) : 0;
  const isOverBudget = validGoal && spent > goal;

  const formatCurrencyLocal = (value: number) => {
    if (isHidden) return "••••";
    if (typeof value !== "number" || Number.isNaN(value)) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const goalLabel = validGoal ? formatCurrencyLocal(goal) : "—";

  return (
    <div className="py-2.5 px-1 border-b border-[hsl(var(--color-border-subtle))] last:border-b-0 last:pb-0 first:pt-0">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-[hsl(var(--color-text-primary))] truncate min-w-0">{category}</span>
        <span
          className={cn(
            "text-xs sm:text-sm tabular-nums shrink-0",
            isOverBudget ? "text-[hsl(var(--color-text-danger))]" : "text-[hsl(var(--color-text-tertiary))]"
          )}
        >
          {formatCurrencyLocal(spent)} / {goalLabel}
        </span>
      </div>
      <Progress
        value={percentage}
        className={cn(
          "h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--color-surface-raised))] mt-1.5 [&>div]:rounded-full",
          isOverBudget ? "[&>div]:bg-expense" : "[&>div]:bg-primary"
        )}
      />
    </div>
  );
};

/** Wrapper for cards; demo mode only affects banner, no blur/overlay (data comes from real demo account). */
const DemoCardWrapper: React.FC<{
  isDemoMode: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return <div className={cn(className)}>{children}</div>;
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
      <p className="text-sm text-[hsl(var(--color-text-tertiary))] py-4 text-center">
        Nenhuma transação recente.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((l) => (
        <li
          key={l.id}
          className="flex items-center justify-between gap-2 py-2 border-b border-[hsl(var(--color-border-subtle))] last:border-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-[hsl(var(--color-surface-raised))] flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4 text-[hsl(var(--color-text-tertiary))]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[hsl(var(--color-text-primary))] truncate">
                {l.nome || "Sem nome"}
              </p>
              <p className="text-xs text-[hsl(var(--color-text-tertiary))]">
                {getDate(l)
                  ? dateFmt.format(new Date(getDate(l)))
                  : "—"}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "text-sm font-sans font-semibold tabular-nums tracking-tight shrink-0",
              l.tipo === "receita" ? "text-[hsl(var(--color-text-success))]" : "text-[hsl(var(--color-text-danger))]"
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
    <Card className="rounded-xl border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))]">
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-base font-semibold text-[hsl(var(--color-text-primary))] flex items-center gap-2">
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
  const { isFeatureEnabled } = useFeaturePreferences();
  const { isDemoMode } = useDemoMode();
  const demoUserId = useDemoUserId();
  const effectiveDemoUserId = isDemoMode ? demoUserId : null;
  const { currentPhase, controlDone } = useOnboardingCheckpoint();
  const showControlBanner = currentPhase === "completed" && !controlDone;
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [firstName, setFirstName] = useState<string>("");

  // Diagnóstico double-mount: se no console aparecer "montou" → "desmontou" → "montou" em <100ms, o pai está remontando.
  useEffect(() => {
    console.log("[InicioPage] montou");
    return () => console.log("[InicioPage] desmontou");
  }, []);

  const currentMonth = format(new Date(), "yyyy-MM");
  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
  } = useHomeDashboard(currentMonth, effectiveDemoUserId);

  const monthSummaryData = useMonthSummary(currentMonth, effectiveDemoUserId);
  const { data: bankingOverview } = useBankingOverview();
  const recurringPayments = bankingOverview?.recurring_payments ?? [];
  const topRecurringExpenses = useMemo(() => {
    const expenses = recurringPayments.filter(
      (p) => (p.type ?? "expense") === "expense" || !p.type
    );
    return [...expenses]
      .sort((a, b) => (b.average_amount ?? 0) - (a.average_amount ?? 0))
      .slice(0, 5);
  }, [recurringPayments]);

  const { goals: monthlyGoals, getGoalByMonth } = useMonthlyGoals();
  const { lancamentos } = useLancamentosRealizados();

  const showMetasMensais = isFeatureEnabled("metas-mensais");

  const displayFirstName =
    dashboardData?.user?.full_name?.split(" ")[0] ?? firstName;

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

  // ─── Mobile/tablet layout (cabeçalho verde + Resumo/Despesas do mês; do gráfico pra baixo = formato atual) ────────────────────────────────────────
  if (isMobile) {
    return (
      <AppLayout>
        <div className="flex flex-col min-h-full w-full max-w-full min-w-0 bg-[hsl(var(--color-surface-base))]">
          <div className="content-zone pt-4 pb-5 md:pt-5 md:pb-6 space-y-5 flex-1">
            {errorBlock}
            {showControlBanner && <ControlOnboardingBanner />}
            <MobileHomeHero firstName={displayFirstName} saldoLiquido={monthSummaryData.saldoMensal} />
            <MonthSummaryCard demoUserId={effectiveDemoUserId} />
            <ExpensesStatusCard />
            {isDemoMode && <OnboardingInsightCard />}

          <ContasBancarias />
          <DemoCardWrapper isDemoMode={isDemoMode}>
            <CashFlowChart />
          </DemoCardWrapper>

          <DemoCardWrapper isDemoMode={isDemoMode}>
            <CreditCardSpendingCard />
          </DemoCardWrapper>

          {topRecurringExpenses.length > 0 && (
            <Card className="rounded-xl border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))]">
              <CardHeader className="pb-2 p-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-[hsl(var(--color-text-primary))]">Compromissos do mês</CardTitle>
                <Link to="/movimentacoes/extrato" className="text-sm text-primary hover:underline font-medium">Ver todos</Link>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="space-y-2">
                  {topRecurringExpenses.map((item, i) => (
                    <li key={item.id ?? i} className="flex items-center justify-between gap-2 py-1.5 border-b border-[hsl(var(--color-border-subtle))] last:border-0">
                      <span className="text-sm font-medium text-[hsl(var(--color-text-primary))] truncate min-w-0">
                        {(item.description ?? "").trim() || "Sem nome"}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs tabular-nums text-[hsl(var(--color-text-tertiary))]">
                          {isHidden ? "••••" : formatCurrency(item.average_amount ?? 0)}
                        </span>
                        {item.seen_this_month ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">✓ Pago</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">A pagar</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <InsuranceExpirationAlerts />
          <UpcomingEventsCard />

          <Card className="rounded-xl border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))]">
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-base font-semibold text-[hsl(var(--color-text-primary))]">Transações recentes</CardTitle>
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

          <DemoCardWrapper isDemoMode={isDemoMode}>
            <BudgetCompositionCard />
          </DemoCardWrapper>
          <DemoCardWrapper isDemoMode={isDemoMode}>
            <PendingCategorizationCard />
          </DemoCardWrapper>

          {!isDemoMode && <EconomicIndicators />}
          <BudgetInsightsSummary />
          </div>
        </div>
      </AppLayout>
    );
  }

  // ─── Desktop layout ──────────────────────────────────────
  const avatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";

  return (
    <AppLayout>
      <div className="flex flex-col min-h-full w-full max-w-full min-w-0 bg-[hsl(var(--color-surface-base))]">
        <div className="content-zone pt-0 pb-5 md:pt-0 md:pb-6 flex-1 w-full max-w-full min-w-0">
          {errorBlock}
          <HomeHeader firstName={displayFirstName} avatarUrl={avatarUrl} />
          <div className="px-4 md:px-5 pt-3 space-y-3">
            <InicioKpiBar
              receitas={monthSummaryData.receitas}
              despesasSemCartao={monthSummaryData.despesasSemCartao}
              totalCartao={monthSummaryData.totalCartao}
              totalDespesas={monthSummaryData.totalDespesas}
              saldoMensal={monthSummaryData.saldoMensal}
              totalLancamentos={monthSummaryData.totalLancamentos}
              lancamentosSemCategoria={monthSummaryData.lancamentosSemCategoria}
              deltaVsMesAnterior={monthSummaryData.deltaVsMesAnterior}
              isHidden={isHidden}
            />

          {isDemoMode && <OnboardingInsightCard />}
          {showControlBanner && <ControlOnboardingBanner />}

          <DemoCardWrapper isDemoMode={isDemoMode} className="mt-3">
            <CashFlowChart />
          </DemoCardWrapper>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
            <AcoesImediatas />
            <ContasBancarias />
          </div>

          <div className="space-y-3 mt-3 w-full max-w-full min-w-0">
            <DemoCardWrapper isDemoMode={isDemoMode}>
              <BudgetCompositionCard />
            </DemoCardWrapper>
            {!isDemoMode && <EconomicIndicators />}
            <BudgetInsightsSummary />
          </div>

          <div className="mt-3 w-full max-w-full min-w-0">
            <CartaoCreditoInicio />
          </div>
          </div>

        {insuranceAlerts.length > 0 && (
          <Link to="/alertas" className="block">
<Card className="rounded-xl border border-[hsl(var(--color-border-subtle))] bg-warning/10 p-4 hover:bg-warning/15 transition-colors">
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
                <p key={i} className="text-sm font-medium text-[hsl(var(--color-text-primary))]">
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

        </div>
      </div>
    </AppLayout>
  );
};

export default Inicio;
