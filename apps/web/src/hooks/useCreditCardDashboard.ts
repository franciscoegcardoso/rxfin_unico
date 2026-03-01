import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface CreditCardDashboardData {
  bills?: Array<{ card_name: string | null; total_value: number; due_date: string; status: string; billing_month: string; paid_amount?: number | null }>;
  transactions?: Array<{ store_name: string; value: number; transaction_date: string; category: string; card_id: string }>;
  summary?: { total_bills: number; total_paid: number; total_pending: number };
}

export function useCreditCardDashboard(month: string) {
  const [data, setData] = useState<CreditCardDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: rpcError } = await supabase.rpc('get_credit_card_dashboard', { p_month: month });
      if (rpcError) {
        setError(rpcError.message);
        setData(null);
        return null;
      }
      setData((result as CreditCardDashboardData) ?? null);
      return result as CreditCardDashboardData;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
