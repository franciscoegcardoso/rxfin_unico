import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Check, CircleDot, Target, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGoalsProjectionIntegration } from '@/hooks/useGoalsProjectionIntegration';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MonthlyOverviewTableProps {
  months: string[];
  currentMonth: string;
  getMonthlyTotals: (month: string) => { income: number; expense: number; balance: number };
  formatCurrency: (value: number) => string;
  isMonthConsolidated: (month: string) => boolean;
  isHidden?: boolean;
}

const formatMonthLabel = (month: string) => {
  const [, monthNum] = month.split('-');
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return monthNames[parseInt(monthNum) - 1];
};

const formatCompactValue = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toFixed(0);
};

export const MonthlyOverviewTable: React.FC<MonthlyOverviewTableProps> = ({
  months,
  currentMonth,
  getMonthlyTotals,
  isMonthConsolidated,
  isHidden = false,
}) => {
  const isMobile = useIsMobile();
  const { getMonthlyComparison, getGoalTotals, hasActualsForMonth } = useGoalsProjectionIntegration();

  const monthsData = useMemo(() => {
    return months.map(month => {
      const comparison = getMonthlyComparison(month);
      const totals = getMonthlyTotals(month);
      const hasActuals = hasActualsForMonth(month);
      const goalTotals = getGoalTotals(month);
      
      return {
        month,
        label: formatMonthLabel(month),
        isCurrent: month === currentMonth,
        isProjection: month > currentMonth,
        isConsolidated: isMonthConsolidated(month),
        hasActuals,
        // Use actual values when available, otherwise use projected
        income: hasActuals ? comparison.actualIncome : totals.income,
        expense: hasActuals ? comparison.actualExpense : totals.expense,
        balance: hasActuals ? comparison.actualSavings : totals.balance,
        // For comparison
        projectedIncome: comparison.projectedIncome,
        projectedExpense: comparison.projectedExpense,
        goalIncome: goalTotals.income,
        goalExpense: goalTotals.expense,
      };
    });
  }, [months, currentMonth, getMonthlyTotals, isMonthConsolidated, getMonthlyComparison, hasActualsForMonth, getGoalTotals]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Visão Geral por Mês
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <TooltipProvider>
          <div className="w-full">
            {/* Legend */}
            <div className="flex items-center gap-4 mb-2 text-[10px] text-muted-foreground justify-end">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Realizado</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Projeção</span>
              </div>
            </div>

            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-12 md:w-14 py-2 text-left text-muted-foreground font-normal text-[10px]"></th>
                  {monthsData.map(({ month, label, isCurrent, isProjection, isConsolidated, hasActuals }) => (
                    <th
                      key={month}
                      className={cn(
                        "py-2 text-center font-medium relative",
                        isCurrent && "bg-amber-50 dark:bg-amber-950/20 rounded-t-md"
                      )}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-0.5">
                          {isConsolidated && (
                            <Check className="h-2.5 w-2.5 text-green-500" />
                          )}
                          <span className={cn(
                            "text-[11px] md:text-xs",
                            isCurrent && "font-bold text-amber-700 dark:text-amber-400",
                            isProjection && !isCurrent && "text-muted-foreground italic"
                          )}>
                            {label}
                          </span>
                        </div>
                        {isCurrent && (
                          <span className="text-[8px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                            Atual
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Income Row */}
                <tr className="border-b border-border/50">
                  <td className="py-2.5 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-income shrink-0" />
                      <span className="text-[10px]">Receitas</span>
                    </div>
                  </td>
                  {monthsData.map(({ month, income, isCurrent, hasActuals, isProjection, projectedIncome, goalIncome }) => (
                    <td
                      key={month}
                      className={cn(
                        "py-2.5 text-center relative",
                        isCurrent && "bg-amber-50 dark:bg-amber-950/20"
                      )}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center">
                            <span className={cn(
                              "text-[11px] md:text-xs text-income tabular-nums font-semibold",
                              hasActuals && "underline decoration-green-500 decoration-2 underline-offset-2"
                            )}>
                              {isHidden ? '••••' : formatCompactValue(income)}
                            </span>
                            {/* Status indicator */}
                            {!isMobile && (
                              <div className="flex items-center gap-0.5 mt-0.5">
                                {hasActuals ? (
                                  <CircleDot className="h-2 w-2 text-green-500" />
                                ) : isProjection ? (
                                  <CircleDot className="h-2 w-2 text-amber-400" />
                                ) : null}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <div className="space-y-1">
                            <div className="font-semibold">{hasActuals ? 'Realizado' : 'Projetado'}</div>
                            {hasActuals && projectedIncome > 0 && (
                              <div className="text-muted-foreground">
                                Projeção: {formatCompactValue(projectedIncome)}
                                <span className={cn(
                                  "ml-1",
                                  income >= projectedIncome ? "text-green-500" : "text-red-500"
                                )}>
                                  ({income >= projectedIncome ? '+' : ''}{((income - projectedIncome) / projectedIncome * 100).toFixed(0)}%)
                                </span>
                              </div>
                            )}
                            {goalIncome > 0 && (
                              <div className="text-muted-foreground flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                Meta: {formatCompactValue(goalIncome)}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  ))}
                </tr>
                {/* Expense Row */}
                <tr className="border-b border-border/50">
                  <td className="py-2.5 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-expense shrink-0" />
                      <span className="text-[10px]">Despesas</span>
                    </div>
                  </td>
                  {monthsData.map(({ month, expense, isCurrent, hasActuals, isProjection, projectedExpense, goalExpense }) => (
                    <td
                      key={month}
                      className={cn(
                        "py-2.5 text-center relative",
                        isCurrent && "bg-amber-50 dark:bg-amber-950/20"
                      )}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center">
                            <span className={cn(
                              "text-[11px] md:text-xs text-expense tabular-nums font-semibold",
                              hasActuals && "underline decoration-green-500 decoration-2 underline-offset-2"
                            )}>
                              {isHidden ? '••••' : formatCompactValue(expense)}
                            </span>
                            {/* Status indicator */}
                            {!isMobile && (
                              <div className="flex items-center gap-0.5 mt-0.5">
                                {hasActuals ? (
                                  <CircleDot className="h-2 w-2 text-green-500" />
                                ) : isProjection ? (
                                  <CircleDot className="h-2 w-2 text-amber-400" />
                                ) : null}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <div className="space-y-1">
                            <div className="font-semibold">{hasActuals ? 'Realizado' : 'Projetado'}</div>
                            {hasActuals && projectedExpense > 0 && (
                              <div className="text-muted-foreground">
                                Projeção: {formatCompactValue(projectedExpense)}
                                <span className={cn(
                                  "ml-1",
                                  expense <= projectedExpense ? "text-green-500" : "text-red-500"
                                )}>
                                  ({expense <= projectedExpense ? '' : '+'}{((expense - projectedExpense) / projectedExpense * 100).toFixed(0)}%)
                                </span>
                              </div>
                            )}
                            {goalExpense > 0 && (
                              <div className="text-muted-foreground flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                Meta: {formatCompactValue(goalExpense)}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  ))}
                </tr>
                {/* Balance Row */}
                <tr className="bg-muted/40">
                  <td className="py-2.5 font-semibold text-[10px]">Saldo</td>
                  {monthsData.map(({ month, balance, isCurrent, hasActuals }) => (
                    <td
                      key={month}
                      className={cn(
                        "py-2.5 text-center",
                        isCurrent && "bg-amber-100/60 dark:bg-amber-900/40 rounded-b-md"
                      )}
                    >
                      <span className={cn(
                        "text-xs md:text-sm font-bold tabular-nums",
                        balance >= 0 ? "text-income" : "text-expense",
                        hasActuals && "underline decoration-green-500 decoration-2 underline-offset-2"
                      )}>
                        {isHidden ? '••••' : formatCompactValue(balance)}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};