import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { IncomeItem, ExpenseItem, PaymentMethod, IncomeMethod, ExpenseType, ExpenseNature, RecurrenceType } from '@/types/financial';

// User's selected income items (database row type)
interface DbUserIncomeItem {
  id: string;
  user_id: string;
  default_item_id: string | null;
  name: string;
  method: string;
  enabled: boolean;
  is_stock_compensation: boolean;
  responsible_person_id: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// User's selected expense items (database row type)
interface DbUserExpenseItem {
  id: string;
  user_id: string;
  default_item_id: string | null;
  category_id: string;
  category_name: string;
  name: string;
  expense_type: string;
  expense_nature: string;
  recurrence_type: string;
  is_recurring: boolean;
  payment_method: string;
  enabled: boolean;
  responsible_person_id: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Convert database income item to app IncomeItem
export function dbIncomeToAppIncome(dbItem: DbUserIncomeItem): IncomeItem {
  return {
    id: dbItem.id,
    name: dbItem.name,
    enabled: dbItem.enabled,
    method: dbItem.method as IncomeMethod,
    isStockCompensation: dbItem.is_stock_compensation,
    responsiblePersonId: dbItem.responsible_person_id || undefined,
    isSystemDefault: !!dbItem.default_item_id,
  };
}

// Convert database expense item to app ExpenseItem
export function dbExpenseToAppExpense(dbItem: DbUserExpenseItem): ExpenseItem {
  return {
    id: dbItem.id,
    categoryId: dbItem.category_id,
    category: dbItem.category_name,
    name: dbItem.name,
    expenseType: dbItem.expense_type as ExpenseType,
    expenseNature: dbItem.expense_nature as ExpenseNature,
    recurrenceType: dbItem.recurrence_type as RecurrenceType,
    isRecurring: dbItem.is_recurring,
    enabled: dbItem.enabled,
    paymentMethod: dbItem.payment_method as PaymentMethod,
    responsiblePersonId: dbItem.responsible_person_id || undefined,
    isSystemDefault: !!dbItem.default_item_id,
  };
}

// Hook to fetch user's income items
export function useUserIncomeItems() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-income-items', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_income_items' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('order_index');
      
      if (error) throw error;
      return ((data || []) as unknown as DbUserIncomeItem[]).map(dbIncomeToAppIncome);
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds - user config should be reasonably fresh
  });
}

// Hook to fetch user's expense items
export function useUserExpenseItems() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-expense-items', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_expense_items' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('category_id, order_index');
      
      if (error) throw error;
      return ((data || []) as unknown as DbUserExpenseItem[]).map(dbExpenseToAppExpense);
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds - user config should be reasonably fresh
  });
}

// Hook to check if user has parameters initialized
export function useHasUserParameters() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['has-user-parameters', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { count, error } = await supabase
        .from('user_income_items' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) throw error;
      return (count || 0) > 0;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds - user config should be reasonably fresh
  });
}

// Hook to initialize user parameters from defaults
export function useInitializeUserParameters() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (selection: {
      incomeItemIds: string[];
      expenseItemIds: string[];
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Fetch selected default income items
      const { data: selectedIncome, error: incomeError } = await supabase
        .from('default_income_items')
        .select('*')
        .in('id', selection.incomeItemIds.length > 0 ? selection.incomeItemIds : ['__none__']);
      
      if (incomeError) throw incomeError;

      // Fetch selected default expense items
      const { data: selectedExpense, error: expenseError } = await supabase
        .from('default_expense_items')
        .select('*')
        .in('id', selection.expenseItemIds.length > 0 ? selection.expenseItemIds : ['__none__']);
      
      if (expenseError) throw expenseError;

      // Create user income items
      if (selectedIncome && selectedIncome.length > 0) {
        const userIncomeItems = selectedIncome.map((item: any, index: number) => ({
          user_id: user.id,
          default_item_id: item.id,
          name: item.name,
          method: item.method,
          enabled: item.enabled_by_default,
          is_stock_compensation: item.is_stock_compensation || false,
          order_index: index,
        }));

        const { error: insertIncomeError } = await supabase
          .from('user_income_items' as any)
          .upsert(userIncomeItems, { onConflict: 'user_id,name', ignoreDuplicates: true });
        
        if (insertIncomeError) throw insertIncomeError;
      }

      // Create user expense items
      if (selectedExpense && selectedExpense.length > 0) {
        const userExpenseItems = selectedExpense.map((item: any, index: number) => ({
          user_id: user.id,
          default_item_id: item.id,
          category_id: item.category_id,
          category_name: item.category_name,
          name: item.name,
          expense_type: item.expense_type,
          expense_nature: item.expense_nature,
          recurrence_type: item.recurrence_type,
          is_recurring: item.is_recurring,
          payment_method: item.payment_method,
          enabled: item.enabled_by_default,
          order_index: index,
        }));

        const { error: insertExpenseError } = await supabase
          .from('user_expense_items' as any)
          .upsert(userExpenseItems, { onConflict: 'user_id,name,category_id', ignoreDuplicates: true });
        
        if (insertExpenseError) throw insertExpenseError;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-income-items'] });
      queryClient.invalidateQueries({ queryKey: ['user-expense-items'] });
      queryClient.invalidateQueries({ queryKey: ['has-user-parameters'] });
      toast.success('Parâmetros configurados com sucesso!');
    },
    onError: (error) => {
      console.error('Error initializing user parameters:', error);
      toast.error('Erro ao configurar parâmetros');
    },
  });
}

// Hook to add a custom income item for the user
export function useAddUserIncomeItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<IncomeItem, 'id' | 'isSystemDefault'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_income_items' as any)
        .insert({
          user_id: user.id,
          name: item.name,
          method: item.method,
          enabled: item.enabled,
          is_stock_compensation: item.isStockCompensation || false,
          responsible_person_id: item.responsiblePersonId || null,
          order_index: 999,
        })
        .select()
        .single();
      
      if (error) throw error;
      return dbIncomeToAppIncome(data as unknown as DbUserIncomeItem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-income-items'] });
    },
    onError: (error) => {
      console.error('Error adding income item:', error);
      toast.error('Erro ao adicionar receita');
    },
  });
}

// Hook to update a user income item
export function useUpdateUserIncomeItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<IncomeItem> }) => {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
      if (updates.method !== undefined) dbUpdates.method = updates.method;
      if (updates.isStockCompensation !== undefined) dbUpdates.is_stock_compensation = updates.isStockCompensation;
      if (updates.responsiblePersonId !== undefined) dbUpdates.responsible_person_id = updates.responsiblePersonId || null;

      const { data, error } = await supabase
        .from('user_income_items' as any)
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return dbIncomeToAppIncome(data as unknown as DbUserIncomeItem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-income-items'] });
    },
    onError: (error) => {
      console.error('Error updating income item:', error);
      toast.error('Erro ao atualizar receita');
    },
  });
}

// Hook to delete a user income item
export function useDeleteUserIncomeItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_income_items' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-income-items'] });
    },
    onError: (error) => {
      console.error('Error deleting income item:', error);
      toast.error('Erro ao remover receita');
    },
  });
}

// Hook to add a custom expense item for the user
export function useAddUserExpenseItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<ExpenseItem, 'id' | 'isSystemDefault'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_expense_items' as any)
        .insert({
          user_id: user.id,
          category_id: item.categoryId,
          category_name: item.category || '',
          name: item.name,
          expense_type: item.expenseType || 'variable_non_essential',
          expense_nature: item.expenseNature || 'variable',
          recurrence_type: item.recurrenceType || 'monthly',
          is_recurring: item.isRecurring || false,
          payment_method: item.paymentMethod || 'credit_card',
          enabled: item.enabled,
          responsible_person_id: item.responsiblePersonId || null,
          order_index: 999,
        })
        .select()
        .single();
      
      if (error) throw error;
      return dbExpenseToAppExpense(data as unknown as DbUserExpenseItem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-expense-items'] });
    },
    onError: (error) => {
      console.error('Error adding expense item:', error);
      toast.error('Erro ao adicionar despesa');
    },
  });
}

// Hook to update a user expense item
export function useUpdateUserExpenseItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ExpenseItem> }) => {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.category !== undefined) dbUpdates.category_name = updates.category;
      if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
      if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring;
      if (updates.responsiblePersonId !== undefined) dbUpdates.responsible_person_id = updates.responsiblePersonId || null;
      if (updates.expenseNature !== undefined) dbUpdates.expense_nature = updates.expenseNature;
      if (updates.recurrenceType !== undefined) dbUpdates.recurrence_type = updates.recurrenceType;

      const { data, error } = await supabase
        .from('user_expense_items' as any)
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return dbExpenseToAppExpense(data as unknown as DbUserExpenseItem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-expense-items'] });
    },
    onError: (error) => {
      console.error('Error updating expense item:', error);
      toast.error('Erro ao atualizar despesa');
    },
  });
}

// Hook to delete a user expense item
export function useDeleteUserExpenseItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_expense_items' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-expense-items'] });
    },
    onError: (error) => {
      console.error('Error deleting expense item:', error);
      toast.error('Erro ao remover despesa');
    },
  });
}
// sync
