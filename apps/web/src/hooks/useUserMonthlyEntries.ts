import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MonthlyEntry } from '@/types/financial';

const QUERY_KEY = 'user-monthly-entries';

function dbToApp(row: any): MonthlyEntry {
  return {
    month: row.month,
    itemId: row.item_id,
    type: row.entry_type,
    value: Number(row.value),
    isProjection: row.is_projection,
    isManualOverride: row.is_manual_override,
  };
}

export function useUserMonthlyEntries() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: [QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_monthly_entries' as any)
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return (data as any[]).map(dbToApp);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const upsertEntry = useMutation({
    mutationFn: async (entry: MonthlyEntry) => {
      const { error } = await supabase.from('user_monthly_entries' as any).upsert({
        user_id: userId,
        month: entry.month,
        item_id: entry.itemId,
        entry_type: entry.type,
        value: entry.value,
        is_projection: entry.isProjection,
        is_manual_override: entry.isManualOverride ?? false,
      } as any, { onConflict: 'user_id,month,item_id,entry_type' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  const upsertEntries = useMutation({
    mutationFn: async (entries: MonthlyEntry[]) => {
      if (entries.length === 0) return;
      const rows = entries.map(e => ({
        user_id: userId,
        month: e.month,
        item_id: e.itemId,
        entry_type: e.type,
        value: e.value,
        is_projection: e.isProjection,
        is_manual_override: e.isManualOverride ?? false,
      }));
      const { error } = await supabase.from('user_monthly_entries' as any)
        .upsert(rows as any, { onConflict: 'user_id,month,item_id,entry_type' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  const deleteByItemId = useMutation({
    mutationFn: async ({ itemId, type }: { itemId: string; type: 'income' | 'expense' }) => {
      const { error } = await supabase.from('user_monthly_entries' as any)
        .delete()
        .eq('user_id', userId)
        .eq('item_id', itemId)
        .eq('entry_type', type);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  // Helper functions for reading
  const getEntry = (month: string, itemId: string, type: 'income' | 'expense'): number => {
    const entries = query.data ?? [];
    const entry = entries.find(e => e.month === month && e.itemId === itemId && e.type === type);
    return entry?.value || 0;
  };

  const isManualOverride = (month: string, itemId: string, type: 'income' | 'expense'): boolean => {
    const entries = query.data ?? [];
    const entry = entries.find(e => e.month === month && e.itemId === itemId && e.type === type);
    return entry?.isManualOverride ?? false;
  };

  return {
    monthlyEntries: query.data ?? [],
    isLoading: query.isLoading,
    upsertEntry,
    upsertEntries,
    deleteByItemId,
    getEntry,
    isManualOverride,
  };
}
// sync
