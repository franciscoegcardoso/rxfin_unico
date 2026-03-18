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
      if (!data) return null;
      const row = data as PortfolioSnapshot & {
        portfolio_snapshot_items?: PortfolioSnapshot['items'];
      };
      return {
        ...row,
        items: row.items ?? row.portfolio_snapshot_items ?? [],
        completeness_pct:
          row.completeness_pct != null ? Number(row.completeness_pct) : null,
      };
    },
  });
}
