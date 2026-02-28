import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Page {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  path: string;
  icon: string | null;
  category: string | null;
  order_index: number | null;
  access_level: 'public' | 'free' | 'premium' | 'admin';
  min_plan_slug: string | null;
  is_active_users: boolean;
  is_active_admin: boolean;
  show_when_unavailable: boolean;
  group_id: string | null;
  order_in_group: number | null;
  created_at: string;
  updated_at: string;
}

// Type for inserting/updating - show_when_unavailable is optional (defaults to true)
export type PageInsert = Omit<Page, 'id' | 'created_at' | 'updated_at' | 'show_when_unavailable'> & {
  show_when_unavailable?: boolean;
};

export interface PageFeature {
  id: string;
  page_id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  is_enabled: boolean;
  access_level: 'public' | 'free' | 'premium' | 'admin';
  created_at: string;
  updated_at: string;
}

export type PageUpdate = Partial<PageInsert>;
export type PageFeatureInsert = Omit<PageFeature, 'id' | 'created_at' | 'updated_at'>;
export type PageFeatureUpdate = Partial<PageFeatureInsert>;

type StatusFilter = 'all' | 'active_users' | 'active_admin' | 'inactive';

export function usePages(statusFilter?: StatusFilter) {
  const queryClient = useQueryClient();

  const { data: pages = [], isLoading, error, refetch } = useQuery({
    queryKey: ['pages', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('pages')
        .select('*')
        .order('order_index', { ascending: true });

      if (statusFilter === 'active_users') {
        query = query.eq('is_active_users', true);
      } else if (statusFilter === 'active_admin') {
        query = query.eq('is_active_admin', true);
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active_users', false).eq('is_active_admin', false);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Page[];
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always', // Refetch when component mounts
  });

  const createPage = useMutation({
    mutationFn: async (page: PageInsert) => {
      const { data, error } = await supabase
        .from('pages')
        .insert(page)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast.success('Página criada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error creating page:', error);
      if (error.message.includes('duplicate key')) {
        toast.error('Já existe uma página com este slug');
      } else {
        toast.error('Erro ao criar página');
      }
    },
  });

  const updatePage = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & PageUpdate) => {
      const { data, error } = await supabase
        .from('pages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast.success('Página atualizada!');
    },
    onError: (error: Error) => {
      console.error('Error updating page:', error);
      toast.error('Erro ao atualizar página');
    },
  });

  const deletePage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast.success('Página excluída!');
    },
    onError: (error: Error) => {
      console.error('Error deleting page:', error);
      toast.error('Erro ao excluir página');
    },
  });

  const updatePageGroup = useMutation({
    mutationFn: async ({ pageId, groupId, orderInGroup }: { pageId: string; groupId: string | null; orderInGroup: number }) => {
      const { data, error } = await supabase
        .from('pages')
        .update({ group_id: groupId, order_in_group: orderInGroup })
        .eq('id', pageId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    },
    onError: (error: Error) => {
      console.error('Error updating page group:', error);
      toast.error('Erro ao mover página');
    },
  });

  const reorderPagesInGroup = useMutation({
    mutationFn: async (pages: { id: string; order_in_group: number }[]) => {
      const updates = pages.map(p => 
        supabase
          .from('pages')
          .update({ order_in_group: p.order_in_group })
          .eq('id', p.id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    },
    onError: (error: Error) => {
      console.error('Error reordering pages:', error);
      toast.error('Erro ao reordenar páginas');
    },
  });

  const toggleUserStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: boolean }) => {
      // When enabling (is_active_users becomes true), also set show_when_unavailable to true
      const newStatus = !currentStatus;
      const updates: Record<string, unknown> = { is_active_users: newStatus };
      if (newStatus === true) {
        updates.show_when_unavailable = true;
      }
      
      const { data, error } = await supabase
        .from('pages')
        .update(updates as Record<string, boolean>)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Page;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast.success(`Página ${data.is_active_users ? 'ativada' : 'desativada'} para usuários!`);
    },
    onError: (error: Error) => {
      console.error('Error toggling user status:', error);
      toast.error('Erro ao alterar status');
    },
  });

  const toggleShowWhenUnavailable = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: boolean }) => {
      const { data, error } = await supabase
        .from('pages')
        .update({ show_when_unavailable: !currentStatus } as Record<string, boolean>)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Page;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast.success(`Exibição ${data.show_when_unavailable ? 'ativada' : 'desativada'}!`);
    },
    onError: (error: Error) => {
      console.error('Error toggling show when unavailable:', error);
      toast.error('Erro ao alterar exibição');
    },
  });

  const toggleAdminStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: boolean }) => {
      const { data, error } = await supabase
        .from('pages')
        .update({ is_active_admin: !currentStatus })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast.success(`Página ${data.is_active_admin ? 'ativada' : 'desativada'} para admins!`);
    },
    onError: (error: Error) => {
      console.error('Error toggling admin status:', error);
      toast.error('Erro ao alterar status');
    },
  });

  const updatePagePlan = useMutation({
    mutationFn: async ({ id, minPlanSlug }: { id: string; minPlanSlug: string }) => {
      const { data, error } = await supabase
        .from('pages')
        .update({ min_plan_slug: minPlanSlug })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast.success('Plano da página atualizado!');
    },
    onError: (error: Error) => {
      console.error('Error updating page plan:', error);
      toast.error('Erro ao alterar plano');
    },
  });

  return {
    pages,
    isLoading,
    error,
    refetch,
    createPage,
    updatePage,
    deletePage,
    toggleUserStatus,
    toggleAdminStatus,
    toggleShowWhenUnavailable,
    updatePageGroup,
    reorderPagesInGroup,
    updatePagePlan,
  };
}

export function usePageFeatures(pageId?: string) {
  const queryClient = useQueryClient();

  const { data: features = [], isLoading, error } = useQuery({
    queryKey: ['page-features', pageId],
    queryFn: async () => {
      if (!pageId) return [];
      
      const { data, error } = await supabase
        .from('page_features')
        .select('*')
        .eq('page_id', pageId)
        .order('feature_name', { ascending: true });
      
      if (error) throw error;
      return data as PageFeature[];
    },
    enabled: !!pageId,
  });

  const createFeature = useMutation({
    mutationFn: async (feature: PageFeatureInsert) => {
      const { data, error } = await supabase
        .from('page_features')
        .insert(feature)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-features'] });
      toast.success('Feature criada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error creating feature:', error);
      toast.error('Erro ao criar feature');
    },
  });

  const updateFeature = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & PageFeatureUpdate) => {
      const { data, error } = await supabase
        .from('page_features')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-features'] });
      toast.success('Feature atualizada!');
    },
    onError: (error: Error) => {
      console.error('Error updating feature:', error);
      toast.error('Erro ao atualizar feature');
    },
  });

  const deleteFeature = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('page_features')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-features'] });
      toast.success('Feature excluída!');
    },
    onError: (error: Error) => {
      console.error('Error deleting feature:', error);
      toast.error('Erro ao excluir feature');
    },
  });

  const toggleFeature = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: boolean }) => {
      const { data, error } = await supabase
        .from('page_features')
        .update({ is_enabled: !currentStatus })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['page-features'] });
      toast.success(`Feature ${data.is_enabled ? 'ativada' : 'desativada'}!`);
    },
    onError: (error: Error) => {
      console.error('Error toggling feature:', error);
      toast.error('Erro ao alterar status');
    },
  });

  return {
    features,
    isLoading,
    error,
    createFeature,
    updateFeature,
    deleteFeature,
    toggleFeature,
  };
}
