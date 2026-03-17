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
  /** User confirmed this recurrence; only confirmed count toward monthly total. */
  confirmed_by_user?: boolean;
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

const QUERY_KEY = ['recorrentes-cartao'];

export function useRecorrentesCartao() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchRecorrentesCartao,
    staleTime: 2 * 60 * 1000,
  });
}

/** Confirm a recurrence (counts toward monthly total). Uses RPC confirmar_recorrente_cartao. */
export async function confirmRecorrenteCartao(id: string): Promise<void> {
  const { error } = await supabase.rpc('confirmar_recorrente_cartao', { p_id: id });
  if (error) throw error;
}

/** Ignore/dismiss a suggestion (set is_active = false). Uses RPC ignorar_recorrente_cartao. */
export async function ignorarRecorrenteCartao(id: string): Promise<void> {
  const { error } = await supabase.rpc('ignorar_recorrente_cartao', { p_id: id });
  if (error) throw error;
}

export { QUERY_KEY as RECORRENTES_CARTAO_QUERY_KEY };
