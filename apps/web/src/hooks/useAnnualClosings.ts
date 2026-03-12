import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AnnualClosing {
  id: string;
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalPatrimony: number;
  netBalance: number;
  patrimonyBreakdown: Record<string, number> | null;
  isEstimated: boolean;
  notes: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnnualClosings() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['annual_closings', user?.id],
    queryFn: async (): Promise<AnnualClosing[]> => {
      if (!user?.id) return [];

      try {
        const { data, error } = await (supabase as any)
          .from('annual_closings')
          .select('*')
          .eq('user_id', user.id)
          .order('year', { ascending: true });

        if (error) return [];

        return (data ?? []).map((row: any): AnnualClosing => ({
        id: row.id,
        year: row.year,
        totalIncome: Number(row.total_income),
        totalExpense: Number(row.total_expense),
        totalPatrimony: Number(row.total_patrimony),
        netBalance: Number(row.net_balance),
        patrimonyBreakdown: row.patrimony_breakdown ?? null,
        isEstimated: row.is_estimated,
        notes: row.notes ?? null,
      }));
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const getClosingForYear = (year: number): AnnualClosing | undefined =>
    query.data?.find(c => c.year === year);

  return {
    closings: query.data ?? [],
    isLoading: query.isLoading,
    getClosingForYear,
  };
}
