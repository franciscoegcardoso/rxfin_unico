import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanejamentoPage } from '@/hooks/usePlanejamentoPage';

/** Response shape from get_budget_vs_actual RPC */
export interface BudgetVsActualData {
  income?: { planned: number; actual: number; items?: unknown[] };
  expenses?: { planned: number; actual: number; by_category?: unknown[] };
  savings?: { planned: number; actual: number };
  credit_cards?: { planned: number; actual: number };
}

export function useBudgetVsActual(month: string) {
  const { user } = useAuth();
  const query = usePlanejamentoPage(user?.id, month, 'orcamento');
  const data = useMemo(() => (query.data?.tab_data ?? null) as BudgetVsActualData | null, [query.data]);
  return {
    data,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}
