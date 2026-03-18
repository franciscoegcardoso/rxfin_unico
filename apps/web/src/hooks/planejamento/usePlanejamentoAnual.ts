import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MesAnual {
  month: string;
  planejado_receita: number;
  planejado_despesa: number;
  planejado_cartao: number;
  realizado_receita: number;
  realizado_despesa_extrato: number;
  realizado_cartao: number;
  saldo_planejado: number;
  saldo_realizado: number;
  has_data: boolean;
  has_planning: boolean; // true somente se monthly_goals foi configurado para o mês
  variacao_saldo: number;
}

export function usePlanejamentoAnual(year: number) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['planejamento-anual', userId, year],
    queryFn: async (): Promise<MesAnual[]> => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc('get_planejamento_anual_com_realizado', {
        p_user_id: userId,
        p_year: year,
      });
      if (error) throw error;

      const rows = (data as any[]) ?? [];
      return rows.map((r) => {
        const saldoRealizado = Number(r.realizado_receita ?? 0) - Number(r.realizado_despesa_extrato ?? 0) - Number(r.realizado_cartao ?? 0);
        const saldoPlanejado = Number(r.planejado_receita ?? 0) - Number(r.planejado_despesa ?? 0) - Number(r.planejado_cartao ?? 0);
        return {
          month: r.month,
          planejado_receita: Number(r.planejado_receita ?? 0),
          planejado_despesa: Number(r.planejado_despesa ?? 0),
          planejado_cartao: Number(r.planejado_cartao ?? 0),
          realizado_receita: Number(r.realizado_receita ?? 0),
          realizado_despesa_extrato: Number(r.realizado_despesa_extrato ?? 0),
          realizado_cartao: Number(r.realizado_cartao ?? 0),
          saldo_planejado: Number(r.saldo_planejado ?? saldoPlanejado),
          saldo_realizado: Number(r.saldo_realizado ?? saldoRealizado),
          has_data: Boolean(r.has_data),
          has_planning: Boolean(r.has_planning),
          variacao_saldo: (Number(r.saldo_realizado ?? saldoRealizado) - Number(r.saldo_planejado ?? saldoPlanejado)),
        } as MesAnual;
      });
    },
    enabled: !!userId && !!year,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function useCloseMonth() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { month: string }) => {
      if (!userId) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase.rpc('close_month_to_annual', {
        p_user_id: userId,
        p_month: input.month,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, _vars) => {
      queryClient.invalidateQueries({ queryKey: ['planejamento-anual', userId] });
      queryClient.invalidateQueries({ queryKey: ['visao-mensal-realizado'] });
    },
  });
}

