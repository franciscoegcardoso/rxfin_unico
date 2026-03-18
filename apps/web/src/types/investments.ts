/** Row from RPC get_investment_sync_status (per Pluggy connection). */
export type InvestmentSyncState = 'syncing' | 'login_error' | 'maturing' | 'suspect_zero' | 'ok';

export type InvestmentSyncAlertLevel = 'info' | 'warning' | 'error' | 'none';

export interface SyncStatusRow {
  connection_id: string;
  connector_name: string;
  connector_id: number;
  state: InvestmentSyncState;
  connected_at: string;
  last_sync_at: string;
  hours_since_connection: number;
  hours_until_stable: number;
  first_nightly_sync_at: string | null;
  ativos_com_saldo: number;
  suspect_zero_count: number;
  alert_level: InvestmentSyncAlertLevel;
  alert_title: string | null;
  alert_message: string | null;
  global_state: InvestmentSyncState;
}

/** Enum alinhado à tabela manual_investments */
export type ManualInvestmentType =
  | 'PENSION_VGBL'
  | 'PENSION_PGBL'
  | 'FIXED_INCOME'
  | 'MUTUAL_FUND'
  | 'STOCK'
  | 'REAL_ESTATE_FUND'
  | 'ETF'
  | 'BDR'
  | 'CRYPTO'
  | 'TREASURE_DIRECT'
  | 'STOCK_OPTION'
  | 'INCOME'
  | 'OTHER';

export interface ManualInvestment {
  id: string;
  user_id: string;
  name: string;
  type: ManualInvestmentType;
  subtype?: string | null;
  institution: string;
  ticker?: string | null;
  cnpj_fund?: string | null;
  gross_balance: number;
  net_balance?: number | null;
  initial_amount?: number | null;
  balance_date: string;
  maturity_date?: string | null;
  notes?: string | null;
  active: boolean;
  source?: string;
  created_at: string;
  updated_at: string;
  logo_url?: string | null;
  company_domain?: string | null;
}

export interface ManualInvestmentInsert {
  name: string;
  type: ManualInvestmentType;
  subtype?: string;
  institution: string;
  ticker?: string;
  gross_balance: number;
  net_balance?: number;
  initial_amount?: number;
  balance_date: string;
  maturity_date?: string;
  notes?: string;
}

/** get_investments_totals_v2 */
export interface InvestmentTotalsV2 {
  gross_total: number;
  net_total: number;
  gross_net_spread: number;
  pluggy_gross: number;
  manual_gross: number;
  manual_count: number;
  suspect_zero_total: number;
  has_stale_data: boolean;
  oldest_balance_date: string | null;
  /** F5: cobertura global Open Finance; 100 = total, <100 parcial, null = manual_only */
  sync_coverage_pct: number | null;
}

/** get_investments_summary_v3 */
export interface InvestmentSummaryV3Row {
  inv_type: string;
  inv_subtype: string;
  total_count: number;
  gross_balance: number;
  net_balance: number;
  gross_net_spread: number;
  total_taxes: number | null;
  has_stale_data: boolean;
  suspect_zero_count: number;
  manual_count: number;
  oldest_balance_date: string | null;
  source_mix: 'pluggy_only' | 'manual_only' | 'mixed';
  /** F5: cobertura da classe; 100 = total, <100 parcial, null = manual_only */
  sync_coverage_pct: number | null;
}

/** get_investment_onboarding_status — F5 card contextual */
export interface OnboardingStatus {
  should_show: boolean;
  already_seen: boolean;
  has_new_connection: boolean;
  newest_connector_name: string | null;
}
