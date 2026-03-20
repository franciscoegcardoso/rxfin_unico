import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMovimentacoesPage } from '@/hooks/useMovimentacoesPage';

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
  const { user } = useAuth();
  const query = useMovimentacoesPage(user?.id, month);

  const data = useMemo<LancamentosSummaryData | null>(() => {
    const summary = query.data?.lancamentos_summary;
    if (!summary) return null;
    return {
      month: summary.month,
      summary: {
        total_income: summary.total_income ?? 0,
        total_expense: summary.total_expense ?? 0,
        balance: summary.balance ?? 0,
        count: summary.count_total ?? 0,
        count_income: summary.count_income ?? 0,
        count_expense: summary.count_expense ?? 0,
      },
      top_categories: summary.top_categories ?? [],
      by_payment_method: summary.by_payment_method ?? [],
      paid: summary.paid,
      pending: summary.pending,
      overdue: summary.overdue,
    };
  }, [query.data]);

  return {
    data,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: async () => {
      await query.refetch();
      return data;
    },
  };
}
