import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface DefaultIncomeItem {
  id: string;
  name: string;
  method: string;
  enabled_by_default: boolean;
  is_stock_compensation: boolean | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DefaultExpenseItem {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  expense_type: string;
  expense_nature: string;
  recurrence_type: string;
  is_recurring: boolean;
  payment_method: string;
  enabled_by_default: boolean;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  reference: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Hook for fetching default income items
export function useDefaultIncomeItems() {
  return useQuery({
    queryKey: ['default-income-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('default_income_items')
        .select('*')
        .order('order_index');
      
      if (error) throw error;
      return data as DefaultIncomeItem[];
    },
    staleTime: 60 * 1000, // 1 minute - admin changes should reflect reasonably quickly
  });
}

// Hook for fetching default expense items
export function useDefaultExpenseItems() {
  return useQuery({
    queryKey: ['default-expense-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('default_expense_items')
        .select('*')
        .order('category_id, order_index');
      
      if (error) throw error;
      return data as DefaultExpenseItem[];
    },
    staleTime: 60 * 1000, // 1 minute - admin changes should reflect reasonably quickly
  });
}

// Hook for fetching expense categories
export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('order_index');
      
      if (error) throw error;
      return data as ExpenseCategory[];
    },
    staleTime: 60 * 1000, // 1 minute - admin changes should reflect reasonably quickly
  });
}

// Admin mutations for income items
export function useDefaultIncomeItemMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (item: Omit<DefaultIncomeItem, 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('default_income_items')
        .insert(item)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-income-items'] });
      toast.success('Receita default adicionada');
    },
    onError: (error) => {
      console.error('Error creating income item:', error);
      toast.error('Erro ao adicionar receita');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DefaultIncomeItem> }) => {
      const { data, error } = await supabase
        .from('default_income_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-income-items'] });
      toast.success('Receita atualizada');
    },
    onError: (error) => {
      console.error('Error updating income item:', error);
      toast.error('Erro ao atualizar receita');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('default_income_items')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['default-income-items'] });
      toast.success(is_active ? 'Receita ativada' : 'Receita desativada');
    },
    onError: (error) => {
      console.error('Error toggling income item:', error);
      toast.error('Erro ao alterar status');
    },
  });

  return {
    create: createMutation.mutate,
    update: updateMutation.mutate,
    toggleActive: toggleActiveMutation.mutate,
    isLoading: createMutation.isPending || updateMutation.isPending || toggleActiveMutation.isPending,
  };
}

// Admin mutations for expense items
export function useDefaultExpenseItemMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (item: Omit<DefaultExpenseItem, 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('default_expense_items')
        .insert(item)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-expense-items'] });
      toast.success('Despesa default adicionada');
    },
    onError: (error) => {
      console.error('Error creating expense item:', error);
      toast.error('Erro ao adicionar despesa');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DefaultExpenseItem> }) => {
      const { data, error } = await supabase
        .from('default_expense_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-expense-items'] });
      toast.success('Despesa atualizada');
    },
    onError: (error) => {
      console.error('Error updating expense item:', error);
      toast.error('Erro ao atualizar despesa');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('default_expense_items')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['default-expense-items'] });
      toast.success(is_active ? 'Despesa ativada' : 'Despesa desativada');
    },
    onError: (error) => {
      console.error('Error toggling expense item:', error);
      toast.error('Erro ao alterar status');
    },
  });

  return {
    create: createMutation.mutate,
    update: updateMutation.mutate,
    toggleActive: toggleActiveMutation.mutate,
    isLoading: createMutation.isPending || updateMutation.isPending || toggleActiveMutation.isPending,
  };
}

// Admin mutations for categories
export function useExpenseCategoryMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (item: Omit<ExpenseCategory, 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert(item)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Categoria adicionada');
    },
    onError: (error) => {
      console.error('Error creating category:', error);
      toast.error('Erro ao adicionar categoria');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ExpenseCategory> }) => {
      const { data, error } = await supabase
        .from('expense_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Categoria atualizada');
    },
    onError: (error) => {
      console.error('Error updating category:', error);
      toast.error('Erro ao atualizar categoria');
    },
  });

  return {
    create: createMutation.mutate,
    update: updateMutation.mutate,
    isLoading: createMutation.isPending || updateMutation.isPending,
  };
}
