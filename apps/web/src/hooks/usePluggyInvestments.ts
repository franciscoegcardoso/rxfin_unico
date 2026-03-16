import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PluggyInvestment {
  id: string;
  pluggy_investment_id: string;
  type: string;
  subtype: string | null;
  name: string;
  code: string | null;
  balance: number;
  currency_code: string;
  fixed_annual_rate: number | null;
  rate: number | null;
  rate_type: string | null;
  index_name: string | null;
  due_date: string | null;
  issue_date: string | null;
  issuer: string | null;
  last_month_rate: number | null;
  last_twelve_months_rate: number | null;
  quantity: number | null;
  unit_value: number | null;
  balance_updated_at: string | null;
}

export interface InvestmentSummary {
  investment_type: string;
  count: number;
  total_balance: number;
  currency_code: string;
  avg_fixed_annual_rate: number | null;
  has_due_date?: boolean;
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

  return { investments, summary, totalBalance, loading, error, hasSyncedData, refetch: fetchInvestments };
}
