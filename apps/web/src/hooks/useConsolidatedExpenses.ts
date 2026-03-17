import { useState, useEffect } from 'react';
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
  const [data, setData] = useState<ConsolidatedExpensesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: result, error: rpcError } = await supabase.rpc('get_consolidated_expenses', {
          p_user_id: user.id,
          p_month_ref: monthRef,
        });

        if (rpcError) throw rpcError;
        setData(result as ConsolidatedExpensesData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados consolidados');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, monthRef]);

  return { data, loading, error };
}
