import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PluggyLoan {
  id: string;
  product_name: string;
  type: string | null;
  contract_amount: number | null;
  outstanding_balance: number | null;
  cet_annual_pct: number | null;
  cet_monthly_pct?: number | null;
  pre_fixed_rate_pct?: number | null;
  contract_date?: string | null;
  first_installment_due_date?: string | null;
  due_date: string | null;
  total_installments: number | null;
  paid_installments: number | null;
  past_due_installments: number | null;
  is_overdue: boolean;
  progress_pct: number | null;
  amortization_system: string | null;
  connector_name: string;
  connector_image_url: string | null;
  last_synced_at: string | null;
  source: 'pluggy';
}

export interface ManualLoan {
  id: string;
  nome: string;
  instituicao: string | null;
  valor_financiado: number | null;
  saldo_devedor: number | null;
  valor_parcela: number | null;
  taxa_juros_mensal: number | null;
  prazo_total: number | null;
  parcelas_pagas: number | null;
  progress_pct: number | null;
  source: 'manual';
}

export interface EndividamentoSummary {
  total_pluggy_outstanding: number;
  total_manual_outstanding: number;
  total_outstanding: number;
  pluggy_loans_count: number;
  manual_loans_count: number;
  overdue_count: number;
  has_overdue: boolean;
  avg_cet_annual_pct: number | null;
  max_cet_annual_pct?: number | null;
}

export interface EndividamentoData {
  pluggy_loans: PluggyLoan[];
  manual_loans: ManualLoan[];
  summary: EndividamentoSummary;
}

async function fetchEndividamento(): Promise<EndividamentoData | null> {
  const { data, error } = await supabase.rpc('get_endividamento');
  if (error) throw error;
  return data as EndividamentoData | null;
}

export function useEndividamento() {
  return useQuery({
    queryKey: ['endividamento'],
    queryFn: fetchEndividamento,
    staleTime: 2 * 60 * 1000,
  });
}
