import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { normalizeForWhitelist } from '@/utils/recurringWhitelist';

export interface StoreCategoryRule {
  id: string;
  user_id: string;
  normalized_store_name: string;
  original_store_name: string | null;
  category_id: string;
  category_name: string;
  created_at: string;
}

export function useStoreCategoryRules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['store-category-rules', user?.id],
    queryFn: async (): Promise<StoreCategoryRule[]> => {
      const { data, error } = await supabase
        .from('store_category_rules' as any)
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data as StoreCategoryRule[]) || []);
    },
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000,
  });

  const rules = query.data ?? [];
  const loading = query.isLoading;

  const fetchRules = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['store-category-rules', user?.id] });
  }, [queryClient, user?.id]);

  const createRule = useCallback(async (
    storeName: string,
    categoryId: string,
    categoryName: string
  ): Promise<{ success: boolean; updated: number }> => {
    if (!user) return { success: false, updated: 0 };

    const normalizedName = normalizeForWhitelist(storeName);

    try {
      const { data, error } = await supabase.rpc('apply_store_category_rule' as any, {
        p_normalized_name: normalizedName,
        p_original_name: storeName,
        p_category_id: categoryId,
        p_category_name: categoryName,
      });

      if (error) throw error;

      const result = data as any;
      const updatedCount = result?.updated || 0;

      toast.success(`Regra criada! ${updatedCount} transação(ões) atualizada(s).`);
      await queryClient.invalidateQueries({ queryKey: ['store-category-rules', user?.id] });
      return { success: true, updated: updatedCount };
    } catch (err) {
      console.error('Error creating store category rule:', err);
      toast.error('Erro ao criar regra de categoria');
      return { success: false, updated: 0 };
    }
  }, [user, queryClient]);

  const deleteRule = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('store_category_rules' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['store-category-rules', user?.id] });
      toast.success('Regra removida');
      return true;
    } catch (err) {
      console.error('Error deleting store category rule:', err);
      toast.error('Erro ao remover regra');
      return false;
    }
  }, [queryClient, user?.id]);

  const findRuleForStore = useCallback((storeName: string): StoreCategoryRule | undefined => {
    const norm = normalizeForWhitelist(storeName);
    return rules.find(r => norm.includes(r.normalized_store_name));
  }, [rules]);

  return {
    rules,
    loading,
    fetchRules,
    createRule,
    deleteRule,
    findRuleForStore,
  };
}
// sync
