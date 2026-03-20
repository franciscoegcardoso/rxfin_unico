/** Sync por conexão Pluggy (campo `sync_status` em get_investments_page_data). */
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

/** Linha de `totals` em get_investments_page_data */
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

/** Linha de `summary` em get_investments_page_data */
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

/** Onboarding (campo `onboarding` em get_investments_page_data). */
export interface OnboardingStatus {
  should_show: boolean;
  already_seen: boolean;
  has_new_connection: boolean;
  newest_connector_name: string | null;
}

/** Histórico de snapshots (campo `snapshot_history` em get_investments_page_data). */
export interface SnapshotPoint {
  date: string;
  total_brl: number;
  /** 0 = ponto estimado (backfill); null/undefined se não enviado */
  completeness_pct?: number | null;
  by_class: {
    renda_fixa?: number;
    acoes?: number;
    fii?: number;
    internacional?: number;
    alternativo?: number;
    [key: string]: number | undefined;
  };
}

/** Linha anual (campo `annual_evolution` em get_investments_page_data). */
export interface AnnualRow {
  ano: number;
  aportes: number;
  ir_pago: number;
  iof_pago: number;
  cdi_pct: number;
  ipca_pct: number;
}

export interface BenchmarkPeriod {
  no_mes: number;
  no_semestre: number;
  no_ano: number;
  doze_meses: number;
  desde_inicio: number;
}

/** Benchmarks (campo `benchmarks` em get_investments_page_data). */
export interface Benchmarks {
  cdi: BenchmarkPeriod;
  ipca: BenchmarkPeriod;
  ibovespa: BenchmarkPeriod;
}

/** Resumo de performance (campo `performance_summary` em get_investments_page_data). */
export interface PerformanceSummary {
  patrimonio_atual: number;
  total_aplicado: number;
  total_ir_retido: number;
  primeira_aportacao: string;
  data_referencia: string;
  snapshot_count: number;
}

/** Ativo Pluggy detalhado retornado em `pluggy_investments` do page_data. */
export interface PagePluggyInvestment {
  [key: string]: unknown;
}

/** Bem/ativo manual retornado em `manual_assets` do page_data. */
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

/** Bloco de indexador retornado em `by_indexador` do page_data. */
export interface IndexadorBloco {
  bloco: string;
  total: number;
  count: number;
  ir_total: number;
  pct_carteira: number;
}

/** Bloco de moeda retornado em `by_currency` do page_data. */
export interface CurrencyBloco {
  currency: string;
  total_brl: number;
  count: number;
  pct_carteira: number;
}

/** Cotações de câmbio retornadas em `fx_rates` do page_data. */
export interface FxRates {
  USD_BRL: number;
  EUR_BRL: number;
  rate_date: string;
}
