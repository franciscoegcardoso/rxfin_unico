import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FipeAdminSummary {
  generated_at: string;
  catalog: {
    total_entries: number;
    total_price_history: number;
    prices_real: number;
    sentinelas: number;
    distinct_fipe_codes: number;
    total_references: number;
    latest_reference: {
      code: number;
      month: number;
      year: number;
      slug: string;
    };
    sibling_cache_entries: number;
    model_year_window: number;
    storage_price_history: string;
    storage_catalog: string;
    coverage_pct: number;
  };
  health: {
    status: string;
    totalIssues: number;
    lastRunAt: string | null;
    checks: {
      anosAbsurdos: number;
      fipeCodesComHifen: number;
      orfaosNoHistorico: number;
      anosFaltandoCatalog: number;
      camposNulosCriticos: number;
      yearIdInconsistentes: number;
      metadadosInconsistentes: number;
    };
    correctionsApplied: number;
    stats: {
      totalPrecos: number;
      coberturaPct: number;
      totalHistorico: number;
      fipeCodesSemPreco: number;
      fipeCodesDistintos: number;
      totalLinhasCatalog: number;
    };
  };
  runner: {
    phase: number;
    status: string;
    iteration: number;
    last_run_at: string;
    next_call_scheduled: boolean;
    is_locked: boolean;
    locked_at: string | null;
    totals: {
      pricesInserted: number;
      unavailable424: number;
      catalogInserted: number;
    };
    last_error: string | null;
  };
  phase3: {
    status: string;
    iteration: number;
    inserted: number;
    unavailable: number;
    errors: number;
    last_run_at: string;
    is_locked: boolean;
    locked_at: string | null;
    queue_populated: boolean;
  };
  cron: Array<{
    name: string;
    schedule: string;
    active: boolean;
    last_run: {
      status: string;
      start_time: string;
      end_time: string;
      return_message: string;
    } | null;
    failures_7d: number;
  }>;
  scale_jobs: {
    total: number;
    pending: number;
    running: number;
    done: number;
    error: number;
  };
}

export function useFipeAdminSummary() {
  const [data, setData] = useState<FipeAdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: err } = await supabase.rpc('get_fipe_admin_summary');
      if (err) throw err;
      setData((result as FipeAdminSummary) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar resumo FIPE');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
