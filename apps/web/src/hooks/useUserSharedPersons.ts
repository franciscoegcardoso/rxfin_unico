import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SharedPerson } from '@/types/financial';
import { toast } from 'sonner';

const QUERY_KEY = 'user-shared-persons';

function dbToApp(row: any): SharedPerson {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    isOwner: row.is_owner,
    incomeItemIds: row.income_item_ids || [],
  };
}

export function useUserSharedPersons() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: [QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_shared_persons' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at');
      if (error) throw error;
      return (data as any[]).map(dbToApp);
    },
    enabled: !!userId,
  });

  const addPerson = useMutation({
    mutationFn: async ({ name, email, isOwner }: { name: string; email?: string; isOwner?: boolean }) => {
      const { error } = await supabase.from('user_shared_persons' as any).insert({
        user_id: userId,
        name: name.trim(),
        email: email?.trim(),
        is_owner: isOwner ?? false,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    onError: () => toast.error('Erro ao adicionar pessoa'),
  });

  const updatePerson = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SharedPerson> }) => {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.isOwner !== undefined) dbUpdates.is_owner = updates.isOwner;
      if (updates.incomeItemIds !== undefined) dbUpdates.income_item_ids = updates.incomeItemIds;
      const { error } = await supabase.from('user_shared_persons' as any).update(dbUpdates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    onError: () => toast.error('Erro ao atualizar pessoa'),
  });

  const removePerson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_shared_persons' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    onError: () => toast.error('Erro ao remover pessoa'),
  });

  return {
    sharedPersons: query.data ?? [],
    isLoading: query.isLoading,
    addPerson,
    updatePerson,
    removePerson,
  };
}
// sync
