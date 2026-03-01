import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/** Response shape from get_budget_vs_actual RPC */
export interface BudgetVsActualData {
  income?: { planned: number; actual: number; items?: unknown[] };
  expenses?: { planned: number; actual: number; by_category?: unknown[] };
  savings?: { planned: number; actual: number };
  credit_cards?: { planned: number; actual: number };
}

export function useBudgetVsActual(month: string) {
  const [data, setData] = useState<BudgetVsActualData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: rpcError } = await supabase.rpc('get_budget_vs_actual', {
        p_month: month,
      });
      if (rpcError) {
        setError(rpcError.message);
        setData(null);
        return null;
      }
      setData((result as BudgetVsActualData) ?? null);
      return result as BudgetVsActualData;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
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
