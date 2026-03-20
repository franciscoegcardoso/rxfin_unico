import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { usePlanejamentoPage } from '@/hooks/usePlanejamentoPage';

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
  receita_media_3m: number; // média de receita dos últimos 3 meses — vem da RPC
}

export function useMetas() {
  const { user } = useAuth();
  const userId = user?.id;
  const currentMonth = format(new Date(), 'yyyy-MM');
  const pageQuery = usePlanejamentoPage(userId, currentMonth, 'metas');

  return {
    data: (((pageQuery.data?.tab_data as { metas?: MetaComProgresso[] } | null)?.metas ?? []) as MetaComProgresso[]),
    isLoading: pageQuery.isLoading,
    error: pageQuery.error,
    refetch: pageQuery.refetch,
  };
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
      queryClient.invalidateQueries({ queryKey: ['planejamento-page', userId] });
      queryClient.invalidateQueries({ queryKey: ['monthly-goals', userId] });
    },
  });
}

