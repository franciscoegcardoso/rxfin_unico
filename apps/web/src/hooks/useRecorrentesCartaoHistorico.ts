import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MonthEntry {
  month: string;
  amount: number | null;
}

export interface HistoricoItem {
  recurring_id: string;
  description: string;
  confirmed: boolean;
  months: MonthEntry[];
}

export interface RecorrentesHistoricoData {
  months: string[];
  historico: HistoricoItem[];
  summary: {
    total_sugestoes: number;
    total_confirmadas: number;
    total_mensal_confirmado: number;
  };
}

async function fetchHistorico(): Promise<RecorrentesHistoricoData | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc('get_recorrentes_cartao_historico', {
    p_user_id: user.id,
  });
  if (error) throw error;

  const raw = data as RecorrentesHistoricoData | Array<{ recurring_id: string; months: Array<{ month: string; amount: number | null; present?: boolean }> }> | null;
  if (!raw) return null;

  if (typeof raw === 'object' && 'historico' in raw && Array.isArray((raw as RecorrentesHistoricoData).historico)) {
    return raw as RecorrentesHistoricoData;
  }

  const arr = Array.isArray(raw) ? raw : [];
  const months: string[] = arr[0]?.months?.map((m) => m.month) ?? [];
  const historico: HistoricoItem[] = arr.map((h) => ({
    recurring_id: h.recurring_id,
    description: '',
    confirmed: false,
    months: (h.months ?? []).map((m) => ({
      month: m.month,
      amount: m.amount ?? null,
    })),
  }));
  return {
    months,
    historico,
    summary: {
      total_sugestoes: 0,
      total_confirmadas: 0,
      total_mensal_confirmado: 0,
    },
  };
}

export function useRecorrentesCartaoHistorico() {
  return useQuery({
    queryKey: ['recorrentes-cartao-historico'],
    queryFn: fetchHistorico,
    staleTime: 2 * 60 * 1000,
  });
}
