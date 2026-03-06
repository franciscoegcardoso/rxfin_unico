import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ArchitectureHealthSnapshot {
  generated_at: string;
  rls: {
    coverage_pct: number;
    total_tables: number;
    tables_with_rls: number;
    tables_with_policies: number;
  };
  data: {
    jobs_pending: number;
    sync_errors_24h: number;
    transactions_total: number;
    transaction_partitions: number;
    pluggy_transactions_total: number;
  };
  security: {
    total_policies: number;
    permissive_policies_count: number;
    unsafe_functions: {
      pct_unsafe: number;
      unsafe_count: number;
      total_functions: number;
    };
  };
  performance: {
    total_indexes: number;
  };
}

export function useArchitectureHealth(autoRefreshMs = 0) {
  const [data, setData] = useState<ArchitectureHealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: err } = await supabase.rpc('get_architecture_health_snapshot');
      if (err) throw err;
      const raw = Array.isArray(result) ? result[0] : result;
      const snapshot = (raw as ArchitectureHealthSnapshot | null) ?? null;
      setData(snapshot && typeof snapshot === 'object' && 'rls' in snapshot ? snapshot : null);
      setLastRefresh(new Date());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar snapshot';
      const isMissingRpc = typeof msg === 'string' && (msg.includes('get_architecture_health_snapshot') || msg.includes('function') || msg.includes('404') || msg.includes('PGRST'));
      setError(isMissingRpc ? 'Snapshot de arquitetura indisponível (RPC não configurado neste ambiente).' : msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (autoRefreshMs <= 0) return;
    const t = setInterval(refresh, autoRefreshMs);
    return () => clearInterval(t);
  }, [autoRefreshMs, refresh]);

  return { data, loading, error, lastRefresh, refresh };
}
