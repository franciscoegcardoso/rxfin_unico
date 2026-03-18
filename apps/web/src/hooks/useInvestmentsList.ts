import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface InvestmentListItem {
  id: string;
  source: 'pluggy' | 'manual';
  ticker: string | null;
  display_name: string;
  full_name: string;
  investment_type: string;
  subtype: string | null;
  balance: number;
  logo_url: string | null;
  quantity: number | null;
  unit_value: number | null;
  balance_updated_at: string | null;
  status: string | null;
}

export function useInvestmentsList() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['investments-list', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc('get_investments_list');
      if (error) throw error;
      return (data ?? []) as InvestmentListItem[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
