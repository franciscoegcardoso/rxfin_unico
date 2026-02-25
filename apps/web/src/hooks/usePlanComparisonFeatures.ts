import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlanComparisonFeature {
  id: string;
  feature_name: string;
  category: string;
  order_index: number;
  free_value: string;
  starter_value: string;
  pro_value: string;
  is_default: boolean;
  is_active: boolean;
  page_slug: string | null;
  created_at: string;
  updated_at: string;
}

export function usePlanComparisonFeatures(includeInactive = false) {
  return useQuery({
    queryKey: ['plan-comparison-features', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('plan_comparison_features')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PlanComparisonFeature[];
    },
  });
}

export function usePlanComparisonMutations() {
  const queryClient = useQueryClient();

  const createFeature = useMutation({
    mutationFn: async (feature: Omit<PlanComparisonFeature, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('plan_comparison_features')
        .insert(feature)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-comparison-features'] });
      toast.success('Item adicionado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar item: ' + error.message);
    },
  });

  const updateFeature = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlanComparisonFeature> & { id: string }) => {
      const { data, error } = await supabase
        .from('plan_comparison_features')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-comparison-features'] });
      toast.success('Item atualizado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar item: ' + error.message);
    },
  });

  const deleteFeature = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plan_comparison_features')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-comparison-features'] });
      toast.success('Item excluído com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao excluir item: ' + error.message);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('plan_comparison_features')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-comparison-features'] });
      toast.success(variables.is_active ? 'Item ativado' : 'Item movido para não inseridos');
    },
    onError: (error) => {
      toast.error('Erro ao alterar status: ' + error.message);
    },
  });

  return {
    createFeature,
    updateFeature,
    deleteFeature,
    toggleActive,
  };
}
