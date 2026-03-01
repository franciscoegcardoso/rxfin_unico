import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MonthSummary {
  income?: number;
  expense?: number;
  balance?: number;
  [key: string]: unknown;
}

export interface DashboardEnhancedData {
  month_summary?: MonthSummary;
  credit_card_totals?: unknown;
  lancamentos?: Array<{
    date?: string;
    nome?: string;
    valor?: number;
    tipo?: string;
    [key: string]: unknown;
  }>;
  alertas?: unknown[];
  metas?: unknown[];
  [key: string]: unknown;
}

export function useDashboardEnhanced(month: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-enhanced', user?.id, month],
    queryFn: async (): Promise<DashboardEnhancedData | null> => {
      const { data, error } = await supabase.rpc('get_dashboard_enhanced', {
        p_user_id: user?.id ?? undefined,
        p_month: month,
      });
      if (error) throw error;
      return (data as DashboardEnhancedData) ?? null;
    },
    enabled: !!user?.id && !!month,
  });
}
