import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Row returned by get_pluggy_liability_suggestions RPC (p_status: 'pending').
 */
export interface PluggyLiabilitySuggestion {
  id: string;
  source_table: string;
  source_id: string;
  suggested_name: string;
  suggested_type: string;
  suggested_value: number;
  suggested_creditor: string | null;
  suggested_monthly_installment: number | null;
  suggested_due_day: number | null;
  confidence: number;
  detection_rule: string | null;
  status: string;
  linked_asset_id: string | null;
  suggested_metadata: Record<string, unknown> | null;
  created_at: string;
}

export function usePluggyLiabilitySuggestions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['pluggy_liability_suggestions', user?.id ?? ''];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<PluggyLiabilitySuggestion[]> => {
      const { data, error } = await supabase.rpc('get_pluggy_liability_suggestions', {
        p_status: 'pending',
      });
      if (error) {
        if (error.code === '42883' || error.message?.includes('does not exist')) return [];
        throw error;
      }
      return (data ?? []) as PluggyLiabilitySuggestion[];
    },
    enabled: !!user,
  });

  // On mount: trigger detection (fire-and-forget), then suggestions are loaded by the query
  useEffect(() => {
    if (!user) return;
    supabase.rpc('detect_pluggy_liabilities').then(({ error }) => {
      if (error) console.warn('detect_pluggy_liabilities:', error.message);
      queryClient.invalidateQueries({ queryKey });
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- only on mount / user change

  const confirm = useCallback(
    async (id: string) => {
      const { error } = await supabase.rpc('confirm_pluggy_liability', { p_suggestion_id: id });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey });
    },
    [queryClient, queryKey]
  );

  const ignore = useCallback(
    async (id: string) => {
      const { error } = await supabase.rpc('ignore_pluggy_suggestion', {
        p_suggestion_id: id,
        p_snooze: false,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey });
    },
    [queryClient, queryKey]
  );

  const confirmAll = useCallback(async () => {
    const { error } = await supabase.rpc('confirm_all_pluggy_liabilities');
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const ignoreAll = useCallback(async () => {
    const list = query.data ?? [];
    for (const s of list) {
      const { error } = await supabase.rpc('ignore_pluggy_suggestion', {
        p_suggestion_id: s.id,
        p_snooze: false,
      });
      if (error) throw error;
    }
    await queryClient.invalidateQueries({ queryKey });
  }, [query.data, queryClient, queryKey]);

  return {
    suggestions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    confirm,
    ignore,
    confirmAll,
    ignoreAll,
  };
}
