import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type PlanejamentoTab = 'mensal' | 'anual' | 'metas' | 'orcamento';

export interface PlanejamentoPageData {
  month?: string;
  year?: number;
  tab?: PlanejamentoTab;
  goals?: {
    income_goal?: number;
    expense_goal?: number;
    savings_goal?: number;
    credit_card_goal?: number;
    challenge_percent?: number;
  } | null;
  tab_data?: Record<string, unknown> | null;
  fetched_at?: string;
}

export function usePlanejamentoPage(
  userId: string | undefined,
  currentMonth: string | undefined,
  activeTab: PlanejamentoTab
) {
  return useQuery({
    queryKey: ['planejamento-page', userId, currentMonth, activeTab],
    queryFn: async (): Promise<PlanejamentoPageData> => {
      const { data, error } = await supabase.rpc('get_planejamento_page_data', {
        p_user_id: userId,
        p_month: currentMonth,
        p_tab: activeTab,
      });
      if (error) throw error;
      return (data ?? {}) as PlanejamentoPageData;
    },
    staleTime: 60_000,
    gcTime: 10 * 60 * 1000, // 10 min — mantém em memória entre navegações
    enabled: !!userId && !!currentMonth,
  });
}
