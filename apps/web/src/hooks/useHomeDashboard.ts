import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

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

/**
 * Fetches home dashboard data via get_home_dashboard RPC.
 * Uses auth.uid() when demoUserId is omitted. When demoUserId is provided (modo demo),
 * the RPC returns data for that user instead.
 */
export function useHomeDashboard(month: string, demoUserId?: string | null) {
  const [data, setData] = useState<HomeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { p_month: month };
      if (demoUserId) params.p_user_id = demoUserId;

      const { data: result, error: rpcError } = await supabase.rpc('get_home_dashboard', params);

      if (rpcError) {
        setError(rpcError.message);
        setData(null);
        return null;
      }
      setData((result as HomeDashboardData) ?? null);
      return result as HomeDashboardData;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [month, demoUserId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading, error, refetch: fetchDashboard };
}
