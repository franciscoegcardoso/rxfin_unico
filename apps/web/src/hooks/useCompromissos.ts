import { useQuery } from '@tanstack/react-query';

/**
 * @deprecated Use useRecorrentesExtrato ou useRecorrentesCartao.
 * Mantido apenas para compatibilidade até remoção de Compromissos.tsx.
 */

export interface CompromissoItem {
  id: string;
  description: string;
  average_amount: number;
  regularity_score?: number;
  regularity_pct: number;
  category: string | null;
  occurrence_count: number;
  last_occurrence_at: string | null;
  seen_this_month: boolean;
  last_amount: number | null;
  item_id: string | null;
  connector_name: string;
  connector_image_url: string | null;
}

export interface MonthlySummary {
  current_month: string;
  expected_expenses: number;
  expected_incomes: number;
  expenses_seen_this_month: number;
  incomes_seen_this_month: number;
  total_expenses_count: number;
  total_incomes_count: number;
  last_synced_at: string | null;
}

export interface CompromissosData {
  expenses: CompromissoItem[];
  incomes: CompromissoItem[];
  monthly_summary: MonthlySummary;
}

/** RPC get_compromissos_fixos não existe mais; retorna estrutura vazia para compatibilidade. */
async function fetchCompromissos(): Promise<CompromissosData | null> {
  return {
    expenses: [],
    incomes: [],
    monthly_summary: {
      current_month: '',
      expected_expenses: 0,
      expected_incomes: 0,
      expenses_seen_this_month: 0,
      incomes_seen_this_month: 0,
      total_expenses_count: 0,
      total_incomes_count: 0,
      last_synced_at: null,
    },
  };
}

export function useCompromissos() {
  return useQuery({
    queryKey: ['compromissos'],
    queryFn: fetchCompromissos,
    staleTime: 2 * 60 * 1000,
  });
}
