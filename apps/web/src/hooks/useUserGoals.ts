import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FinancialGoal } from '@/types/financial';
import { toast } from 'sonner';
import { logCrudOperation } from '@/core/auditLog';

const QUERY_KEY = 'user-goals';

interface DbGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string | null;
  order_index: number;
}

const dbToApp = (row: DbGoal): FinancialGoal => ({
  id: row.id,
  name: row.name,
  targetAmount: row.target_amount,
  currentAmount: row.current_amount,
  deadline: row.deadline ? new Date(row.deadline) : new Date(),
});

export function useUserGoals() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: [QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_goals' as any)
        .select('*')
        .eq('user_id', userId)
        .order('order_index');
      if (error) throw error;
      return (data as unknown as DbGoal[]).map(dbToApp);
    },
    enabled: !!userId,
  });

  const addGoal = useMutation({
    mutationFn: async (goal: Omit<FinancialGoal, 'id'>) => {
      const start = performance.now();
      const payload = {
        user_id: userId,
        name: goal.name,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        deadline: goal.deadline instanceof Date ? goal.deadline.toISOString().split('T')[0] : goal.deadline,
      };
      const { data, error } = await supabase.from('user_goals' as any).insert(payload as any).select('id').single();
      await logCrudOperation({
        operation: 'CREATE',
        tableName: 'user_goals',
        recordId: (data as any)?.id,
        newData: payload as Record<string, unknown>,
        success: !error,
        errorMessage: error?.message,
        errorCode: error?.code,
        durationMs: Math.round(performance.now() - start),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    onError: () => toast.error('Erro ao adicionar meta'),
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FinancialGoal> }) => {
      const start = performance.now();
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.targetAmount !== undefined) dbUpdates.target_amount = updates.targetAmount;
      if (updates.currentAmount !== undefined) dbUpdates.current_amount = updates.currentAmount;
      if (updates.deadline !== undefined) {
        dbUpdates.deadline = updates.deadline instanceof Date ? updates.deadline.toISOString().split('T')[0] : updates.deadline;
      }
      const { data: oldRow } = await supabase.from('user_goals' as any).select('*').eq('id', id).single();
      const { error } = await supabase.from('user_goals' as any).update(dbUpdates).eq('id', id);
      await logCrudOperation({
        operation: 'UPDATE',
        tableName: 'user_goals',
        recordId: id,
        oldData: oldRow as Record<string, unknown>,
        newData: dbUpdates as Record<string, unknown>,
        success: !error,
        errorMessage: error?.message,
        errorCode: error?.code,
        durationMs: Math.round(performance.now() - start),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    onError: () => toast.error('Erro ao atualizar meta'),
  });

  const removeGoal = useMutation({
    mutationFn: async (id: string) => {
      const start = performance.now();
      const { data: oldRow } = await supabase.from('user_goals' as any).select('*').eq('id', id).single();
      const { error } = await supabase.from('user_goals' as any).delete().eq('id', id);
      await logCrudOperation({
        operation: 'DELETE',
        tableName: 'user_goals',
        recordId: id,
        oldData: oldRow as Record<string, unknown>,
        success: !error,
        errorMessage: error?.message,
        errorCode: error?.code,
        durationMs: Math.round(performance.now() - start),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    onError: () => toast.error('Erro ao remover meta'),
  });

  return {
    goals: query.data ?? [],
    isLoading: query.isLoading,
    addGoal,
    updateGoal,
    removeGoal,
  };
}
// sync
