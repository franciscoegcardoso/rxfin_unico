import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/** Item from get_lancamentos_summary recent/pending (optional use) */
export interface LancamentoSummaryItem {
  id: string;
  nome: string;
  valor_realizado?: number;
  valor_previsto?: number;
  data_pagamento?: string | null;
  data_vencimento?: string | null;
  tipo: string;
  categoria?: string;
}

/**
 * Response shape from get_lancamentos_summary RPC.
 * UI uses: summary (total_income, total_expense), top_categories, by_payment_method.
 * paid/pending/overdue are returned by RPC but no longer used in the Lancamentos page.
 */
export interface LancamentosSummaryData {
  month?: string;
  summary?: {
    total_income: number;
    total_expense: number;
    balance?: number;
    count?: number;
    count_income?: number;
    count_expense?: number;
  };
  by_category?: Array<{ category: string; total: number; count: number }>;
  top_categories?: Array<{ category: string; total: number; count?: number; pct?: number }>;
  by_payment_method?: Array<{ method: string; total: number; count: number }>;
  recent?: LancamentoSummaryItem[];
  /** @deprecated No longer used in UI (header removed) */
  paid?: { count: number; total: number };
  /** @deprecated No longer used in UI (header removed) */
  pending?: { count: number; total: number };
  /** @deprecated No longer used in UI (header removed) */
  overdue?: { count: number; total: number };
}

/**
 * Fetches lancamentos summary via get_lancamentos_summary RPC for a given month.
 * Uses auth.uid() when p_user_id is omitted.
 */
export function useLancamentosSummary(month: string) {
  const [data, setData] = useState<LancamentosSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(
    async (pUserId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, unknown> = { p_month: month };
        if (pUserId) params.p_user_id = pUserId;

        const { data: result, error: rpcError } = await supabase.rpc('get_lancamentos_summary', params);

        if (rpcError) {
          setError(rpcError.message);
          setData(null);
          return null;
        }
        setData((result as LancamentosSummaryData) ?? null);
        return result as LancamentosSummaryData;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setData(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [month]
  );

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { data, loading, error, refetch: fetchSummary };
}
