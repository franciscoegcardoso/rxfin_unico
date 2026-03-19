import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Driver } from '@/types/financial';
import { toast } from 'sonner';

const QUERY_KEY = 'user-drivers';

function dbToApp(row: any): Driver {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    isOwner: row.is_owner,
  };
}

export function useUserDrivers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: [QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_drivers' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at');
      if (error) throw error;
      return (data as any[]).map(dbToApp);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const addDriver = useMutation({
    mutationFn: async ({ name, email, isOwner }: { name: string; email?: string; isOwner?: boolean }) => {
      const { error } = await supabase.from('user_drivers' as any).insert({
        user_id: userId,
        name: name.trim(),
        email: email?.trim(),
        is_owner: isOwner ?? false,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    onError: () => toast.error('Erro ao adicionar motorista'),
  });

  const updateDriver = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Driver> }) => {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.isOwner !== undefined) dbUpdates.is_owner = updates.isOwner;
      const { error } = await supabase.from('user_drivers' as any).update(dbUpdates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    onError: () => toast.error('Erro ao atualizar motorista'),
  });

  const removeDriver = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_drivers' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    onError: () => toast.error('Erro ao remover motorista'),
  });

  return {
    drivers: query.data ?? [],
    isLoading: query.isLoading,
    addDriver,
    updateDriver,
    removeDriver,
  };
}
// sync
