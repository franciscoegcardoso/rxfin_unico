import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ConsolidationIncomeItem {
  id?: string;
  name?: string;
  planned?: number;
  realized?: number;
  is_received?: boolean;
}

export interface ConsolidationExpenseItem {
  id?: string;
  name?: string;
  category?: string;
  category_id?: string;
  is_recurring?: boolean;
  payment_method?: string;
  planned?: number;
  realized?: number;
  is_paid?: boolean;
  due_date?: string | null;
}

export interface MonthlyConsolidationTotals {
  planned_income?: number;
  realized_income?: number;
  planned_expense?: number;
  realized_expense?: number;
  pending_payments?: number;
}

export interface MonthlyConsolidationData {
  income_items?: ConsolidationIncomeItem[];
  expense_items?: ConsolidationExpenseItem[];
  totals?: MonthlyConsolidationTotals;
}

export function useMonthlyConsolidation(month: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['monthly-consolidation', user?.id, month],
    queryFn: async (): Promise<MonthlyConsolidationData | null> => {
      const { data, error } = await supabase.rpc('get_monthly_consolidation', {
        p_user_id: user?.id ?? undefined,
        p_month: month,
      });
      if (error) throw error;
      return (data as MonthlyConsolidationData) ?? null;
    },
    enabled: !!user?.id && !!month,
  });
}
