import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface SmartAlertItem {
  id?: string;
  type?: string;
  message?: string;
  severity?: string;
  [key: string]: unknown;
}

export function useSmartAlerts(month: string) {
  const [data, setData] = useState<SmartAlertItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: rpcError } = await supabase.rpc('get_smart_alerts', { p_month: month });
      if (rpcError) {
        setError(rpcError.message);
        setData(null);
        return null;
      }
      setData(Array.isArray(result) ? result : (result as SmartAlertItem[] | null) ?? null);
      return result;
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
