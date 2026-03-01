import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface RecurringExpenseItem {
  id?: string;
  name?: string;
  category?: string;
  value?: number;
  [key: string]: unknown;
}

export function useRecurringExpenses(months: number = 3) {
  const [data, setData] = useState<RecurringExpenseItem[] | Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: rpcError } = await supabase.rpc('get_recurring_expenses_overview', {
        p_months: months,
      });
      if (rpcError) {
        setError(rpcError.message);
        setData(null);
        return null;
      }
      setData((result as RecurringExpenseItem[] | Record<string, unknown>) ?? null);
      return result;
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
