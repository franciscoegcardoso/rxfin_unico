import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface ItemGoal {
  goal: number;
  challenge: number;
  paymentBreakdown?: Record<string, number>;
}

export type CalculationBase = 'avg_1_month' | 'avg_3_months' | 'avg_6_months' | 'avg_12_months' | 'auto_by_nature';

export interface MonthlyGoal {
  id: string;
  user_id: string;
  month: string;
  income_goal: number;
  expense_goal: number;
  savings_goal: number;
  credit_card_goal: number;
  calculation_base: CalculationBase;
  challenge_percent: number;
  item_goals: Record<string, ItemGoal>;
  payment_method_goals: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface MonthlyGoalInput {
  month: string;
  income_goal?: number;
  expense_goal?: number;
  savings_goal?: number;
  credit_card_goal?: number;
  calculation_base?: CalculationBase;
  challenge_percent?: number;
  item_goals?: Record<string, ItemGoal>;
  payment_method_goals?: Record<string, number>;
}

const validBases: CalculationBase[] = ['avg_1_month', 'avg_3_months', 'avg_6_months', 'avg_12_months', 'auto_by_nature'];

function parseCalculationBase(value: string | null | undefined): CalculationBase {
  if (value && validBases.includes(value as CalculationBase)) {
    return value as CalculationBase;
  }
  return 'avg_3_months';
}

function mapRows(data: unknown[]): MonthlyGoal[] {
  return (data || []).map((g: Record<string, unknown>) => ({
    id: g.id as string,
    user_id: g.user_id as string,
    month: g.month as string,
    income_goal: (g.income_goal as number) ?? 0,
    expense_goal: (g.expense_goal as number) ?? 0,
    savings_goal: (g.savings_goal as number) ?? 0,
    credit_card_goal: (g.credit_card_goal as number) ?? 0,
    calculation_base: parseCalculationBase(g.calculation_base as string),
    challenge_percent: (g.challenge_percent as number) ?? 0,
    item_goals: (g.item_goals as Record<string, ItemGoal>) || {},
    payment_method_goals: (g.payment_method_goals as Record<string, number>) || {},
    created_at: g.created_at as string,
    updated_at: g.updated_at as string,
  }));
}

export function useMonthlyGoals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const {
    data: goals = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['monthly-goals', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_goals')
        .select('*')
        .eq('user_id', userId!)
        .order('month', { ascending: false });
      if (error) throw error;
      return mapRows(data || []);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const error = queryError ? 'Erro ao carregar metas' : null;

  const getGoalByMonth = useCallback(
    (month: string): MonthlyGoal | undefined => goals.find((g) => g.month === month),
    [goals]
  );

  const saveGoal = useCallback(
    async (input: MonthlyGoalInput): Promise<boolean> => {
      if (!user?.id) return false;
      const current = queryClient.getQueryData<MonthlyGoal[]>(['monthly-goals', user.id]) ?? goals;
      const existing = current.find((g) => g.month === input.month);
      try {
        if (existing) {
          const { error } = await supabase
            .from('monthly_goals')
            .update({
              income_goal: input.income_goal ?? existing.income_goal,
              expense_goal: input.expense_goal ?? existing.expense_goal,
              savings_goal: input.savings_goal ?? existing.savings_goal,
              credit_card_goal: input.credit_card_goal ?? existing.credit_card_goal,
              calculation_base: input.calculation_base ?? existing.calculation_base,
              challenge_percent: input.challenge_percent ?? existing.challenge_percent,
              item_goals: (input.item_goals ?? existing.item_goals) as unknown as Json,
              payment_method_goals: (input.payment_method_goals ?? existing.payment_method_goals) as unknown as Json,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('monthly_goals').insert([
            {
              user_id: user.id,
              month: input.month,
              income_goal: input.income_goal ?? 0,
              expense_goal: input.expense_goal ?? 0,
              savings_goal: input.savings_goal ?? 0,
              credit_card_goal: input.credit_card_goal ?? 0,
              calculation_base: input.calculation_base ?? 'avg_3_months',
              challenge_percent: input.challenge_percent ?? 0,
              item_goals: (input.item_goals ?? {}) as unknown as Json,
              payment_method_goals: (input.payment_method_goals ?? {}) as unknown as Json,
            },
          ]);
          if (error) throw error;
        }
        await queryClient.invalidateQueries({ queryKey: ['monthly-goals', user.id] });
        toast.success('Metas salvas com sucesso!');
        return true;
      } catch (err) {
        console.error('Error saving goal:', err);
        toast.error('Erro ao salvar metas');
        return false;
      }
    },
    [user?.id, goals, queryClient]
  );

  const deleteGoal = useCallback(
    async (month: string): Promise<boolean> => {
      if (!user?.id) return false;
      try {
        const { error } = await supabase.from('monthly_goals').delete().eq('user_id', user.id).eq('month', month);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['monthly-goals', user.id] });
        toast.success('Metas removidas');
        return true;
      } catch (err) {
        console.error('Error deleting goal:', err);
        toast.error('Erro ao remover metas');
        return false;
      }
    },
    [user?.id, queryClient]
  );

  return {
    goals,
    loading,
    error,
    fetchGoals: refetch,
    getGoalByMonth,
    saveGoal,
    deleteGoal,
  };
}
