import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useMovimentacoesPage } from '@/hooks/useMovimentacoesPage';

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

const QUERY_KEY = ['recorrentes-cartao'];

export function useRecorrentesCartao(month?: string) {
  const { user } = useAuth();
  const currentMonth = month ?? format(new Date(), 'yyyy-MM');
  const query = useMovimentacoesPage(user?.id, currentMonth);
  return {
    data: (query.data?.recorrentes_cartao ?? null) as RecorrentesCartaoData | null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
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
