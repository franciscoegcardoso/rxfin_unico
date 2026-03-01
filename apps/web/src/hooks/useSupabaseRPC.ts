import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Generic hook to call Supabase RPCs with loading and error state.
 */
export function useSupabaseRPC<T>(rpcName: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (params?: Record<string, unknown>) => {
      setLoading(true);
      setError(null);
      try {
        const { data: result, error: rpcError } = await supabase.rpc(rpcName, params);
        if (rpcError) throw rpcError;
        setData(result as T);
        return result as T;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [rpcName]
  );

  return { data, loading, error, execute };
}
