import { useCallback, useMemo } from 'react';
import { useFinancial } from '@/contexts/FinancialContext';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { useMonthlyGoals, ItemGoal } from '@/hooks/useMonthlyGoals';
import { useProjectionCalculator } from '@/hooks/useProjectionCalculator';

export interface ItemComparison {
  itemId: string;
  itemName: string;
  type: 'income' | 'expense';
  projected: number;      // Valor do planejamento mensal
  goal: number;           // Meta definida (ou projeção se não definida)
  actual: number;         // Valor realizado (soma dos lançamentos)
  hasCustomGoal: boolean; // Se a meta foi editada manualmente
  goalVsProjected: number; // Variação % meta vs projeção
  actualVsGoal: number;    // Variação % realizado vs meta
}

export interface MonthlyComparison {
  month: string;
  projectedIncome: number;
  projectedExpense: number;
  goalIncome: number;
  goalExpense: number;
  actualIncome: number;
  actualExpense: number;
  projectedSavings: number;
  goalSavings: number;
  actualSavings: number;
  // Credit card specific
  goalCreditCard: number;
  actualCreditCard: number;
  hasActuals: boolean;
  hasGoals: boolean;
}

const generateMonths = (startYear: number, numMonths: number = 24): string[] => {
  const months: string[] = [];
  const startDate = new Date(startYear, 0, 1);
  
  for (let i = 0; i < numMonths; i++) {
    const date = new Date(startDate);
    date.setMonth(startDate.getMonth() + i);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push(month);
  }
  
  return months;
};

export function useGoalsProjectionIntegration() {
  const { config, getMonthlyEntry } = useFinancial();
  const { lancamentos } = useLancamentosRealizados();
  const { goals, getGoalByMonth } = useMonthlyGoals();
  
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const allMonths = useMemo(() => generateMonths(2025, 24), []);
  
  const enabledIncomeItems = useMemo(() => 
    config.incomeItems.filter(item => item.enabled),
    [config.incomeItems]
  );
  
  const enabledExpenseItems = useMemo(() => 
    config.expenseItems.filter(item => item.enabled),
    [config.expenseItems]
  );
  
  // Projection calculator hook
  const projectionCalculator = useProjectionCalculator({
    allMonths,
    currentMonth,
    monthlyEntries: config.monthlyEntries,
    incomeItems: enabledIncomeItems,
    expenseItems: enabledExpenseItems,
    projectionDefaults: config.projectionDefaults,
    getMonthlyEntry,
  });

  // Get actual value from lancamentos
  const getActualValue = useCallback((
    month: string, 
    itemId: string, 
    itemName: string,
    type: 'income' | 'expense'
  ): number => {
    const tipoLancamento = type === 'income' ? 'receita' : 'despesa';
    
    // Match by item name (since lançamentos store nome, not itemId)
    const matching = lancamentos.filter(l => 
      l.mes_referencia === month && 
      l.tipo === tipoLancamento && 
      l.nome.toLowerCase() === itemName.toLowerCase()
    );
    
    return matching.reduce((sum, l) => sum + l.valor_realizado, 0);
  }, [lancamentos]);

  // Get total actual by type for a month
  const getMonthActualTotal = useCallback((
    month: string,
    type: 'income' | 'expense'
  ): number => {
    const tipoLancamento = type === 'income' ? 'receita' : 'despesa';
    
    const matching = lancamentos.filter(l => 
      l.mes_referencia === month && 
      l.tipo === tipoLancamento
    );
    
    return matching.reduce((sum, l) => sum + l.valor_realizado, 0);
  }, [lancamentos]);

  // Check if month has any actual lancamentos
  const hasActualsForMonth = useCallback((month: string): boolean => {
    return lancamentos.some(l => l.mes_referencia === month);
  }, [lancamentos]);

  // Get projected value for an item in a specific month
  const getProjectedValue = useCallback((
    itemId: string,
    type: 'income' | 'expense',
    month: string
  ): number => {
    const items = type === 'income' ? enabledIncomeItems : enabledExpenseItems;
    const item = items.find(i => i.id === itemId);
    
    if (!item) return 0;
    
    return projectionCalculator.getProjectedValue(item, month, type);
  }, [enabledIncomeItems, enabledExpenseItems, projectionCalculator]);

  // Get goal value for an item, falling back to projection if not set
  const getGoalValue = useCallback((
    month: string,
    itemId: string,
    type: 'income' | 'expense'
  ): { value: number; isCustom: boolean } => {
    const monthGoal = getGoalByMonth(month);
    
    if (monthGoal) {
      const itemGoals = monthGoal.item_goals || {};
      const itemGoal = itemGoals[itemId];
      
      if (itemGoal && itemGoal.goal > 0) {
        return { value: itemGoal.goal, isCustom: true };
      }
    }
    
    // Fallback to projection
    const projectedValue = getProjectedValue(itemId, type, month);
    return { value: projectedValue, isCustom: false };
  }, [getGoalByMonth, getProjectedValue]);

  // Get goal totals for a month
  const getGoalTotals = useCallback((month: string): { income: number; expense: number } => {
    const monthGoal = getGoalByMonth(month);
    
    if (monthGoal) {
      return {
        income: monthGoal.income_goal || 0,
        expense: monthGoal.expense_goal || 0,
      };
    }
    
    // Fallback to calculated projections
    let incomeTotal = 0;
    let expenseTotal = 0;
    
    enabledIncomeItems.forEach(item => {
      incomeTotal += getProjectedValue(item.id, 'income', month);
    });
    
    enabledExpenseItems.forEach(item => {
      expenseTotal += getProjectedValue(item.id, 'expense', month);
    });
    
    return { income: incomeTotal, expense: expenseTotal };
  }, [getGoalByMonth, enabledIncomeItems, enabledExpenseItems, getProjectedValue]);

  // Calculate variation percentage
  const calcVariation = (value: number, base: number): number => {
    if (base === 0) return 0;
    return ((value - base) / base) * 100;
  };

  // Get complete comparison for a single item
  const getItemComparison = useCallback((
    month: string,
    itemId: string,
    type: 'income' | 'expense'
  ): ItemComparison | null => {
    const items = type === 'income' ? enabledIncomeItems : enabledExpenseItems;
    const item = items.find(i => i.id === itemId);
    
    if (!item) return null;
    
    const projected = getProjectedValue(itemId, type, month);
    const { value: goal, isCustom: hasCustomGoal } = getGoalValue(month, itemId, type);
    const actual = getActualValue(month, itemId, item.name, type);
    
    return {
      itemId,
      itemName: item.name,
      type,
      projected,
      goal,
      actual,
      hasCustomGoal,
      goalVsProjected: calcVariation(goal, projected),
      actualVsGoal: calcVariation(actual, goal),
    };
  }, [enabledIncomeItems, enabledExpenseItems, getProjectedValue, getGoalValue, getActualValue]);

  // Get credit card actual from lancamentos
  const getCreditCardActual = useCallback((month: string): number => {
    return lancamentos
      .filter(l => l.mes_referencia === month && l.tipo === 'despesa' && l.forma_pagamento === 'credit_card')
      .reduce((sum, l) => sum + l.valor_realizado, 0);
  }, [lancamentos]);

  // Get complete comparison for a month
  const getMonthlyComparison = useCallback((month: string): MonthlyComparison => {
    // Projected totals
    let projectedIncome = 0;
    let projectedExpense = 0;
    
    enabledIncomeItems.forEach(item => {
      projectedIncome += getProjectedValue(item.id, 'income', month);
    });
    
    enabledExpenseItems.forEach(item => {
      projectedExpense += getProjectedValue(item.id, 'expense', month);
    });
    
    // Goal totals
    const { income: goalIncome, expense: goalExpense } = getGoalTotals(month);
    
    // Actual totals
    const actualIncome = getMonthActualTotal(month, 'income');
    const actualExpense = getMonthActualTotal(month, 'expense');
    
    // Credit card specific
    const monthGoal = getGoalByMonth(month);
    const goalCreditCard = monthGoal?.credit_card_goal || 
      (monthGoal?.payment_method_goals as Record<string, number>)?.['credit_card'] || 
      0;
    const actualCreditCard = getCreditCardActual(month);
    
    // Check if has data
    const hasGoals = !!monthGoal;
    const hasActuals = hasActualsForMonth(month);
    
    return {
      month,
      projectedIncome,
      projectedExpense,
      goalIncome: goalIncome || projectedIncome,
      goalExpense: goalExpense || projectedExpense,
      actualIncome,
      actualExpense,
      projectedSavings: projectedIncome - projectedExpense,
      goalSavings: (goalIncome || projectedIncome) - (goalExpense || projectedExpense),
      actualSavings: actualIncome - actualExpense,
      goalCreditCard,
      actualCreditCard,
      hasActuals,
      hasGoals,
    };
  }, [
    enabledIncomeItems, 
    enabledExpenseItems, 
    getProjectedValue, 
    getGoalTotals, 
    getMonthActualTotal,
    getGoalByMonth,
    hasActualsForMonth,
    getCreditCardActual
  ]);

  // Get previous month string
  const getPreviousMonth = useCallback((month: string): string => {
    const [year, monthNum] = month.split('-').map(Number);
    const date = new Date(year, monthNum - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Calculate MoM variation
  const calcMoM = useCallback((current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current / previous) - 1) * 100;
  }, []);

  // Get display value for planning table (actual if exists, otherwise projection)
  const getDisplayValueForPlanning = useCallback((
    month: string,
    itemId: string,
    type: 'income' | 'expense'
  ): { value: number; isActual: boolean; isProjection: boolean } => {
    const items = type === 'income' ? enabledIncomeItems : enabledExpenseItems;
    const item = items.find(i => i.id === itemId);
    
    if (!item) return { value: 0, isActual: false, isProjection: false };
    
    // Check if there's an actual value
    const actual = getActualValue(month, itemId, item.name, type);
    if (actual > 0) {
      return { value: actual, isActual: true, isProjection: false };
    }
    
    // Otherwise use projection
    const projected = getProjectedValue(itemId, type, month);
    const isProjection = month > currentMonth;
    
    return { value: projected, isActual: false, isProjection };
  }, [enabledIncomeItems, enabledExpenseItems, getActualValue, getProjectedValue, currentMonth]);

  return {
    // Core data
    goals,
    lancamentos,
    currentMonth,
    enabledIncomeItems,
    enabledExpenseItems,
    
    // Getters
    getProjectedValue,
    getGoalValue,
    getActualValue,
    getMonthActualTotal,
    getGoalTotals,
    hasActualsForMonth,
    getCreditCardActual,
    
    // Comparisons
    getItemComparison,
    getMonthlyComparison,
    getDisplayValueForPlanning,
    
    // Month utilities
    getPreviousMonth,
    calcMoM,
    
    // Utility
    calcVariation,
  };
}
