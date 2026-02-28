import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IncomeItem, ExpenseItem, ExpenseCategory, PaymentMethod, IncomeMethod, ExpenseType, ExpenseNature, RecurrenceType } from '@/types/financial';
import { DefaultIncomeItem, DefaultExpenseItem, ExpenseCategory as DbExpenseCategory } from './useDefaultParameters';

// Map database income items to application format
function mapDbIncomeToAppIncome(dbItem: DefaultIncomeItem): IncomeItem {
  return {
    id: dbItem.id,
    name: dbItem.name,
    enabled: dbItem.enabled_by_default,
    method: dbItem.method as IncomeMethod,
    isSystemDefault: true,
    isStockCompensation: dbItem.is_stock_compensation ?? undefined,
  };
}

// Map database expense items to application format
function mapDbExpenseToAppExpense(dbItem: DefaultExpenseItem): ExpenseItem {
  return {
    id: dbItem.id,
    categoryId: dbItem.category_id,
    category: dbItem.category_name,
    name: dbItem.name,
    expenseType: dbItem.expense_type as ExpenseType,
    enabled: dbItem.enabled_by_default,
    isRecurring: dbItem.is_recurring,
    paymentMethod: dbItem.payment_method as PaymentMethod,
    isSystemDefault: true,
    expenseNature: dbItem.expense_nature as ExpenseNature,
    recurrenceType: dbItem.recurrence_type as RecurrenceType,
  };
}

// Map database categories to application format
function mapDbCategoryToAppCategory(dbCategory: DbExpenseCategory): ExpenseCategory {
  return {
    id: dbCategory.id,
    name: dbCategory.name,
    reference: dbCategory.reference ?? undefined,
  };
}

// Hook to fetch active income defaults for onboarding
export function useOnboardingIncomeDefaults() {
  return useQuery({
    queryKey: ['onboarding-income-defaults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('default_income_items')
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      
      if (error) throw error;
      return (data as DefaultIncomeItem[]).map(mapDbIncomeToAppIncome);
    },
    staleTime: 60 * 1000, // 1 minute - defaults should refresh reasonably
  });
}

// Hook to fetch active expense defaults for onboarding
export function useOnboardingExpenseDefaults() {
  return useQuery({
    queryKey: ['onboarding-expense-defaults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('default_expense_items')
        .select('*')
        .eq('is_active', true)
        .order('category_id, order_index');
      
      if (error) throw error;
      return (data as DefaultExpenseItem[]).map(mapDbExpenseToAppExpense);
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// Hook to fetch active expense categories for onboarding
export function useOnboardingExpenseCategories() {
  return useQuery({
    queryKey: ['onboarding-expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      
      if (error) throw error;
      return (data as DbExpenseCategory[]).map(mapDbCategoryToAppCategory);
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// Combined hook for all onboarding defaults
export function useOnboardingDefaults() {
  const incomeQuery = useOnboardingIncomeDefaults();
  const expenseQuery = useOnboardingExpenseDefaults();
  const categoriesQuery = useOnboardingExpenseCategories();

  return {
    incomeItems: incomeQuery.data ?? [],
    expenseItems: expenseQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    isLoading: incomeQuery.isLoading || expenseQuery.isLoading || categoriesQuery.isLoading,
    isError: incomeQuery.isError || expenseQuery.isError || categoriesQuery.isError,
    error: incomeQuery.error || expenseQuery.error || categoriesQuery.error,
  };
}
