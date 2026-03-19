import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/** Response shape from get_home_dashboard RPC */
export interface HomeDashboardData {
  user?: {
    full_name: string | null;
    email: string | null;
    onboarding_completed?: boolean;
    finance_mode?: string | null;
  };
  month_summary?: {
    total_income: number;
    total_expense: number;
    balance: number;
    prev_income?: number;
    prev_expense?: number;
  };
  expenses_by_category?: Array<{ category: string; total: number; pct?: number }>;
  credit_cards?: Array<{
    card_name: string | null;
    total_value: number;
    due_date: string;
    status: string;
    billing_month: string;
  }>;
  insurance_alerts?: Array<{
    nome: string;
    tipo: string;
    data_fim: string;
    dias_restantes?: number;
  }>;
  upcoming_events?: unknown[];
  budget_composition?: { income_items?: unknown[]; expense_items?: unknown[] };
  onboarding?: { phase?: string; completed?: boolean };
}

const HOME_DASHBOARD_QUERY_KEY = 'home-dashboard';

/**
 * Fetches home dashboard data via get_home_dashboard RPC.
 * Single useQuery with stable key so Inicio, useMonthSummary and CartaoCreditoInicio share cache (1 request).
 * When demoUserId is provided (modo demo), the RPC returns data for that user.
 */
export function useHomeDashboard(month: string, demoUserId?: string | null) {
  const { user } = useAuth();
  const effectiveUserId = demoUserId ?? user?.id ?? '';

  const query = useQuery({
    queryKey: [HOME_DASHBOARD_QUERY_KEY, effectiveUserId, month],
    queryFn: async (): Promise<HomeDashboardData | null> => {
      const params: Record<string, unknown> = { p_month: month };
      if (demoUserId) params.p_user_id = demoUserId;

      const { data: result, error: rpcError } = await supabase.rpc('get_home_dashboard', params);

      if (rpcError) throw new Error(rpcError.message);
      return (result as HomeDashboardData) ?? null;
    },
    enabled: !!effectiveUserId && !!month,
    staleTime: 60 * 1000, // 1 min — dados financeiros do usuário
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? String(query.error) : null,
    refetch: query.refetch,
  };
}
