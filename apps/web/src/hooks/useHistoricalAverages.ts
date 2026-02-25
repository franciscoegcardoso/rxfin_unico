import { useMemo } from 'react';
import { useLancamentosRealizados } from './useLancamentosRealizados';
import { CalculationBase } from './useMonthlyGoals';
import { ExpenseItem, ExpenseNature, IncomeItem } from '@/types/financial';

/**
 * Retorna a base de cálculo ideal baseada na natureza da despesa:
 * - Fixa: último mês (valor constante)
 * - Semi-variável: média 3 meses (variação pequena)
 * - Variável: média 6 meses (imprevisível, precisa mais histórico)
 */
export const getBaseByExpenseNature = (nature?: ExpenseNature): Exclude<CalculationBase, 'auto_by_nature'> => {
  switch (nature) {
    case 'fixed':
      return 'avg_1_month';
    case 'semi_variable':
      return 'avg_3_months';
    case 'variable':
      return 'avg_6_months';
    default:
      return 'avg_3_months'; // Padrão para itens sem natureza definida
  }
};

/**
 * Labels curtos para exibição na tabela
 */
export const natureBaseShortLabels: Record<ExpenseNature, string> = {
  'fixed': 'M1',
  'semi_variable': 'M3',
  'variable': 'M6',
};

export interface HistoricalAverage {
  itemId: string;
  itemName: string;
  category: string;
  type: 'income' | 'expense';
  paymentMethod?: string;
  avg1: number;
  avg3: number;
  avg6: number;
  avg12: number;
  monthlyValues: Record<string, number>;
  last6Months: { month: string; value: number }[];
  last12Months: { month: string; value: number }[];
}

export interface CategoryAverage {
  category: string;
  avg1: number;
  avg3: number;
  avg6: number;
  avg12: number;
}

export interface PaymentMethodAverage {
  paymentMethod: string;
  avg1: number;
  avg3: number;
  avg6: number;
  avg12: number;
}

export interface GlobalTotals {
  income: { avg1: number; avg3: number; avg6: number; avg12: number };
  expense: { avg1: number; avg3: number; avg6: number; avg12: number };
  savings: { avg1: number; avg3: number; avg6: number; avg12: number };
  creditCard: { avg1: number; avg3: number; avg6: number; avg12: number };
}

const getMonthsBack = (referenceMonth: string, count: number): string[] => {
  const [year, month] = referenceMonth.split('-').map(Number);
  const months: string[] = [];
  
  for (let i = 1; i <= count; i++) {
    const date = new Date(year, month - 1 - i, 1);
    const m = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push(m);
  }
  
  return months;
};

const getMonthShortLabel = (month: string): string => {
  const [year, monthNum] = month.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(monthNum) - 1]}/${year.slice(2)}`;
};

const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
};

export function useHistoricalAverages(
  referenceMonth: string,
  incomeItems: IncomeItem[],
  expenseItems: ExpenseItem[]
) {
  const { lancamentos, loading } = useLancamentosRealizados();

  // Group lancamentos by month and item
  const lancamentosByMonthAndItem = useMemo(() => {
    const grouped: Record<string, Record<string, number>> = {};
    
    lancamentos.forEach(l => {
      const month = l.mes_referencia;
      if (!grouped[month]) grouped[month] = {};
      
      // Sum by nome (item name) as category grouping
      const key = `${l.tipo}:${l.nome}`;
      grouped[month][key] = (grouped[month][key] || 0) + l.valor_realizado;
    });
    
    return grouped;
  }, [lancamentos]);

  // Group by categoria for category-level averages
  const lancamentosByMonthAndCategory = useMemo(() => {
    const grouped: Record<string, Record<string, number>> = {};
    
    lancamentos.forEach(l => {
      const month = l.mes_referencia;
      if (!grouped[month]) grouped[month] = {};
      
      const key = `${l.tipo}:${l.categoria}`;
      grouped[month][key] = (grouped[month][key] || 0) + l.valor_realizado;
    });
    
    return grouped;
  }, [lancamentos]);

  // Group by payment method
  const lancamentosByMonthAndPayment = useMemo(() => {
    const grouped: Record<string, Record<string, number>> = {};
    
    lancamentos.filter(l => l.tipo === 'despesa').forEach(l => {
      const month = l.mes_referencia;
      if (!grouped[month]) grouped[month] = {};
      
      const method = l.forma_pagamento || 'other';
      grouped[month][method] = (grouped[month][method] || 0) + l.valor_realizado;
    });
    
    return grouped;
  }, [lancamentos]);

  // Calculate item-level averages
  const itemAverages = useMemo((): HistoricalAverage[] => {
    const months1 = getMonthsBack(referenceMonth, 1);
    const months3 = getMonthsBack(referenceMonth, 3);
    const months6 = getMonthsBack(referenceMonth, 6);
    const months12 = getMonthsBack(referenceMonth, 12);

    const results: HistoricalAverage[] = [];

    // Process expense items
    expenseItems.forEach(item => {
      const key = `despesa:${item.name}`;
      const monthlyValues: Record<string, number> = {};
      
      [...months12].forEach(m => {
        monthlyValues[m] = lancamentosByMonthAndItem[m]?.[key] || 0;
      });

      const vals1 = months1.map(m => monthlyValues[m] || 0);
      const vals3 = months3.map(m => monthlyValues[m] || 0);
      const vals6 = months6.map(m => monthlyValues[m] || 0);
      const vals12 = months12.map(m => monthlyValues[m] || 0);

      // Get last 6 months with labels (reverse to show oldest first)
      const last6Months = [...months6].reverse().map(m => ({
        month: getMonthShortLabel(m),
        value: monthlyValues[m] || 0
      }));

      // Get last 12 months with labels (reverse to show oldest first)
      const last12Months = [...months12].reverse().map(m => ({
        month: getMonthShortLabel(m),
        value: monthlyValues[m] || 0
      }));

      results.push({
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        type: 'expense',
        paymentMethod: item.paymentMethod,
        avg1: calculateAverage(vals1),
        avg3: calculateAverage(vals3),
        avg6: calculateAverage(vals6),
        avg12: calculateAverage(vals12),
        monthlyValues,
        last6Months,
        last12Months,
      });
    });

    // Process income items
    incomeItems.forEach(item => {
      const key = `receita:${item.name}`;
      const monthlyValues: Record<string, number> = {};
      
      [...months12].forEach(m => {
        monthlyValues[m] = lancamentosByMonthAndItem[m]?.[key] || 0;
      });

      const vals1 = months1.map(m => monthlyValues[m] || 0);
      const vals3 = months3.map(m => monthlyValues[m] || 0);
      const vals6 = months6.map(m => monthlyValues[m] || 0);
      const vals12 = months12.map(m => monthlyValues[m] || 0);

      // Get last 6 months with labels (reverse to show oldest first)
      const last6Months = [...months6].reverse().map(m => ({
        month: getMonthShortLabel(m),
        value: monthlyValues[m] || 0
      }));

      // Get last 12 months with labels (reverse to show oldest first)
      const last12Months = [...months12].reverse().map(m => ({
        month: getMonthShortLabel(m),
        value: monthlyValues[m] || 0
      }));

      results.push({
        itemId: item.id,
        itemName: item.name,
        category: 'Receita',
        type: 'income',
        avg1: calculateAverage(vals1),
        avg3: calculateAverage(vals3),
        avg6: calculateAverage(vals6),
        avg12: calculateAverage(vals12),
        monthlyValues,
        last6Months,
        last12Months,
      });
    });

    return results;
  }, [referenceMonth, expenseItems, incomeItems, lancamentosByMonthAndItem]);

  // Calculate category-level averages (expenses only)
  const categoryAverages = useMemo((): CategoryAverage[] => {
    const months1 = getMonthsBack(referenceMonth, 1);
    const months3 = getMonthsBack(referenceMonth, 3);
    const months6 = getMonthsBack(referenceMonth, 6);
    const months12 = getMonthsBack(referenceMonth, 12);

    const categories = [...new Set(expenseItems.map(i => i.category))];

    return categories.map(category => {
      const key = `despesa:${category}`;
      
      const vals1 = months1.map(m => lancamentosByMonthAndCategory[m]?.[key] || 0);
      const vals3 = months3.map(m => lancamentosByMonthAndCategory[m]?.[key] || 0);
      const vals6 = months6.map(m => lancamentosByMonthAndCategory[m]?.[key] || 0);
      const vals12 = months12.map(m => lancamentosByMonthAndCategory[m]?.[key] || 0);

      return {
        category,
        avg1: calculateAverage(vals1),
        avg3: calculateAverage(vals3),
        avg6: calculateAverage(vals6),
        avg12: calculateAverage(vals12),
      };
    });
  }, [referenceMonth, expenseItems, lancamentosByMonthAndCategory]);

  // Calculate payment method averages
  const paymentMethodAverages = useMemo((): PaymentMethodAverage[] => {
    const months1 = getMonthsBack(referenceMonth, 1);
    const months3 = getMonthsBack(referenceMonth, 3);
    const months6 = getMonthsBack(referenceMonth, 6);
    const months12 = getMonthsBack(referenceMonth, 12);

    const methods = ['credit_card', 'debit_card', 'pix', 'boleto', 'cash', 'auto_debit', 'other'];

    return methods.map(method => {
      const vals1 = months1.map(m => lancamentosByMonthAndPayment[m]?.[method] || 0);
      const vals3 = months3.map(m => lancamentosByMonthAndPayment[m]?.[method] || 0);
      const vals6 = months6.map(m => lancamentosByMonthAndPayment[m]?.[method] || 0);
      const vals12 = months12.map(m => lancamentosByMonthAndPayment[m]?.[method] || 0);

      return {
        paymentMethod: method,
        avg1: calculateAverage(vals1),
        avg3: calculateAverage(vals3),
        avg6: calculateAverage(vals6),
        avg12: calculateAverage(vals12),
      };
    }).filter(m => m.avg1 > 0 || m.avg3 > 0 || m.avg6 > 0 || m.avg12 > 0);
  }, [referenceMonth, lancamentosByMonthAndPayment]);

  // Calculate global totals
  const globalTotals = useMemo((): GlobalTotals => {
    const months1 = getMonthsBack(referenceMonth, 1);
    const months3 = getMonthsBack(referenceMonth, 3);
    const months6 = getMonthsBack(referenceMonth, 6);
    const months12 = getMonthsBack(referenceMonth, 12);

    const getMonthlyTotal = (month: string, type: 'receita' | 'despesa') => {
      return lancamentos
        .filter(l => l.mes_referencia === month && l.tipo === type)
        .reduce((sum, l) => sum + l.valor_realizado, 0);
    };

    const getCreditCardTotal = (month: string) => {
      return lancamentos
        .filter(l => l.mes_referencia === month && l.tipo === 'despesa' && l.forma_pagamento === 'credit_card')
        .reduce((sum, l) => sum + l.valor_realizado, 0);
    };

    const incomeAvg = (months: string[]) => calculateAverage(months.map(m => getMonthlyTotal(m, 'receita')));
    const expenseAvg = (months: string[]) => calculateAverage(months.map(m => getMonthlyTotal(m, 'despesa')));
    const ccAvg = (months: string[]) => calculateAverage(months.map(m => getCreditCardTotal(m)));

    const income = {
      avg1: incomeAvg(months1),
      avg3: incomeAvg(months3),
      avg6: incomeAvg(months6),
      avg12: incomeAvg(months12),
    };

    const expense = {
      avg1: expenseAvg(months1),
      avg3: expenseAvg(months3),
      avg6: expenseAvg(months6),
      avg12: expenseAvg(months12),
    };

    const creditCard = {
      avg1: ccAvg(months1),
      avg3: ccAvg(months3),
      avg6: ccAvg(months6),
      avg12: ccAvg(months12),
    };

    return {
      income,
      expense,
      savings: {
        avg1: income.avg1 - expense.avg1,
        avg3: income.avg3 - expense.avg3,
        avg6: income.avg6 - expense.avg6,
        avg12: income.avg12 - expense.avg12,
      },
      creditCard,
    };
  }, [referenceMonth, lancamentos]);

  // Helper to get average by calculation base
  const getAverageByBase = (
    averages: { avg1: number; avg3: number; avg6: number; avg12: number },
    base: CalculationBase
  ): number => {
    switch (base) {
      case 'avg_1_month': return averages.avg1;
      case 'avg_3_months': return averages.avg3;
      case 'avg_6_months': return averages.avg6;
      case 'avg_12_months': return averages.avg12;
      default: return averages.avg3;
    }
  };

  // Get item average by ID and base
  const getItemAverage = (itemId: string, base: CalculationBase): number => {
    const item = itemAverages.find(a => a.itemId === itemId);
    if (!item) return 0;
    return getAverageByBase(item, base);
  };

  // Get item data by ID
  const getItemData = (itemId: string): HistoricalAverage | undefined => {
    return itemAverages.find(a => a.itemId === itemId);
  };

  // Get category average by name and base
  const getCategoryAverage = (category: string, base: CalculationBase): number => {
    const cat = categoryAverages.find(c => c.category === category);
    if (!cat) return 0;
    return getAverageByBase(cat, base);
  };

  // Get payment method average
  const getPaymentMethodAverage = (method: string, base: CalculationBase): number => {
    const pm = paymentMethodAverages.find(p => p.paymentMethod === method);
    if (!pm) return 0;
    return getAverageByBase(pm, base);
  };

  // Get global totals by base
  const getGlobalTotalsByBase = (base: CalculationBase) => ({
    income: getAverageByBase(globalTotals.income, base),
    expense: getAverageByBase(globalTotals.expense, base),
    savings: getAverageByBase(globalTotals.savings, base),
    creditCard: getAverageByBase(globalTotals.creditCard, base),
  });

  return {
    loading,
    itemAverages,
    categoryAverages,
    paymentMethodAverages,
    globalTotals,
    getItemAverage,
    getItemData,
    getCategoryAverage,
    getPaymentMethodAverage,
    getGlobalTotalsByBase,
    getAverageByBase,
  };
}
