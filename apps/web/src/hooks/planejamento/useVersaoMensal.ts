import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanejamentoPage } from '@/hooks/usePlanejamentoPage';

export interface CategoriaRealizado {
  category_name: string;
  total: number;
  count: number;
  type: 'receita' | 'despesa';
}

export interface VersaoMensalRealizado {
  receitas: number;
  despesas_extrato: number;
  por_categoria: Record<string, CategoriaRealizado>;
}

export interface FaturaCartao {
  card_id: string;
  card_name: string | null;
  total_value: number;
  due_date: string;
  billing_month: string;
  status: 'open' | 'closed' | 'paid' | 'overdue' | string;
}

export interface VersaoMensalMesGoals {
  month: string;
  user_id: string;
  income_goal?: number;
  expense_goal?: number;
  savings_goal?: number;
  credit_card_goal?: number;
}

export interface VersaoMensalComputed {
  receitas: number;
  despesas_extrato: number;
  faturas_total: number;
  total_despesas: number;
  saldo_disponivel: number;
  por_categoria: Record<string, CategoriaRealizado>;
  monthly_goals: VersaoMensalMesGoals | null;
  isLoading: boolean;
  error: string | null;
}

export function useVersaoMensal(mes: string): VersaoMensalComputed {
  const { user } = useAuth();

  const userId = user?.id;
  const pageQuery = usePlanejamentoPage(userId, mes, 'mensal');

  const visaoData = (pageQuery.data?.tab_data as { realizado?: VersaoMensalRealizado } | null)?.realizado ?? null;

  const faturasQuery = useQuery({
    queryKey: ['credit-card-bills', userId, mes],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('credit_card_bills')
        .select('card_id, card_name, total_value, due_date, billing_month, status')
        .eq('user_id', userId)
        .eq('billing_month', mes);

      if (error) throw error;
      return (data || []) as FaturaCartao[];
    },
    enabled: !!userId && !!mes,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const goalsData = (pageQuery.data?.goals ?? null) as VersaoMensalMesGoals | null;

  const isLoading = pageQuery.isLoading || faturasQuery.isLoading;
  const error =
    ((pageQuery.error as Error | null)?.message || faturasQuery.error?.message || null) as string | null;

  const receitas = visaoData?.receitas ?? 0;
  const despesas_extrato = visaoData?.despesas_extrato ?? 0;
  const por_categoria = visaoData?.por_categoria ?? {};

  const faturas_total = (faturasQuery.data || []).reduce((sum, f) => sum + (f.total_value || 0), 0);
  const total_despesas = despesas_extrato + faturas_total;
  const saldo_disponivel = receitas - despesas_extrato - faturas_total;

  return {
    receitas,
    despesas_extrato,
    faturas_total,
    total_despesas,
    saldo_disponivel,
    por_categoria,
    monthly_goals: goalsData,
    isLoading,
    error,
  };
}

