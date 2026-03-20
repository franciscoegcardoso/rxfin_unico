import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PluggyInvestment {
  id: string;
  display_name?: string;
  full_name?: string;
  ticker?: string;
  name: string;
  type: string | null;
  subtype: string | null;
  balance: number | null;
  balance_brl?: number;
  amount_original: number | null;
  amount_profit: number | null;
  profit_pct: number | null;
  fixed_annual_rate: number | null;
  annual_rate: number | null;
  index_name: string | null;
  due_date: string | null;
  issue_date: string | null;
  issuer: string | null;
  taxes: string | null;
  status: string | null;
  code: string | null;
  logo_url?: string | null;
  company_domain?: string | null;
  isin: string | null;
  quantity: number | null;
  unit_value: number | null;
  currency_code: string | null;
  balance_updated_at: string | null;
  suspect_zero: boolean | null;
  source: 'pluggy';
  connector_name: string;
  connector_image_url: string | null;
  /** IR já retido (campo taxes) — renda fixa */
  ir_retido?: number;
  /** IOF retido (campo taxes2) */
  iof_retido?: number;
  /** true para LCA, LCI, CRI, CRA */
  ir_exempt?: boolean;
  /** 'swing_trade' | 'fii_isento' | null */
  ir_regime?: string | null;
  /** alíquota IR (15%, 0%, tabela regressiva) */
  ir_rate_pct?: number | null;
  /** saldo convertido BRL para ativos em moeda estrangeira */
  balance_brl?: number;
  /** bloco de indexador para distribuição */
  indexador_bloco?: string;
  /** 'CDI' | 'SELIC' | 'IPCA' | null */
  rate_type?: string | null;
  last_twelve_months_rate?: number | null;
  last_month_rate?: number | null;
}

export interface ManualAsset {
  id: string;
  name: string;
  asset_type: string | null;
  category: string | null;
  current_value: number | null;
  purchase_value: number | null;
  purchase_date: string | null;
  status: string | null;
  source: 'manual';
  brand: string | null;
  model: string | null;
  year_model: number | null;
  fipe_code: string | null;
}

export interface BensByType {
  type: string;
  total: number;
  count: number;
  profit: number | null;
}

export interface BensInvestimentosSummary {
  total_pluggy_balance: number;
  total_pluggy_profit: number;
  total_manual_value: number;
  pluggy_count: number;
  manual_count: number;
  last_pluggy_sync: string | null;
  has_stale_data: boolean;
  /** Total IR retido na carteira (estimativa Pluggy) */
  total_ir_retido?: number;
  /** Total IOF retido */
  total_iof_retido?: number;
}

export interface BlocoByIndexador {
  bloco: string;
  total: number;
  count: number;
  ir_total: number;
  pct_carteira: number;
}

export interface BlocoByCurrency {
  currency: string;
  total_brl: number;
  count: number;
  pct_carteira: number;
}

export interface FxRates {
  USD_BRL: number;
  EUR_BRL: number;
  rate_date: string;
}

export interface BensInvestimentosData {
  pluggy_investments: PluggyInvestment[];
  manual_investments?: Array<{
    id: string;
    name: string;
    type: string;
    subtype?: string | null;
    gross_balance?: number | null;
    net_balance?: number | null;
    balance_date?: string | null;
    maturity_date?: string | null;
    institution?: string | null;
    ticker?: string | null;
    logo_url?: string | null;
    company_domain?: string | null;
  }>;
  manual_assets: ManualAsset[];
  by_type: BensByType[];
  summary: BensInvestimentosSummary;
  by_indexador?: BlocoByIndexador[];
  by_currency?: BlocoByCurrency[];
  fx_rates?: FxRates;
}

async function fetchBensInvestimentos(assetType: string | null = null): Promise<BensInvestimentosData | null> {
  const { data, error } = await supabase.rpc('get_bens_investimentos', { p_asset_type: assetType });
  if (error) throw error;
  return data as BensInvestimentosData | null;
}

/**
 * Se dados de logo_url parecerem antigos no browser após deploy, invalidar:
 * `queryClient.invalidateQueries({ queryKey: ['bens-investimentos'] })` ou limpar storage + hard reload.
 */
export function useBensInvestimentos(assetType: string | null = null) {
  return useQuery({
    queryKey: ['bens-investimentos', assetType],
    queryFn: () => fetchBensInvestimentos(assetType),
    staleTime: 2 * 60 * 1000,
  });
}
