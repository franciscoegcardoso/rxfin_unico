import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

async function fetchRecorrentesExtrato(): Promise<RecorrentesExtrato | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc('get_recorrentes_extrato', {
    p_user_id: user.id,
  });
  if (error) throw error;
  return data as RecorrentesExtrato | null;
}

export function useRecorrentesExtrato() {
  return useQuery({
    queryKey: ['recorrentes-extrato'],
    queryFn: fetchRecorrentesExtrato,
    staleTime: 2 * 60 * 1000,
  });
}
