import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TransactionIncomeCategory {
  id: string;
  name: string;
  method: string;
  isStockCompensation: boolean;
}

export interface TransactionExpenseCategory {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  expenseType: string;
  expenseNature: 'essential' | 'variable';
  isRecurring: boolean;
  paymentMethod: string;
}

export interface ExpenseCategoryGroup {
  id: string;
  name: string;
  items: TransactionExpenseCategory[];
}

// Hook to fetch active income categories for transaction forms
export function useTransactionIncomeCategories() {
  return useQuery({
    queryKey: ['transaction-income-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('default_income_items')
        .select('id, name, method, is_stock_compensation')
        .eq('is_active', true)
        .order('order_index');
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        method: item.method,
        isStockCompensation: item.is_stock_compensation ?? false,
      })) as TransactionIncomeCategory[];
    },
    staleTime: 30 * 60 * 1000,
  });
}

// Hook to fetch active expense categories for transaction forms
export function useTransactionExpenseCategories() {
  return useQuery({
    queryKey: ['transaction-expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('default_expense_items')
        .select('id, name, category_id, category_name, expense_type, expense_nature, is_recurring, payment_method')
        .eq('is_active', true)
        .order('category_id, order_index');
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        categoryId: item.category_id,
        categoryName: item.category_name,
        expenseType: item.expense_type,
        expenseNature: item.expense_nature as 'essential' | 'variable',
        isRecurring: item.is_recurring,
        paymentMethod: item.payment_method,
      })) as TransactionExpenseCategory[];
    },
    staleTime: 30 * 60 * 1000,
  });
}

// Hook to fetch expense categories grouped by category
export function useTransactionExpenseCategoryGroups() {
  const { data: items = [], isLoading, isError, error } = useTransactionExpenseCategories();
  
  // Group items by category
  const groups: ExpenseCategoryGroup[] = [];
  const categoryMap = new Map<string, ExpenseCategoryGroup>();
  
  items.forEach(item => {
    if (!categoryMap.has(item.categoryId)) {
      const group: ExpenseCategoryGroup = {
        id: item.categoryId,
        name: item.categoryName,
        items: [],
      };
      categoryMap.set(item.categoryId, group);
      groups.push(group);
    }
    categoryMap.get(item.categoryId)!.items.push(item);
  });
  
  return {
    groups,
    flatItems: items,
    isLoading,
    isError,
    error,
  };
}

// Combined hook for both income and expense categories
export function useTransactionCategories() {
  const incomeQuery = useTransactionIncomeCategories();
  const expenseQuery = useTransactionExpenseCategoryGroups();

  return {
    incomeCategories: incomeQuery.data ?? [],
    expenseGroups: expenseQuery.groups,
    expenseItems: expenseQuery.flatItems,
    isLoading: incomeQuery.isLoading || expenseQuery.isLoading,
    isError: incomeQuery.isError || expenseQuery.isError,
    error: incomeQuery.error || expenseQuery.error,
  };
}
// sync
