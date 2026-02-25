import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type FinanceMode = 'openfinance' | 'manual' | null;

export function useFinanceMode() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: mode = null, isLoading } = useQuery({
    queryKey: ['finance-mode', user?.id],
    queryFn: async (): Promise<FinanceMode> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('finance_mode')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return (data?.finance_mode as FinanceMode) ?? null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { mutateAsync: setMode } = useMutation({
    mutationFn: async (newMode: FinanceMode) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update({ finance_mode: newMode } as any)
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-mode'] });
    },
  });

  return {
    mode,
    setMode,
    isLoading,
    isOpenFinance: mode === 'openfinance',
    isManual: mode === 'manual',
    hasChosen: mode !== null,
  };
}
// sync
