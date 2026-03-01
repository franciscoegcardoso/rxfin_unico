import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ExpenseTrendCategory {
  category: string;
  total: number;
  avg_monthly?: number;
  trend_pct?: number | null;
  months?: Array<{ month: string; amount: number }>;
}

export interface ExpenseTrendsData {
  period?: { start: string; end: string; months: number };
  total_expense?: number;
  categories?: ExpenseTrendCategory[];
}

export function useExpenseTrends(months: number = 6) {
  const [data, setData] = useState<ExpenseTrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: rpcError } = await supabase.rpc('get_expense_trends', {
        p_months: months,
      });
      if (rpcError) {
        setError(rpcError.message);
        setData(null);
        return null;
      }
      setData((result as ExpenseTrendsData) ?? null);
      return result as ExpenseTrendsData;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
