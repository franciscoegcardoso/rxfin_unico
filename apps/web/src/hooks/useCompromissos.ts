import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

async function fetchCompromissos(): Promise<CompromissosData | null> {
  const { data, error } = await supabase.rpc('get_compromissos_fixos');
  if (error) throw error;
  return data as CompromissosData | null;
}

export function useCompromissos() {
  return useQuery({
    queryKey: ['compromissos'],
    queryFn: fetchCompromissos,
    staleTime: 2 * 60 * 1000,
  });
}
