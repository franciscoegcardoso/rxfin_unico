import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RecorrenteCartaoItem {
  id: string;
  description: string;
  average_amount: number;
  regularity_score: number;
  regularity_pct: number;
  category: string | null;
  account_subtype: string;
  occurrence_count: number;
  last_occurrence_at: string | null;
  next_expected_date: string | null;
  seen_this_month: boolean;
  last_amount: number | null;
  card_name: string | null;
  item_id: string | null;
  connector_name: string | null;
  connector_image_url: string | null;
}

export interface RecorrentesCartaoData {
  compras_recorrentes: RecorrenteCartaoItem[];
  summary: {
    current_month: string;
    total_recorrentes: number;
    total_mensal_estimado: number;
    vistas_este_mes: number;
  };
}

async function fetchRecorrentesCartao(): Promise<RecorrentesCartaoData | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc('get_recorrentes_cartao', {
    p_user_id: user.id,
  });
  if (error) throw error;
  return data as RecorrentesCartaoData | null;
}

export function useRecorrentesCartao() {
  return useQuery({
    queryKey: ['recorrentes-cartao'],
    queryFn: fetchRecorrentesCartao,
    staleTime: 2 * 60 * 1000,
  });
}
