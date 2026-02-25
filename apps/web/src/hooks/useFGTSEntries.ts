import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FGTSMonthlyEntry {
  id: string;
  user_id: string;
  asset_id: string;
  month: string; // YYYY-MM
  previous_balance: number;
  deposit: number;
  yield: number;
  final_balance: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FGTSEntryInput {
  asset_id: string;
  month: string;
  previous_balance: number;
  deposit: number;
  yield: number;
  final_balance: number;
  notes?: string;
}

export function useFGTSEntries(assetId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const entriesQuery = useQuery({
    queryKey: ['fgts-entries', user?.id, assetId],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('fgts_monthly_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('month', { ascending: false });
      
      if (assetId) {
        query = query.eq('asset_id', assetId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as FGTSMonthlyEntry[];
    },
    enabled: !!user?.id,
  });

  const addEntryMutation = useMutation({
    mutationFn: async (entry: FGTSEntryInput) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('fgts_monthly_entries')
        .upsert({
          user_id: user.id,
          ...entry,
        }, {
          onConflict: 'user_id,asset_id,month',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as FGTSMonthlyEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fgts-entries'] });
      toast.success('Movimentação registrada!');
    },
    onError: (error) => {
      console.error('Error adding FGTS entry:', error);
      toast.error('Erro ao registrar movimentação');
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, ...entry }: Partial<FGTSEntryInput> & { id: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('fgts_monthly_entries')
        .update(entry)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as FGTSMonthlyEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fgts-entries'] });
      toast.success('Movimentação atualizada!');
    },
    onError: (error) => {
      console.error('Error updating FGTS entry:', error);
      toast.error('Erro ao atualizar movimentação');
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('fgts_monthly_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fgts-entries'] });
      toast.success('Movimentação excluída!');
    },
    onError: (error) => {
      console.error('Error deleting FGTS entry:', error);
      toast.error('Erro ao excluir movimentação');
    },
  });

  // Get latest entry for a given asset
  const getLatestEntry = (assetId: string): FGTSMonthlyEntry | undefined => {
    const entries = entriesQuery.data || [];
    return entries.find(e => e.asset_id === assetId);
  };

  // Calculate current balance from latest entry
  const getCurrentBalance = (assetId: string): number => {
    const latest = getLatestEntry(assetId);
    return latest?.final_balance || 0;
  };

  return {
    entries: entriesQuery.data || [],
    isLoading: entriesQuery.isLoading,
    error: entriesQuery.error,
    addEntry: addEntryMutation.mutateAsync,
    updateEntry: updateEntryMutation.mutateAsync,
    deleteEntry: deleteEntryMutation.mutateAsync,
    isAdding: addEntryMutation.isPending,
    isUpdating: updateEntryMutation.isPending,
    isDeleting: deleteEntryMutation.isPending,
    getLatestEntry,
    getCurrentBalance,
  };
}
