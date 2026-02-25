import { useCallback, useMemo } from 'react';
import { 
  IncomeItem, 
  ExpenseItem, 
  MonthlyEntry, 
  ProjectionDefaults,
  CalculationBase,
  AdjustmentType
} from '@/types/financial';

// Índices econômicos aproximados (podem ser atualizados via API)
const ECONOMIC_INDICES: Record<AdjustmentType, number> = {
  ipca: 4.5, // % ao ano
  igpm: 5.0, // % ao ano
  ibovespa: 10.0, // % ao ano (variável)
  fixed: 0,
  none: 0,
};

interface UseProjectionCalculatorProps {
  allMonths: string[];
  currentMonth: string;
  monthlyEntries: MonthlyEntry[];
  incomeItems: IncomeItem[];
  expenseItems: ExpenseItem[];
  projectionDefaults?: ProjectionDefaults;
  getMonthlyEntry: (month: string, itemId: string, type: 'income' | 'expense') => number;
}

interface ProjectionResult {
  itemId: string;
  month: string;
  type: 'income' | 'expense';
  projectedValue: number;
  baseValue: number;
  adjustmentApplied: number;
  calculationBase: CalculationBase;
}

interface ProjectionImpact {
  totalIncomeChange: number;
  totalExpenseChange: number;
  totalBalanceChange: number;
  itemsAffected: number;
  monthsAffected: number;
  details: ProjectionResult[];
}

export function useProjectionCalculator({
  allMonths,
  currentMonth,
  monthlyEntries,
  incomeItems,
  expenseItems,
  projectionDefaults,
  getMonthlyEntry,
}: UseProjectionCalculatorProps) {
  
  // Get future months (M+1 onwards)
  const futureMonths = useMemo(() => {
    return allMonths.filter(m => m > currentMonth);
  }, [allMonths, currentMonth]);

  // Get historical months (up to and including current month)
  const historicalMonths = useMemo(() => {
    return allMonths.filter(m => m <= currentMonth);
  }, [allMonths, currentMonth]);

  // Check if an entry is manually overridden
  const isManualOverride = useCallback((month: string, itemId: string, type: 'income' | 'expense'): boolean => {
    const entry = monthlyEntries.find(
      e => e.month === month && e.itemId === itemId && e.type === type
    );
    return entry?.isManualOverride ?? false;
  }, [monthlyEntries]);

  // Get base value for projection based on calculation base
  const getBaseValue = useCallback((
    itemId: string, 
    type: 'income' | 'expense',
    calculationBase: CalculationBase,
    includeZeroMonths: boolean = false,
    referenceMonth?: string
  ): number => {
    const refMonth = referenceMonth || currentMonth;
    const refIndex = allMonths.indexOf(refMonth);
    
    let months: string[] = [];
    switch (calculationBase) {
      case 'last_month':
        months = refIndex > 0 ? [allMonths[refIndex - 1]] : [];
        break;
      case 'avg_3_months':
        months = allMonths.slice(Math.max(0, refIndex - 3), refIndex);
        break;
      case 'avg_6_months':
        months = allMonths.slice(Math.max(0, refIndex - 6), refIndex);
        break;
      case 'avg_12_months':
        months = allMonths.slice(Math.max(0, refIndex - 12), refIndex);
        break;
    }

    if (months.length === 0) return 0;

    const values = months.map(m => getMonthlyEntry(m, itemId, type));
    const filteredValues = includeZeroMonths ? values : values.filter(v => v > 0);
    
    if (filteredValues.length === 0) return 0;
    
    return filteredValues.reduce((sum, v) => sum + v, 0) / filteredValues.length;
  }, [allMonths, currentMonth, getMonthlyEntry]);

  // Calculate monthly adjustment percentage
  const getMonthlyAdjustment = useCallback((
    adjustmentType: AdjustmentType | 'percentage' | 'fixed_value' | 'none',
    adjustmentValue: number = 0
  ): number => {
    if (adjustmentType === 'none') return 0;
    if (adjustmentType === 'percentage') return adjustmentValue / 100;
    if (adjustmentType === 'fixed_value') return 0; // Handled separately
    
    // Economic indices (annual to monthly)
    const annualRate = ECONOMIC_INDICES[adjustmentType as AdjustmentType] || 0;
    const monthlyRate = Math.pow(1 + annualRate / 100, 1/12) - 1;
    return monthlyRate + (adjustmentValue / 100); // Add additional percentage
  }, []);

  // Calculate projection for a single item/month
  const calculateProjection = useCallback((
    item: IncomeItem | ExpenseItem,
    month: string,
    type: 'income' | 'expense'
  ): ProjectionResult => {
    const config = item.projectionConfig;
    const defaults = projectionDefaults;
    
    let adjustmentType: AdjustmentType | 'percentage' | 'fixed_value' | 'none';
    let adjustmentValue: number;
    let calculationBase: CalculationBase;
    let includeZeroMonths: boolean;

    if (type === 'income') {
      adjustmentType = config?.adjustmentType || defaults?.incomeAdjustmentType || 'none';
      adjustmentValue = (config as any)?.adjustmentValue || defaults?.incomeAdjustmentValue || 0;
      calculationBase = config?.calculationBase || defaults?.incomeCalculationBase || 'last_month';
      includeZeroMonths = config?.includeZeroMonths ?? defaults?.incomeIncludeZeroMonths ?? false;
    } else {
      adjustmentType = (config as any)?.adjustmentType || defaults?.expenseAdjustmentType || 'none';
      adjustmentValue = (config as any)?.additionalPercentage || defaults?.expenseAdditionalPercentage || 0;
      calculationBase = config?.calculationBase || defaults?.expenseCalculationBase || 'last_month';
      includeZeroMonths = config?.includeZeroMonths ?? defaults?.expenseIncludeZeroMonths ?? false;
    }

    const baseValue = getBaseValue(item.id, type, calculationBase, includeZeroMonths);
    
    let projectedValue = baseValue;
    let adjustmentApplied = 0;

    if (adjustmentType === 'fixed_value' && type === 'income') {
      // Fixed value increase (not percentage)
      projectedValue = baseValue + adjustmentValue;
      adjustmentApplied = adjustmentValue;
    } else {
      const monthlyAdjustment = getMonthlyAdjustment(adjustmentType, adjustmentValue);
      
      // Calculate months from current to target
      const currentIdx = allMonths.indexOf(currentMonth);
      const targetIdx = allMonths.indexOf(month);
      const monthsDiff = targetIdx - currentIdx;
      
      // Apply compound adjustment
      if (monthsDiff > 0 && monthlyAdjustment !== 0) {
        projectedValue = baseValue * Math.pow(1 + monthlyAdjustment, monthsDiff);
        adjustmentApplied = projectedValue - baseValue;
      }
    }

    return {
      itemId: item.id,
      month,
      type,
      projectedValue: Math.round(projectedValue * 100) / 100,
      baseValue,
      adjustmentApplied: Math.round(adjustmentApplied * 100) / 100,
      calculationBase,
    };
  }, [allMonths, currentMonth, getBaseValue, getMonthlyAdjustment, projectionDefaults]);

  // Calculate impact of applying projections
  const calculateProjectionImpact = useCallback((
    scope: 'all' | 'month' | 'cell',
    targetMonth?: string,
    targetItemId?: string,
    targetType?: 'income' | 'expense'
  ): ProjectionImpact => {
    const details: ProjectionResult[] = [];
    let totalIncomeChange = 0;
    let totalExpenseChange = 0;
    const monthsSet = new Set<string>();
    const itemsSet = new Set<string>();

    const enabledIncomeItems = incomeItems.filter(i => i.enabled);
    const enabledExpenseItems = expenseItems.filter(i => i.enabled);

    const processItem = (item: IncomeItem | ExpenseItem, type: 'income' | 'expense', month: string) => {
      // Skip if manually overridden
      if (isManualOverride(month, item.id, type)) return;
      
      const currentValue = getMonthlyEntry(month, item.id, type);
      const projection = calculateProjection(item, month, type);
      const change = projection.projectedValue - currentValue;

      if (Math.abs(change) > 0.01) {
        details.push(projection);
        monthsSet.add(month);
        itemsSet.add(item.id);

        if (type === 'income') {
          totalIncomeChange += change;
        } else {
          totalExpenseChange += change;
        }
      }
    };

    if (scope === 'cell' && targetMonth && targetItemId && targetType) {
      const item = targetType === 'income' 
        ? enabledIncomeItems.find(i => i.id === targetItemId)
        : enabledExpenseItems.find(i => i.id === targetItemId);
      if (item) processItem(item, targetType, targetMonth);
    } else if (scope === 'month' && targetMonth) {
      enabledIncomeItems.forEach(item => processItem(item, 'income', targetMonth));
      enabledExpenseItems.forEach(item => processItem(item, 'expense', targetMonth));
    } else {
      futureMonths.forEach(month => {
        enabledIncomeItems.forEach(item => processItem(item, 'income', month));
        enabledExpenseItems.forEach(item => processItem(item, 'expense', month));
      });
    }

    return {
      totalIncomeChange: Math.round(totalIncomeChange * 100) / 100,
      totalExpenseChange: Math.round(totalExpenseChange * 100) / 100,
      totalBalanceChange: Math.round((totalIncomeChange - totalExpenseChange) * 100) / 100,
      itemsAffected: itemsSet.size,
      monthsAffected: monthsSet.size,
      details,
    };
  }, [
    futureMonths, 
    incomeItems, 
    expenseItems, 
    isManualOverride, 
    getMonthlyEntry, 
    calculateProjection
  ]);

  // Get projection for display (without applying)
  const getProjectedValue = useCallback((
    item: IncomeItem | ExpenseItem,
    month: string,
    type: 'income' | 'expense'
  ): number => {
    if (month <= currentMonth) {
      return getMonthlyEntry(month, item.id, type);
    }
    
    // If manually overridden, return stored value
    if (isManualOverride(month, item.id, type)) {
      return getMonthlyEntry(month, item.id, type);
    }
    
    // Check if there's a stored value
    const storedValue = getMonthlyEntry(month, item.id, type);
    if (storedValue > 0) return storedValue;
    
    // Calculate projection
    const projection = calculateProjection(item, month, type);
    return projection.projectedValue;
  }, [currentMonth, getMonthlyEntry, isManualOverride, calculateProjection]);

  return {
    futureMonths,
    historicalMonths,
    isManualOverride,
    calculateProjection,
    calculateProjectionImpact,
    getProjectedValue,
    getBaseValue,
  };
}
