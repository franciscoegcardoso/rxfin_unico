import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AnnualMonth {
  month?: string;
  income?: number;
  expense?: number;
  expense_extrato?: number;  // apenas extrato/manual (sem cartão)
  expense_cartao?: number;  // apenas credit_card_bills
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
  category?: string;
}

export interface AnnualOverviewTotals {
  total_income?: number;
  total_expense?: number;
  total_expense_extrato?: number;  // apenas extrato/manual (sem cartão)
  total_expense_cartao?: number;   // apenas credit_card_bills
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
      const raw = data as AnnualOverviewData | null;
      if (!raw) return null;
      const totals = raw.totals;
      const months = raw.months?.map((m) => ({
        ...m,
        expense_extrato: Number(m?.expense_extrato ?? 0),
        expense_cartao: Number(m?.expense_cartao ?? 0),
      }));
      const normalizedTotals = totals
        ? {
            ...totals,
            total_expense_extrato: Number(totals.total_expense_extrato ?? 0),
            total_expense_cartao: Number(totals.total_expense_cartao ?? 0),
          }
        : totals;
      return { ...raw, months: months ?? raw.months, totals: normalizedTotals };
    },
    enabled: !!user?.id,
  });
}
