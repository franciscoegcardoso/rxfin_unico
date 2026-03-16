import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Row returned by get_pluggy_liability_suggestions RPC (p_status: 'pending').
 * Backend must provide: detect_pluggy_liabilities(), get_pluggy_liability_suggestions(p_status),
 * confirm_pluggy_liability_suggestion(p_id), ignore_pluggy_liability_suggestion(p_id),
 * ignore_all_pluggy_liability_suggestions().
 */
export interface PluggyLiabilitySuggestion {
  id: string;
  name: string;
  type: string;
  value: number;
  confidence_pct: number;
  origin: string;
  [key: string]: unknown;
}

function isSuggestionRow(row: unknown): row is PluggyLiabilitySuggestion {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    typeof r.type === 'string' &&
    typeof r.value === 'number'
  );
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
      const rows = Array.isArray(data) ? data : [];
      return rows.filter(isSuggestionRow);
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
      const { error } = await supabase.rpc('confirm_pluggy_liability_suggestion', { p_id: id });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey });
    },
    [queryClient, queryKey]
  );

  const ignore = useCallback(
    async (id: string) => {
      const { error } = await supabase.rpc('ignore_pluggy_liability_suggestion', { p_id: id });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey });
    },
    [queryClient, queryKey]
  );

  const ignoreAll = useCallback(async () => {
    const { error } = await supabase.rpc('ignore_all_pluggy_liability_suggestions');
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const confirmAll = useCallback(async () => {
    const list = query.data ?? [];
    for (const s of list) {
      const { error } = await supabase.rpc('confirm_pluggy_liability_suggestion', { p_id: s.id });
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
