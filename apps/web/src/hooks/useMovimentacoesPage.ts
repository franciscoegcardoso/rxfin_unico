import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface LancamentosSummaryData {
  month?: string;
  total_income?: number;
  total_expense?: number;
  balance?: number;
  count_total?: number;
  count_income?: number;
  count_expense?: number;
  paid?: { count: number; total: number };
  pending?: { count: number; total: number };
  overdue?: { count: number; total: number };
  by_payment_method?: Array<{ method: string; total: number; count: number }>;
  top_categories?: Array<{ category: string; total: number; count?: number; pct?: number }>;
}

export interface MovimentacoesPageData {
  month?: string;
  mv_summary?: unknown[];
  mv_breakdown?: unknown[];
  lancamentos_summary?: LancamentosSummaryData;
  recorrentes_extrato?: unknown[];
  recorrentes_cartao?: unknown[];
  fetched_at?: string;
}

export function useMovimentacoesPage(userId: string | undefined, currentMonth: string | undefined) {
  return useQuery({
    queryKey: ['movimentacoes-page', userId, currentMonth],
    queryFn: async (): Promise<MovimentacoesPageData> => {
      const { data, error } = await supabase.rpc('get_movimentacoes_page_data', {
        p_user_id: userId,
        p_month: currentMonth,
      });
      if (error) throw error;
      return (data ?? {}) as MovimentacoesPageData;
    },
    staleTime: 60_000,
    enabled: !!userId && !!currentMonth,
  });
}
