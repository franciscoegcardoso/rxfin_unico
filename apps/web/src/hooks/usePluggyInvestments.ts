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

export function usePluggyInvestments() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<PluggyInvestment[]>([]);
  const [summary, setSummary] = useState<InvestmentSummary[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSyncedData, setHasSyncedData] = useState(false);

  const fetchInvestments = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data: invData, error: invErr } = await supabase
        .from('pluggy_investments')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('balance', { ascending: false });

      if (invErr) throw invErr;

      const { data: summaryData, error: sumErr } = await supabase
        .rpc('get_pluggy_investments_summary', { p_user_id: user.id });

      if (sumErr) throw sumErr;

      const list = (invData || []) as PluggyInvestment[];
      setInvestments(list);
      setSummary((summaryData as InvestmentSummary[]) || []);
      setTotalBalance(list.reduce((acc, i) => acc + (Number(i.balance) || 0), 0));
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
