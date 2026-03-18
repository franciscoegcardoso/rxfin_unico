import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AllocationStatusRow } from '@/types/allocation';

export function useAllocationStatus() {
  return useQuery({
    queryKey: ['allocation-status'],
    queryFn: async (): Promise<AllocationStatusRow[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('mv_portfolio_allocation_status')
        .select('*')
        .eq('user_id', user.id)
        .order('drift_priority_score', { ascending: false });

      if (error) throw error;
      return (data ?? []) as AllocationStatusRow[];
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

export function calcHealthScore(rows: AllocationStatusRow[]): number {
  if (rows.length === 0) return 0;
  const totalDrift = rows.reduce(
    (sum, r) => sum + (r.drift_priority_score ?? 0),
    0
  );
  return Math.max(0, Math.min(100, Math.round(100 - totalDrift * 8)));
}
