import { useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  SyncStatusRow,
  InvestmentTotalsV2,
  InvestmentSummaryV3Row,
  OnboardingStatus,
  SnapshotPoint,
  AnnualRow,
  Benchmarks,
  BenchmarkPeriod,
  PerformanceSummary,
  ManualInvestment,
  ManualAsset,
  IndexadorBloco,
  CurrencyBloco,
  FxRates,
} from '@/types/investments';

/** Resposta de `get_investments_page_data` (consolida summary, totals, sync, onboarding, visões). */
interface GetInvestmentsPageDataResult {
  summary?: InvestmentSummaryV3Row[] | null;
  totals?: Record<string, unknown>[] | null;
  sync_status?: SyncStatusRow[] | null;
  onboarding?: OnboardingStatus[] | null;
  pluggy_investments?: PluggyInvestment[] | null;
  manual_investments?: ManualInvestment[] | null;
  manual_assets?: ManualAsset[] | null;
  by_indexador?: IndexadorBloco[] | null;
  by_currency?: CurrencyBloco[] | null;
  fx_rates?: FxRates | null;
  snapshot_history?: unknown;
  annual_evolution?: unknown;
  benchmarks?: unknown;
  performance_summary?: unknown;
  fetched_at?: string | null;
}

function parseBenchmarkPeriod(o: unknown): BenchmarkPeriod {
  const r = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>;
  return {
    no_mes: Number(r.no_mes ?? 0),
    no_semestre: Number(r.no_semestre ?? 0),
    no_ano: Number(r.no_ano ?? 0),
    doze_meses: Number(r.doze_meses ?? 0),
    desde_inicio: Number(r.desde_inicio ?? 0),
  };
}

function parseBenchmarks(raw: unknown): Benchmarks | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  if (!b.cdi || !b.ipca || !b.ibovespa) return null;
  return {
    cdi: parseBenchmarkPeriod(b.cdi),
    ipca: parseBenchmarkPeriod(b.ipca),
    ibovespa: parseBenchmarkPeriod(b.ibovespa),
  };
}

function parseSnapshotHistory(raw: unknown): SnapshotPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      const o = p as Record<string, unknown>;
      const bc = o.by_class;
      const by_class: SnapshotPoint['by_class'] = {};
      if (bc && typeof bc === 'object' && !Array.isArray(bc)) {
        for (const [k, v] of Object.entries(bc as Record<string, unknown>)) {
          const n = Number(v);
          if (!Number.isNaN(n)) by_class[k] = n;
        }
      }
      return {
        date: String(o.date ?? ''),
        total_brl: Number(o.total_brl ?? 0),
        by_class,
      };
    })
    .filter((p) => p.date.length > 0);
}

function parseAnnualEvolution(raw: unknown): AnnualRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => {
    const o = p as Record<string, unknown>;
    return {
      ano: Number(o.ano ?? 0),
      aportes: Number(o.aportes ?? 0),
      ir_pago: Number(o.ir_pago ?? 0),
      iof_pago: Number(o.iof_pago ?? 0),
      cdi_pct: Number(o.cdi_pct ?? 0),
      ipca_pct: Number(o.ipca_pct ?? 0),
    };
  });
}

function parsePerformanceSummary(raw: unknown): PerformanceSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    patrimonio_atual: Number(o.patrimonio_atual ?? 0),
    total_aplicado: Number(o.total_aplicado ?? 0),
    total_ir_retido: Number(o.total_ir_retido ?? 0),
    primeira_aportacao: String(o.primeira_aportacao ?? ''),
    data_referencia: String(o.data_referencia ?? ''),
    snapshot_count: Number(o.snapshot_count ?? 0),
  };
}

export const PLUGGY_INVESTMENTS_QUERY_KEY = 'pluggy-investments-page' as const;

export interface PluggyInvestment {
  id: string;
  pluggy_investment_id: string;
  connection_id: string;
  user_id: string;
  type: string;
  subtype: string | null;
  name: string;
  code: string | null;
  number: string | null;
  balance: number;
  currency_code: string;
  fixed_annual_rate: number | null;
  rate: number | null;
  rate_type: string | null;
  index_name: string | null;
  last_month_rate: number | null;
  last_twelve_months_rate: number | null;
  quantity: number | null;
  unit_value: number | null;
  due_date: string | null;
  issue_date: string | null;
  issuer: string | null;
  metadata: Record<string, unknown> | null;
  balance_updated_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  item_id: string | null;
  isin: string | null;
  status: string | null;
  taxes: number | null;
  taxes2: number | null;
  amount: number | null;
  amount_original: number | null;
  amount_profit: number | null;
  amount_withdrawal: number | null;
  annual_rate: number | null;
  value: number | null;
  reference_date: string | null;
  owner: string | null;
  provider_id: string | null;
  marketing_name: string | null;
  logo_url?: string | null;
  company_domain?: string | null;
}

export interface InvestmentSummary {
  investment_type: string;
  count: number;
  total_balance: number;
  total_amount?: number;
  total_amount_profit?: number | null;
  total_taxes?: number | null;
  currency_code: string;
  avg_fixed_annual_rate: number | null;
  avg_annual_rate?: number | null;
  has_due_date?: boolean;
  active_count?: number;
  with_isin_count?: number;
}

/** Row from get_pluggy_investments_summary_v2 (ou mapeado a partir de summary em page_data) */
export interface InvestmentSummaryRow {
  investment_type: string;
  investment_subtype: string;
  count: number;
  gross_balance: number;
  net_balance: number;
  gross_net_spread: number;
  total_taxes: number | null;
  has_stale_data: boolean;
  suspect_zero_count: number;
  oldest_balance_date: string | null;
  sync_coverage_pct?: number | null;
}

/** @deprecated use InvestmentTotalsV2 */
export interface InvestmentTotals {
  gross_total: number;
  net_total: number;
  gross_net_spread: number;
  suspect_zero_total: number;
  has_stale_data: boolean;
  oldest_balance_date: string | null;
  pluggy_gross?: number;
  manual_gross?: number;
  manual_count?: number;
}

export type InvestmentCategory = 'Renda Fixa' | 'Ações' | 'Fundos' | 'FIIs' | 'ETFs' | 'Outros';

export interface SummaryByCategory {
  gross_balance: number;
  net_balance: number;
  gross_net_spread: number;
  has_stale_data: boolean;
  suspect_zero_count: number;
  sync_coverage_pct: number | null;
}

export interface InvestmentCategoryData {
  category: InvestmentCategory;
  totalBalance: number;
  items: PluggyInvestment[];
  allocationPercent: number;
  avgLast12MonthsRate?: number | null;
}

const TYPE_TO_CATEGORY: Record<string, InvestmentCategory> = {
  FIXED_INCOME: 'Renda Fixa',
  TREASURE_DIRECT: 'Renda Fixa',
  TREASURE: 'Renda Fixa',
  BOND: 'Renda Fixa',
  SECURITY: 'Renda Fixa',
  EQUITY: 'Ações',
  STOCK: 'Ações',
  MUTUAL_FUND: 'Fundos',
  REAL_ESTATE_FUND: 'FIIs',
  ETF: 'ETFs',
  PENSION: 'Outros',
  PENSION_VGBL: 'Outros',
  PENSION_PGBL: 'Outros',
  INCOME: 'Outros',
  BDR: 'Ações',
  CRYPTO: 'Outros',
  CRYPTOCURRENCY: 'Outros',
  STOCK_OPTION: 'Outros',
  COE: 'Outros',
  LOAN: 'Outros',
  OTHER: 'Outros',
};

function getCategoryForType(type: string): InvestmentCategory {
  return TYPE_TO_CATEGORY[type] ?? 'Outros';
}

export interface PluggyInvestmentsQueryResult {
  investments: PluggyInvestment[];
  pluggyInvestments: PluggyInvestment[];
  manualInvestments: ManualInvestment[];
  manualAssets: ManualAsset[];
  byIndexador: IndexadorBloco[];
  byCurrency: CurrencyBloco[];
  fxRates: FxRates | null;
  fetchedAt: string | null;
  summaryV2: InvestmentSummaryRow[];
  totals: InvestmentTotalsV2 | null;
  syncStatusRows: SyncStatusRow[];
  onboardingStatus: OnboardingStatus | null;
  summary: InvestmentSummary[];
  totalBalance: number;
  hasSyncedData: boolean;
  snapshotHistory: SnapshotPoint[];
  annualEvolution: AnnualRow[];
  benchmarks: Benchmarks | null;
  performanceSummary: PerformanceSummary | null;
}

async function fetchPluggyInvestmentsData(userId: string): Promise<PluggyInvestmentsQueryResult> {
  const invResult = await supabase
    .from('pluggy_investments')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('balance', { ascending: false });

  if (invResult.error) throw invResult.error;
  const list = (invResult.data || []) as PluggyInvestment[];

  let v2Rows: InvestmentSummaryRow[] = [];
  let tot: InvestmentTotalsV2 | null = null;
  let syncRows: SyncStatusRow[] = [];
  let onboarding: OnboardingStatus | null = null;
  let snapshotHistory: SnapshotPoint[] = [];
  let annualEvolution: AnnualRow[] = [];
  let benchmarks: Benchmarks | null = null;
  let performanceSummary: PerformanceSummary | null = null;
  let pluggyInvestments: PluggyInvestment[] = list;
  let manualInvestments: ManualInvestment[] = [];
  let manualAssets: ManualAsset[] = [];
  let byIndexador: IndexadorBloco[] = [];
  let byCurrency: CurrencyBloco[] = [];
  let fxRates: FxRates | null = null;
  let fetchedAt: string | null = null;

  const pageDataResult = await supabase.rpc('get_investments_page_data', { p_user_id: userId });
  const pageData = pageDataResult.data as GetInvestmentsPageDataResult | null;
  const pageError = pageDataResult.error;
  const usePage = !pageError && pageData != null;

  if (usePage) {
    if (Array.isArray(pageData.sync_status)) {
      syncRows = pageData.sync_status;
    }
    if (Array.isArray(pageData.onboarding) && pageData.onboarding.length > 0) {
      onboarding = pageData.onboarding[0];
    }
    if (Array.isArray(pageData.summary) && pageData.summary.length > 0) {
      v2Rows = pageData.summary.map((row) => ({
        investment_type: row.inv_type,
        investment_subtype: row.inv_subtype,
        count: row.total_count,
        gross_balance: Number(row.gross_balance),
        net_balance: Number(row.net_balance),
        gross_net_spread: Number(row.gross_net_spread),
        total_taxes: row.total_taxes,
        has_stale_data: Boolean(row.has_stale_data),
        suspect_zero_count: Number(row.suspect_zero_count ?? 0),
        oldest_balance_date: row.oldest_balance_date,
        sync_coverage_pct: row.sync_coverage_pct ?? null,
      }));
    }
    if (Array.isArray(pageData.totals) && pageData.totals.length > 0) {
      const row = pageData.totals[0] as Record<string, unknown>;
      tot = {
        gross_total: Number(row.gross_total ?? 0),
        net_total: Number(row.net_total ?? 0),
        gross_net_spread: Number(row.gross_net_spread ?? 0),
        pluggy_gross: Number(row.pluggy_gross ?? 0),
        manual_gross: Number(row.manual_gross ?? 0),
        manual_count: Number(row.manual_count ?? 0),
        suspect_zero_total: Number(row.suspect_zero_total ?? 0),
        has_stale_data: Boolean(row.has_stale_data),
        oldest_balance_date: (row.oldest_balance_date as string) ?? null,
        sync_coverage_pct: row.sync_coverage_pct != null ? Number(row.sync_coverage_pct) : null,
      };
    }
    snapshotHistory = parseSnapshotHistory(pageData.snapshot_history);
    annualEvolution = parseAnnualEvolution(pageData.annual_evolution);
    benchmarks = parseBenchmarks(pageData.benchmarks);
    performanceSummary = parsePerformanceSummary(pageData.performance_summary);
    if (Array.isArray(pageData.pluggy_investments)) {
      pluggyInvestments = pageData.pluggy_investments;
    }
    if (Array.isArray(pageData.manual_investments)) {
      manualInvestments = pageData.manual_investments;
    }
    if (Array.isArray(pageData.manual_assets)) {
      manualAssets = pageData.manual_assets;
    }
    if (Array.isArray(pageData.by_indexador)) {
      byIndexador = pageData.by_indexador;
    }
    if (Array.isArray(pageData.by_currency)) {
      byCurrency = pageData.by_currency;
    }
    if (pageData.fx_rates && typeof pageData.fx_rates === 'object') {
      fxRates = pageData.fx_rates;
    }
    fetchedAt = pageData.fetched_at ?? null;
  } else {
    const legacySum = await supabase.rpc('get_pluggy_investments_summary_v2', { p_user_id: userId });
    if (!legacySum.error && Array.isArray(legacySum.data)) {
      v2Rows = legacySum.data as InvestmentSummaryRow[];
    }
    const legacyTot = await supabase.rpc('get_investments_totals', { p_user_id: userId });
    if (!legacyTot.error && legacyTot.data && !Array.isArray(legacyTot.data)) {
      const t = legacyTot.data as InvestmentTotals;
      tot = {
        gross_total: t.gross_total,
        net_total: t.net_total,
        gross_net_spread: t.gross_net_spread,
        pluggy_gross: t.gross_total,
        manual_gross: 0,
        manual_count: 0,
        suspect_zero_total: t.suspect_zero_total,
        has_stale_data: t.has_stale_data,
        oldest_balance_date: t.oldest_balance_date,
        sync_coverage_pct: null,
      };
    }
  }

  let summary: InvestmentSummary[] = [];
  if (v2Rows.length > 0) {
    summary = v2Rows.map((row) => ({
      investment_type: row.investment_type,
      count: row.count,
      total_balance: row.net_balance,
      total_taxes: row.total_taxes,
      currency_code: 'BRL',
      avg_fixed_annual_rate: null,
    }));
  }

  let totalBalance =
    tot != null
      ? Number(tot.net_total) || 0
      : v2Rows.length > 0
        ? v2Rows.reduce((s, r) => s + r.net_balance, 0)
        : list.reduce((acc, i) => acc + (Number(i.balance) || 0), 0);

  if (v2Rows.length === 0 && tot == null) {
    const legacy = await supabase.rpc('get_pluggy_investments_summary', { p_user_id: userId });
    summary = !legacy.error && legacy.data ? ((legacy.data as InvestmentSummary[]) || []) : [];
    totalBalance = list.reduce((acc, i) => acc + (Number(i.balance) || 0), 0);
  }

  const hasSyncedData = list.length > 0 || (tot?.manual_count ?? 0) > 0;

  return {
    investments: pluggyInvestments,
    pluggyInvestments,
    manualInvestments,
    manualAssets,
    byIndexador,
    byCurrency,
    fxRates,
    fetchedAt,
    summaryV2: v2Rows,
    totals: tot,
    syncStatusRows: syncRows,
    onboardingStatus: onboarding,
    summary,
    totalBalance,
    hasSyncedData,
    snapshotHistory,
    annualEvolution,
    benchmarks,
    performanceSummary,
  };
}

export function usePluggyInvestments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id;

  const query = useQuery({
    queryKey: [PLUGGY_INVESTMENTS_QUERY_KEY, uid],
    queryFn: () => fetchPluggyInvestmentsData(uid!),
    enabled: !!uid,
    staleTime: 60 * 1000,
  });

  const data = query.data;

  const [filters, setFilters] = useState<{
    userId: string | null;
    institution: string | null;
    category: InvestmentCategory | null;
  }>({ userId: null, institution: null, category: null });

  const refetch = useCallback(() => queryClient.invalidateQueries({ queryKey: [PLUGGY_INVESTMENTS_QUERY_KEY, uid] }), [queryClient, uid]);

  const investments = data?.investments ?? [];
  const pluggyInvestments = data?.pluggyInvestments ?? [];
  const manualInvestments = data?.manualInvestments ?? [];
  const manualAssets = data?.manualAssets ?? [];
  const byIndexador = data?.byIndexador ?? [];
  const byCurrency = data?.byCurrency ?? [];
  const fxRates = data?.fxRates ?? null;
  const fetchedAt = data?.fetchedAt ?? null;
  const summary = data?.summary ?? [];
  const summaryV2 = data?.summaryV2 ?? [];
  const totals = data?.totals ?? null;
  const totalBalance = data?.totalBalance ?? 0;
  const syncStatusRows = data?.syncStatusRows ?? [];
  const onboardingStatus = data?.onboardingStatus ?? null;
  const hasSyncedData = data?.hasSyncedData ?? false;
  const snapshotHistory = data?.snapshotHistory ?? [];
  const annualEvolution = data?.annualEvolution ?? [];
  const benchmarks = data?.benchmarks ?? null;
  const performanceSummary = data?.performanceSummary ?? null;

  /** Só “carregando” no primeiro fetch; refetch em background não esconde dados. */
  const loading = query.isPending || (query.isFetching && !data);
  const error =
    query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null;

  const totalAmount = useMemo(
    () => investments.reduce((acc, i) => acc + (i.amount ?? i.balance ?? 0), 0),
    [investments]
  );
  const totalTaxes = useMemo(
    () => investments.reduce((acc, i) => acc + (i.taxes ?? 0) + (i.taxes2 ?? 0), 0),
    [investments]
  );
  const activeCount = useMemo(
    () => investments.filter((i) => i.status === 'ACTIVE' || i.status === null).length,
    [investments]
  );

  const categories = useMemo((): InvestmentCategoryData[] => {
    const list = investments;
    const total = totalBalance || 1;
    const byCategory = new Map<InvestmentCategory, PluggyInvestment[]>();
    for (const inv of list) {
      const cat = getCategoryForType(inv.type);
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(inv);
    }
    const result: InvestmentCategoryData[] = [];
    byCategory.forEach((items, category) => {
      const totalBalanceCat = items.reduce((s, i) => s + (Number(i.balance) || 0), 0);
      const avg12 =
        items.length > 0
          ? items.reduce((s, i) => s + (Number(i.last_twelve_months_rate) ?? 0), 0) / items.length
          : null;
      result.push({
        category,
        totalBalance: totalBalanceCat,
        items,
        allocationPercent: (totalBalanceCat / total) * 100,
        avgLast12MonthsRate: avg12,
      });
    });
    return result.sort((a, b) => b.totalBalance - a.totalBalance);
  }, [investments, totalBalance]);

  const filterOptions = useMemo(
    () => ({
      users: [] as { value: string; label: string }[],
      institutions: [] as { value: string; label: string }[],
      categories: [] as { value: string; label: string }[],
    }),
    []
  );
  const hasActiveFilters = Boolean(filters.userId || filters.institution || filters.category);

  const summaryByCategory = useMemo((): Record<InvestmentCategory, SummaryByCategory> => {
    const acc = new Map<InvestmentCategory, SummaryByCategory>();
    const init = (cat: InvestmentCategory): SummaryByCategory => ({
      gross_balance: 0,
      net_balance: 0,
      gross_net_spread: 0,
      has_stale_data: false,
      suspect_zero_count: 0,
      sync_coverage_pct: null,
    });
    for (const row of summaryV2) {
      const cat = getCategoryForType(row.investment_type) as InvestmentCategory;
      const cur = acc.get(cat) ?? init(cat);
      const rowPct = row.sync_coverage_pct;
      const minPct =
        cur.sync_coverage_pct != null && rowPct != null
          ? Math.min(cur.sync_coverage_pct, rowPct)
          : cur.sync_coverage_pct ?? rowPct ?? null;
      acc.set(cat, {
        gross_balance: cur.gross_balance + Number(row.gross_balance ?? 0),
        net_balance: cur.net_balance + Number(row.net_balance ?? 0),
        gross_net_spread: cur.gross_net_spread + Number(row.gross_net_spread ?? 0),
        has_stale_data: cur.has_stale_data || Boolean(row.has_stale_data),
        suspect_zero_count: cur.suspect_zero_count + Number(row.suspect_zero_count ?? 0),
        sync_coverage_pct: minPct,
      });
    }
    return Object.fromEntries(acc) as Record<InvestmentCategory, SummaryByCategory>;
  }, [summaryV2]);

  const syncAlertRows = useMemo(
    () => syncStatusRows.filter((r) => r.alert_level !== 'none'),
    [syncStatusRows]
  );

  return {
    investments,
    pluggyInvestments,
    manualInvestments,
    manualAssets,
    byIndexador,
    byCurrency,
    fxRates,
    fetchedAt,
    summary,
    summaryV2,
    totals,
    totalBalance,
    syncStatusRows,
    syncAlertRows,
    onboardingStatus,
    totalAmount,
    totalTaxes,
    activeCount,
    loading,
    isLoading: loading,
    error,
    hasSyncedData,
    refetch,
    categories,
    filters,
    setFilters,
    filterOptions,
    hasActiveFilters,
    allInvestments: investments,
    summaryByCategory,
    snapshotHistory,
    annualEvolution,
    benchmarks,
    performanceSummary,
  };
}
