import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RecurringBadgeInfo {
  recurring_id: string;
  description: string;
  average_amount: number;
  regularity_pct: number;
  occurrence_count: number;
  type: string;
}

/** Builds a stable cache key from the set of transaction IDs so we don't refetch the same set. */
function idsKey(ids: string[]): string {
  if (ids.length === 0) return '';
  return [...ids].sort().join(',');
}

async function fetchRecurringBadges(
  userId: string,
  transactionIds: string[]
): Promise<Record<string, RecurringBadgeInfo>> {
  if (transactionIds.length === 0) return {};
  const { data, error } = await supabase.rpc('get_recurring_badge_for_transactions', {
    p_user_id: userId,
    p_transaction_ids: transactionIds,
  });
  if (error) throw error;
  return (data as Record<string, RecurringBadgeInfo>) ?? {};
}

const DEBOUNCE_MS = 300;

/**
 * Fetches recurring badge info for the given Pluggy transaction IDs.
 * Debounces by 300ms and caches by the set of IDs (no duplicate requests for same set).
 */
export function useRecurringBadges(transactionIds: string[]) {
  const { user } = useAuth();
  const [debouncedIds, setDebouncedIds] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedIds(transactionIds);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [transactionIds]);

  const key = idsKey(debouncedIds);
  const query = useQuery({
    queryKey: ['recurring-badges', user?.id ?? '', key],
    queryFn: () => fetchRecurringBadges(user!.id, debouncedIds),
    enabled: !!user && debouncedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => ({
    badgeMap: query.data ?? {},
    isLoading: query.isLoading,
    error: query.error,
  }), [query.data, query.isLoading, query.error]);
}
