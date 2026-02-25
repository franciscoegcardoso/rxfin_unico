import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PageGroup {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  order_index: number | null;
  is_collapsible: boolean;
  created_at: string;
  updated_at: string;
}

export type PageGroupInsert = Omit<PageGroup, 'id' | 'created_at' | 'updated_at'>;
export type PageGroupUpdate = Partial<PageGroupInsert>;

export function usePageGroups() {
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading, error } = useQuery({
    queryKey: ['page-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_groups')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data as PageGroup[];
    },
  });

  const createGroup = useMutation({
    mutationFn: async (group: PageGroupInsert) => {
      const { data, error } = await supabase
        .from('page_groups')
        .insert(group)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-groups'] });
      toast.success('Grupo criado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error creating group:', error);
      toast.error('Erro ao criar grupo');
    },
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & PageGroupUpdate) => {
      const { data, error } = await supabase
        .from('page_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-groups'] });
      toast.success('Grupo atualizado!');
    },
    onError: (error: Error) => {
      console.error('Error updating group:', error);
      toast.error('Erro ao atualizar grupo');
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('page_groups')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-groups'] });
      toast.success('Grupo excluído!');
    },
    onError: (error: Error) => {
      console.error('Error deleting group:', error);
      toast.error('Erro ao excluir grupo');
    },
  });

  const reorderGroups = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase
          .from('page_groups')
          .update({ order_index: index })
          .eq('id', id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-groups'] });
    },
    onError: (error: Error) => {
      console.error('Error reordering groups:', error);
      toast.error('Erro ao reordenar grupos');
    },
  });

  return {
    groups,
    isLoading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,
  };
}
