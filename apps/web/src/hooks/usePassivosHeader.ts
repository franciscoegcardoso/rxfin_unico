import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type PassivosHeaderData = {
  total_passivos: number;
  total_dividas: number;
  total_financiamentos: number;
  total_consorcios: number;
  parcela_mensal_total: number;
  dividas_count: number;
  financiamentos_count: number;
  consorcios_count: number;
  has_overdue: boolean;
  overdue_count: number;
  fetched_at: string;
};

/**
 * Busca o "header" da página /passivos via RPC.
 */
export function usePassivosHeader() {
  const [data, setData] = useState<PassivosHeaderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchHeader() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: result, error: rpcError } = await supabase.rpc('get_passivos_header');
        if (rpcError) throw rpcError;
        if (cancelled) return;
        setData((result ?? null) as PassivosHeaderData | null);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchHeader();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading, error };
}

