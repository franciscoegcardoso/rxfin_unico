import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  original_price_monthly: number | null;
  original_price_yearly: number | null;
  discount_reason: string | null;
  has_promo: boolean;
  features: string[];
  allowed_pages: string[];
  is_active: boolean;
  is_public: boolean;
  order_index: number;
  highlight_label: string | null;
  checkout_url: string | null;
  checkout_url_yearly: string | null;
  guru_product_id: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscriptionPlans(includePrivate = false) {
  return useQuery({
    queryKey: ['subscription-plans', includePrivate],
    queryFn: async () => {
      let query = supabase
        .from('subscription_plans')
        .select('*')
        .order('order_index', { ascending: true });

      if (!includePrivate) {
        query = query.eq('is_public', true).eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always', // Refetch when component mounts
  });
}

export function useSubscriptionPlanMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SubscriptionPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast({
        title: 'Plano atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createPlan = useMutation({
    mutationFn: async (plan: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert(plan)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast({
        title: 'Plano criado',
        description: 'O novo plano foi criado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast({
        title: 'Plano excluído',
        description: 'O plano foi removido com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return { updatePlan, createPlan, deletePlan };
}
