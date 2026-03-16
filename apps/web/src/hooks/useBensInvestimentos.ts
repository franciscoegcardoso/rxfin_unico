import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PluggyInvestment {
  id: string;
  name: string;
  type: string | null;
  subtype: string | null;
  balance: number | null;
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
  isin: string | null;
  quantity: number | null;
  unit_value: number | null;
  currency_code: string | null;
  balance_updated_at: string | null;
  suspect_zero: boolean | null;
  source: 'pluggy';
  connector_name: string;
  connector_image_url: string | null;
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
}

export interface BensInvestimentosData {
  pluggy_investments: PluggyInvestment[];
  manual_assets: ManualAsset[];
  by_type: BensByType[];
  summary: BensInvestimentosSummary;
}

async function fetchBensInvestimentos(assetType: string | null = null): Promise<BensInvestimentosData | null> {
  const { data, error } = await supabase.rpc('get_bens_investimentos', { p_asset_type: assetType });
  if (error) throw error;
  return data as BensInvestimentosData | null;
}

export function useBensInvestimentos(assetType: string | null = null) {
  return useQuery({
    queryKey: ['bens-investimentos', assetType],
    queryFn: () => fetchBensInvestimentos(assetType),
    staleTime: 2 * 60 * 1000,
  });
}
