import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

/** Row from get_pluggy_investments_summary_v2 */
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
}

/** Result of get_investments_totals */
export interface InvestmentTotals {
  gross_total: number;
  net_total: number;
  gross_net_spread: number;
  suspect_zero_total: number;
  has_stale_data: boolean;
  oldest_balance_date: string | null;
}

export function usePluggyInvestments() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<PluggyInvestment[]>([]);
  const [summary, setSummary] = useState<InvestmentSummary[]>([]);
  const [summaryV2, setSummaryV2] = useState<InvestmentSummaryRow[]>([]);
  const [totals, setTotals] = useState<InvestmentTotals | null>(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSyncedData, setHasSyncedData] = useState(false);

  const fetchInvestments = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const invResult = await supabase
        .from('pluggy_investments')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('balance', { ascending: false });

      if (invResult.error) throw invResult.error;
      const list = (invResult.data || []) as PluggyInvestment[];

      const [summaryV2Result, totalsResult] = await Promise.all([
        supabase.rpc('get_pluggy_investments_summary_v2', { p_user_id: user.id }),
        supabase.rpc('get_investments_totals', { p_user_id: user.id }),
      ]);

      const v2Rows = summaryV2Result.error || !summaryV2Result.data
        ? []
        : (summaryV2Result.data as InvestmentSummaryRow[]);
      const tot = totalsResult.error || !totalsResult.data || Array.isArray(totalsResult.data)
        ? null
        : (totalsResult.data as InvestmentTotals);

      setInvestments(list);
      setSummaryV2(v2Rows);
      setTotals(tot);

      if (v2Rows.length > 0) {
        setSummary(v2Rows.map((row) => ({
          investment_type: row.investment_type,
          count: row.count,
          total_balance: row.net_balance,
          total_taxes: row.total_taxes,
          currency_code: 'BRL',
          avg_fixed_annual_rate: null,
        })));
        setTotalBalance(tot ? Number(tot.net_total) || 0 : list.reduce((acc, i) => acc + (Number(i.balance) || 0), 0));
      } else {
        const legacy = await supabase.rpc('get_pluggy_investments_summary', { p_user_id: user.id });
        setSummary(!legacy.error && legacy.data ? (legacy.data as InvestmentSummary[]) || [] : []);
        setTotalBalance(list.reduce((acc, i) => acc + (Number(i.balance) || 0), 0));
      }

      setHasSyncedData(list.length > 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

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

  return {
    investments,
    summary,
    summaryV2,
    totals,
    totalBalance,
    totalAmount,
    totalTaxes,
    activeCount,
    loading,
    error,
    hasSyncedData,
    refetch: fetchInvestments,
  };
}
