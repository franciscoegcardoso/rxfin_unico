import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type PassivosTabSlug = 'consolidado' | 'dividas' | 'financiamentos' | 'consorcios';

export type PassivosPageData = {
  header?: {
    total_passivos: number;
    total_dividas: number;
    total_financiamentos: number;
    total_consorcios: number;
    parcela_mensal_total: number;
    dividas_count: number;
    financiamentos_count: number;
    consorcios_count: number;
    has_overdue: boolean;
    overdue_count: number;
    fetched_at: string;
  };
  tab?: PassivosTabSlug;
  tab_data?: Record<string, unknown>;
};

export function usePassivosPage(userId: string | undefined, activeTab: PassivosTabSlug) {
  return useQuery({
    queryKey: ['passivos-page', userId, activeTab],
    queryFn: async (): Promise<PassivosPageData> => {
      const { data, error } = await supabase.rpc('get_passivos_page_data', {
        p_user_id: userId,
        p_tab: activeTab,
      });
      if (error) throw error;
      return (data ?? {}) as PassivosPageData;
    },
    staleTime: 60_000,
    gcTime: 10 * 60 * 1000, // 10 min — mantém em memória entre navegações
    enabled: !!userId,
  });
}

