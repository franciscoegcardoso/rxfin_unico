import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CreditCard, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useVisibility } from '@/contexts/VisibilityContext';

interface GoalSummaryCardsProps {
  incomeGoal: number;
  expenseGoal: number;
  savingsGoal: number;
  creditCardGoal: number;
  incomeAvg?: number;
  expenseAvg?: number;
  creditCardLimit?: number;
}

export function GoalSummaryCards({
  incomeGoal,
  expenseGoal,
  savingsGoal,
  creditCardGoal,
  incomeAvg = 0,
  expenseAvg = 0,
  creditCardLimit = 0,
}: GoalSummaryCardsProps) {
  const { isHidden } = useVisibility();
  const isVisible = !isHidden;

  const formatCurrency = (value: number) => {
    if (!isVisible) return '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value / 100);
  };

  const formatPercent = (value: number, base: number) => {
    if (base === 0) return null;
    const diff = ((value - base) / base) * 100;
    return diff;
  };

  const incomeDiff = formatPercent(incomeGoal, incomeAvg);
  const expenseDiff = formatPercent(expenseGoal, expenseAvg);
  const savingsPercent = incomeGoal > 0 ? (savingsGoal / incomeGoal) * 100 : 0;
  const creditCardPercent = creditCardLimit > 0 ? (creditCardGoal / creditCardLimit) * 100 : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Income Goal */}
      <Card className="p-4 border-l-4 border-l-income">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-income/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-income" />
          </div>
          <span className="text-sm text-muted-foreground">Meta Receita</span>
        </div>
        <p className="text-xl font-bold text-foreground">{formatCurrency(incomeGoal)}</p>
        {incomeDiff !== null && isVisible && (
          <p className={cn(
            "text-xs mt-1",
            incomeDiff >= 0 ? "text-income" : "text-expense"
          )}>
            {incomeDiff >= 0 ? '+' : ''}{incomeDiff.toFixed(0)}% vs média
          </p>
        )}
      </Card>

      {/* Expense Goal */}
      <Card className="p-4 border-l-4 border-l-expense">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-expense/10 flex items-center justify-center">
            <TrendingDown className="h-4 w-4 text-expense" />
          </div>
          <span className="text-sm text-muted-foreground">Meta Gasto</span>
        </div>
        <p className="text-xl font-bold text-foreground">{formatCurrency(expenseGoal)}</p>
        {expenseDiff !== null && isVisible && (
          <p className={cn(
            "text-xs mt-1",
            expenseDiff <= 0 ? "text-income" : "text-expense"
          )}>
            {expenseDiff >= 0 ? '+' : ''}{expenseDiff.toFixed(0)}% vs média
          </p>
        )}
      </Card>

      {/* Savings Goal */}
      <Card className="p-4 border-l-4 border-l-primary">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <PiggyBank className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm text-muted-foreground">Meta Economia</span>
        </div>
        <p className="text-xl font-bold text-foreground">{formatCurrency(savingsGoal)}</p>
        {isVisible && (
          <p className="text-xs text-muted-foreground mt-1">
            {savingsPercent.toFixed(0)}% da receita
          </p>
        )}
      </Card>

      {/* Credit Card Goal */}
      <Card className="p-4 border-l-4 border-l-amber-500">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-amber-500" />
          </div>
          <span className="text-sm text-muted-foreground">Meta Cartão</span>
        </div>
        <p className="text-xl font-bold text-foreground">{formatCurrency(creditCardGoal)}</p>
        {creditCardLimit > 0 && isVisible && (
          <p className={cn(
            "text-xs mt-1",
            creditCardPercent <= 70 ? "text-income" : creditCardPercent <= 90 ? "text-amber-500" : "text-expense"
          )}>
            {creditCardPercent.toFixed(0)}% do limite
          </p>
        )}
      </Card>
    </div>
  );
}
