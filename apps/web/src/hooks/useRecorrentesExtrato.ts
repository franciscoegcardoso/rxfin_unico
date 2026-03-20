import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useMovimentacoesPage } from '@/hooks/useMovimentacoesPage';

export interface RecorrenteItem {
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
  item_id: string | null;
  connector_name: string | null;
  connector_image_url: string | null;
}

export interface RecorrentesExtrato {
  compromissos: RecorrenteItem[];
  receitas: RecorrenteItem[];
  summary: {
    current_month: string;
    total_compromissos: number;
    total_receitas: number;
    expected_compromissos: number;
    expected_receitas: number;
    compromissos_seen_this_month: number;
  };
}

export function useRecorrentesExtrato(month?: string) {
  const { user } = useAuth();
  const currentMonth = month ?? format(new Date(), 'yyyy-MM');
  const query = useMovimentacoesPage(user?.id, currentMonth);
  return {
    data: (query.data?.recorrentes_extrato ?? null) as RecorrentesExtrato | null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
