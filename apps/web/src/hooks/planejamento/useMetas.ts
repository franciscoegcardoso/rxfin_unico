import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MetaComProgresso {
  id: string;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  percent_done: number;
  months_remaining: number | null;
  required_monthly: number;
  risk_level: 'ok' | 'atencao' | 'critica' | 'concluida' | 'sem_prazo' | 'vencida';
}

export function useMetas() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['metas-progresso', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc('get_metas_com_progresso', { p_user_id: userId });
      if (error) throw error;
      return (data as MetaComProgresso[]) ?? [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export interface AddAporteMetaInput {
  goalId: string;
  amount: number;
  referenceMonth: string; // YYYY-MM
}

export function useAddAporteMeta() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddAporteMetaInput) => {
      if (!userId) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase.rpc('add_aporte_meta', {
        p_user_id: userId,
        p_goal_id: input.goalId,
        p_amount: input.amount,
        p_reference_month: input.referenceMonth,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      // Invalidate the exact keys used in useMetas and useVersaoMensal (monthly view)
      queryClient.invalidateQueries({ queryKey: ['metas-progresso', userId] });
      queryClient.invalidateQueries({ queryKey: ['visao-mensal-realizado'] });
    },
  });
}

