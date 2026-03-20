import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ConsolidatedKPIs {
  total_receitas: number;
  total_debito: number;
  total_credito: number;
  total_despesas: number;
  saldo_real: number;
}

export interface ConsolidatedCategory {
  category: string;
  total_debito: number;
  total_credito: number;
  total_combined: number;
}

export interface ConsolidatedExpensesData {
  kpis: ConsolidatedKPIs;
  by_category: ConsolidatedCategory[];
}

export function useConsolidatedExpenses(monthRef: string) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['consolidated-expenses', user?.id, monthRef],
    queryFn: async (): Promise<ConsolidatedExpensesData | null> => {
      const { data: result, error: rpcError } = await supabase.rpc('get_consolidated_expenses', {
        p_user_id: user?.id,
        p_month_ref: monthRef,
      });
      if (rpcError) throw rpcError;
      return (result as ConsolidatedExpensesData) ?? null;
    },
    enabled: !!user?.id && !!monthRef,
    staleTime: 2 * 60 * 1000,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
  };
}
