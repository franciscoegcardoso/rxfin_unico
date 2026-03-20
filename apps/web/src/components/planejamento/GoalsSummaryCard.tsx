import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  ArrowRight,
  CreditCard,
  Target,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMonthlyGoals } from '@/hooks/useMonthlyGoals';
import { useGoalsProjectionIntegration } from '@/hooks/useGoalsProjectionIntegration';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { MiniSparkline } from '@/components/metas/MiniSparkline';

interface GoalsSummaryCardProps {
  selectedMonth: string;
  formatCurrency: (value: number) => string;
  isHidden: boolean;
}

const formatMonthLabel = (month: string) => {
  const [year, monthNum] = month.split('-');
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${months[parseInt(monthNum) - 1]} ${year}`;
};

const formatMonthShort = (month: string) => {
  const [year, monthNum] = month.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(monthNum) - 1]}/${year.slice(2)}`;
};

// Get N months back from reference month
const getMonthsBack = (referenceMonth: string, count: number): string[] => {
  const [year, month] = referenceMonth.split('-').map(Number);
  const months: string[] = [];
  
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(year, month - 1 - i, 1);
    const m = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push(m);
  }
  
  return months;
};

interface SparklineData {
  month: string;
  value: number;
}

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  borderColor: string;
  goal: number;
  actual: number;
  momVariation: number;
  previousMonthLabel: string;
  helpText: string;
  formatCurrency: (value: number) => string;
  isHidden: boolean;
  isInverted?: boolean;
  sparklineData?: SparklineData[];
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  icon,
  iconColor,
  borderColor,
  goal,
  actual,
  momVariation,
  previousMonthLabel,
  helpText,
  formatCurrency,
  isHidden,
  isInverted = false,
  sparklineData = [],
}) => {
  const progress = goal > 0 ? Math.min(100, Math.max(0, (actual / goal) * 100)) : 0;
  
  const getMoMColor = () => {
    if (momVariation === 0) return 'text-muted-foreground';
    if (isInverted) {
      return momVariation < 0 ? 'text-income' : 'text-expense';
    }
    return momVariation > 0 ? 'text-income' : 'text-expense';
  };

  const getMoMIcon = () => {
    if (momVariation === 0) return <Minus className="h-3 w-3" />;
    if (isInverted) {
      return momVariation < 0 
        ? <ArrowDownRight className="h-3 w-3" /> 
        : <ArrowUpRight className="h-3 w-3" />;
    }
    return momVariation > 0 
      ? <ArrowUpRight className="h-3 w-3" /> 
      : <ArrowDownRight className="h-3 w-3" />;
  };

  return (
    <Card className={cn("border-l-4", borderColor)}>
      <CardContent className="p-4 space-y-2">
        {/* Header with title and help */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("h-7 w-7 rounded-full flex items-center justify-center", `${iconColor}/10`)}>
              {icon}
            </div>
            <span className="text-sm font-medium">{title}</span>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground">
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 text-sm">
              {helpText}
            </PopoverContent>
          </Popover>
        </div>

        {/* Goal and Actual values */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Meta:</span>
            <span className="font-medium">{isHidden ? '••••••' : formatCurrency(goal)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Realizado:</span>
            <span className={cn(
              "font-semibold text-base",
              isInverted 
                ? (actual <= goal ? 'text-income' : 'text-expense')
                : (actual >= goal * 0.8 ? 'text-income' : actual >= goal * 0.5 ? 'text-amber-500' : 'text-expense')
            )}>
              {isHidden ? '••••••' : formatCurrency(actual)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-0.5">
          <Progress 
            value={progress} 
            className={cn(
              "h-1.5",
              isInverted
                ? progress > 100 ? '[&>div]:bg-expense' : progress > 90 ? '[&>div]:bg-amber-500' : '[&>div]:bg-income'
                : progress >= 80 ? '[&>div]:bg-income' : progress >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-expense'
            )}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress.toFixed(0)}% da meta</span>
          </div>
        </div>

        {/* Sparkline at the bottom - replacing MoM text */}
        {sparklineData.length > 0 && !isHidden ? (
          <div className="pt-1">
            <MiniSparkline 
              data={sparklineData} 
              isInverted={isInverted}
              formatValue={formatCurrency}
              height={32}
            />
          </div>
        ) : (
          <div className={cn("flex items-center gap-1 text-xs", getMoMColor())}>
            {getMoMIcon()}
            <span>
              {momVariation === 0 
                ? `Igual a ${previousMonthLabel}` 
                : `${momVariation > 0 ? '+' : ''}${momVariation.toFixed(0)}% vs ${previousMonthLabel}`
              }
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Result card
interface ResultCardProps {
  incomeGoal: number;
  expenseGoal: number;
  actualSavings: number;
  goalSavings: number;
  formatCurrency: (value: number) => string;
  isHidden: boolean;
  sparklineData?: SparklineData[];
}

const ResultCard: React.FC<ResultCardProps> = ({
  incomeGoal,
  expenseGoal,
  actualSavings,
  goalSavings,
  formatCurrency,
  isHidden,
  sparklineData = [],
}) => {
  const progress = goalSavings !== 0 
    ? Math.min(100, Math.max(0, (actualSavings / goalSavings) * 100))
    : 0;
  
  const isPositive = actualSavings >= 0;
  const savingsPercentOfIncome = incomeGoal > 0 ? (goalSavings / incomeGoal) * 100 : 0;

  return (
    <Card className={cn(
      "border-l-4",
      isPositive ? "border-l-primary" : "border-l-expense"
    )}>
      <CardContent className="p-4 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center",
              isPositive ? "bg-primary/10" : "bg-expense/10"
            )}>
              <PiggyBank className={cn("h-4 w-4", isPositive ? "text-primary" : "text-expense")} />
            </div>
            <span className="text-sm font-medium">Resultado</span>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground">
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 text-sm">
              O resultado é a diferença entre suas receitas e despesas. 
              Valores positivos significam que você está economizando. 
              A meta de economia é {savingsPercentOfIncome.toFixed(0)}% da sua receita planejada.
            </PopoverContent>
          </Popover>
        </div>

        {/* Values */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Meta de Economia:</span>
            <span className="font-medium">{isHidden ? '••••••' : formatCurrency(goalSavings)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Economia Atual:</span>
            <span className={cn(
              "font-semibold text-base",
              actualSavings >= goalSavings ? 'text-income' : actualSavings >= 0 ? 'text-amber-500' : 'text-expense'
            )}>
              {isHidden ? '••••••' : (actualSavings < 0 ? '-' : '') + formatCurrency(Math.abs(actualSavings))}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-0.5">
          <Progress 
            value={Math.max(0, progress)} 
            className={cn(
              "h-1.5",
              actualSavings >= goalSavings ? '[&>div]:bg-income' : actualSavings >= 0 ? '[&>div]:bg-amber-500' : '[&>div]:bg-expense'
            )}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress.toFixed(0)}% da meta</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {savingsPercentOfIncome.toFixed(0)}% da receita
            </Badge>
          </div>
        </div>

        {/* Sparkline at the bottom */}
        {sparklineData.length > 0 && !isHidden && (
          <div className="pt-1">
            <MiniSparkline 
              data={sparklineData} 
              isInverted={false}
              formatValue={(v) => (v < 0 ? '-' : '') + formatCurrency(Math.abs(v))}
              height={32}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const GoalsSummaryCard: React.FC<GoalsSummaryCardProps> = ({
  selectedMonth,
  formatCurrency,
  isHidden,
}) => {
  const navigate = useNavigate();
  const { getGoalByMonth, loading: goalsLoading } = useMonthlyGoals(selectedMonth);
  const { getMonthlyComparison, getPreviousMonth, calcMoM } = useGoalsProjectionIntegration();
  
  const savedGoal = getGoalByMonth(selectedMonth);
  const hasGoals = !!savedGoal;
  const comparison = getMonthlyComparison(selectedMonth);
  
  // Get previous month data for MoM
  const previousMonth = getPreviousMonth(selectedMonth);
  const previousComparison = getMonthlyComparison(previousMonth);
  const previousMonthLabel = formatMonthShort(previousMonth);
  
  // Generate sparkline data for last 3 months
  const sparklineMonths = useMemo(() => getMonthsBack(selectedMonth, 3), [selectedMonth]);
  
  const incomeSparkline = useMemo(() => {
    return sparklineMonths.map(month => {
      const comp = getMonthlyComparison(month);
      return { month: formatMonthShort(month), value: comp.actualIncome };
    });
  }, [sparklineMonths, getMonthlyComparison]);
  
  const expenseSparkline = useMemo(() => {
    return sparklineMonths.map(month => {
      const comp = getMonthlyComparison(month);
      return { month: formatMonthShort(month), value: comp.actualExpense };
    });
  }, [sparklineMonths, getMonthlyComparison]);
  
  const creditCardSparkline = useMemo(() => {
    return sparklineMonths.map(month => {
      const comp = getMonthlyComparison(month);
      return { month: formatMonthShort(month), value: comp.actualCreditCard };
    });
  }, [sparklineMonths, getMonthlyComparison]);
  
  const savingsSparkline = useMemo(() => {
    return sparklineMonths.map(month => {
      const comp = getMonthlyComparison(month);
      return { month: formatMonthShort(month), value: comp.actualSavings };
    });
  }, [sparklineMonths, getMonthlyComparison]);
  
  // Use saved goals if available, otherwise use projections
  const incomeGoal = hasGoals ? savedGoal.income_goal : comparison.goalIncome;
  const expenseGoal = hasGoals ? savedGoal.expense_goal : comparison.goalExpense;
  const savingsGoal = hasGoals ? savedGoal.savings_goal : comparison.goalSavings;
  const creditCardGoal = hasGoals 
    ? (savedGoal.credit_card_goal || 0)
    : comparison.goalCreditCard;
  
  // Actuals
  const actualIncome = comparison.actualIncome;
  const actualExpense = comparison.actualExpense;
  const actualSavings = actualIncome - actualExpense;
  const actualCreditCard = comparison.actualCreditCard;
  
  // MoM calculations
  const incomeMoM = calcMoM(actualIncome, previousComparison.actualIncome);
  const expenseMoM = calcMoM(actualExpense, previousComparison.actualExpense);
  const creditCardMoM = calcMoM(actualCreditCard, previousComparison.actualCreditCard);

  if (goalsLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <div className="animate-pulse text-muted-foreground">Carregando metas...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with month */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Suas Metas para {formatMonthLabel(selectedMonth)}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/planejamento-mensal/metas')}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              {hasGoals ? 'Editar' : 'Configurar'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            {hasGoals 
              ? 'Metas personalizadas configuradas. Acompanhe seu progresso e compare com o mês anterior.'
              : 'Baseado em projeções automáticas. Configure metas personalizadas para melhor controle.'
            }
          </p>
        </CardContent>
      </Card>

      {/* 4-Card Grid - Equal sizes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Receita */}
        <MetricCard
          title="Receita"
          icon={<TrendingUp className="h-4 w-4 text-income" />}
          iconColor="bg-income"
          borderColor="border-l-income"
          goal={incomeGoal}
          actual={actualIncome}
          momVariation={incomeMoM}
          previousMonthLabel={previousMonthLabel}
          helpText="Sua meta de quanto dinheiro você planeja receber este mês (salário, rendimentos, etc.). Quanto mais perto ou acima da meta, melhor!"
          formatCurrency={formatCurrency}
          isHidden={isHidden}
          isInverted={false}
          sparklineData={incomeSparkline}
        />

        {/* Despesas */}
        <MetricCard
          title="Despesas"
          icon={<TrendingDown className="h-4 w-4 text-expense" />}
          iconColor="bg-expense"
          borderColor="border-l-expense"
          goal={expenseGoal}
          actual={actualExpense}
          momVariation={expenseMoM}
          previousMonthLabel={previousMonthLabel}
          helpText="Limite de gastos que você definiu para este mês. Quanto menor o realizado em relação à meta, melhor! Ficar abaixo da meta significa que você está economizando."
          formatCurrency={formatCurrency}
          isHidden={isHidden}
          isInverted={true}
          sparklineData={expenseSparkline}
        />

        {/* Cartão de Crédito */}
        <MetricCard
          title="Cartão"
          icon={<CreditCard className="h-4 w-4 text-amber-500" />}
          iconColor="bg-amber-500"
          borderColor="border-l-amber-500"
          goal={creditCardGoal || expenseGoal * 0.6}
          actual={actualCreditCard}
          momVariation={creditCardMoM}
          previousMonthLabel={previousMonthLabel}
          helpText="Limite de gastos no cartão de crédito. Atenção: parcelas de compras anteriores também são contabilizadas aqui. Manter esse valor controlado ajuda a evitar endividamento."
          formatCurrency={formatCurrency}
          isHidden={isHidden}
          isInverted={true}
          sparklineData={creditCardSparkline}
        />

        {/* Resultado */}
        <ResultCard
          incomeGoal={incomeGoal}
          expenseGoal={expenseGoal}
          actualSavings={actualSavings}
          goalSavings={savingsGoal}
          formatCurrency={formatCurrency}
          isHidden={isHidden}
          sparklineData={savingsSparkline}
        />
      </div>
    </div>
  );
};
