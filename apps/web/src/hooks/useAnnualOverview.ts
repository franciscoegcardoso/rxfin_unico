import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AnnualMonth {
  month?: string;
  income?: number;
  expense?: number;
  balance?: number;
  income_goal?: number;
  expense_goal?: number;
  savings_goal?: number;
  month_label?: string;
}

export interface SavingsGoal {
  name?: string;
  icon?: string;
  target?: number;
  current?: number;
  pct?: number;
  deadline?: string | null;
}

export interface AnnualOverviewTotals {
  total_income?: number;
  total_expense?: number;
  avg_monthly_income?: number;
  avg_monthly_expense?: number;
  best_month?: string | null;
  worst_month?: string | null;
}

export interface AnnualOverviewData {
  year?: string;
  months?: AnnualMonth[];
  totals?: AnnualOverviewTotals;
  savings_goals?: SavingsGoal[];
}

export function useAnnualOverview(year: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['annual-overview', user?.id, year],
    queryFn: async (): Promise<AnnualOverviewData | null> => {
      const { data, error } = await supabase.rpc('get_annual_overview', {
        p_user_id: user?.id ?? undefined,
        p_year: year,
      });
      if (error) throw error;
      return (data as AnnualOverviewData) ?? null;
    },
    enabled: !!user?.id,
  });
}
