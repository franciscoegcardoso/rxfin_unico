import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PortfolioSnapshot } from '@/types/allocation';

export function useLatestSnapshot() {
  return useQuery({
    queryKey: ['latest-snapshot'],
    queryFn: async (): Promise<PortfolioSnapshot | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select(
          `
          *,
          portfolio_snapshot_items (*)
        `
        )
        .eq('user_id', user.id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PortfolioSnapshot | null;
    },
  });
}
