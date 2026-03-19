import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AssetMonthlyEntry } from '@/types/financial';
import { toast } from 'sonner';

const QUERY_KEY = 'user-asset-monthly-entries';

export function useUserAssetMonthlyEntries() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: [QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_asset_monthly_entries' as any)
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return (data as any[]).map((row: any): AssetMonthlyEntry => ({
        month: row.month,
        assetId: row.asset_id,
        value: Number(row.value),
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const upsertEntry = useMutation({
    mutationFn: async (entry: AssetMonthlyEntry) => {
      const { error } = await supabase.from('user_asset_monthly_entries' as any).upsert({
        user_id: userId,
        month: entry.month,
        asset_id: entry.assetId,
        value: entry.value,
      } as any, { onConflict: 'user_id,month,asset_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    onError: () => toast.error('Erro ao salvar valor do ativo'),
  });

  const getEntry = (month: string, assetId: string): number => {
    const entries = query.data ?? [];
    const entry = entries.find(e => e.month === month && e.assetId === assetId);
    return entry?.value || 0;
  };

  return {
    assetMonthlyEntries: query.data ?? [],
    isLoading: query.isLoading,
    upsertEntry,
    getEntry,
  };
}
// sync
