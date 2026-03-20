import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface RealtimeBalanceAccount {
  id: string;
  pluggy_account_id: string;
  name: string;
  type: string;
  subtype: string | null;
  balance: number;
  currency_code: string;
  balance_updated_at: string | null;
  balance_age_minutes: number | null;
  is_stale: boolean;
  credit_limit: number | null;
  available_credit_limit: number | null;
  card_brand: string | null;
  connector_name: string;
  connector_image_url: string | null;
  connector_color: string | null;
  last_sync_at: string | null;
  next_auto_sync_at: string | null;
  connection_status: string | null;
  error_type: string | null;
}

export interface RealtimeBalanceSummary {
  total_checking: number;
  total_savings: number;
  total_credit_used: number;
  total_credit_limit: number;
  oldest_balance_at: string | null;
  any_stale: boolean;
  has_errors: boolean;
}

export interface RealtimeBalanceData {
  accounts: RealtimeBalanceAccount[];
  summary: RealtimeBalanceSummary;
  fetched_at: string;
}

/** Mesma regra do header desktop (HomeHeader): total em contas corrente Pluggy. */
export function getTotalCheckingBalance(
  data: RealtimeBalanceData | null | undefined
): number {
  if (!data) return 0;
  return (
    data.summary?.total_checking ??
    (data.accounts ?? [])
      .filter(
        (a) =>
          a.type === 'BANK' &&
          (a.subtype === 'CHECKING_ACCOUNT' ||
            (a.subtype ?? '').toLowerCase().includes('checking'))
      )
      .reduce((s, a) => s + (a.balance ?? 0), 0)
  );
}

const REALTIME_BALANCE_QUERY_KEY = ['realtimeBalance'] as const;
const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes
const REFRESH_COOLDOWN_MS = 30 * 1000; // 30s rate limit per account

async function fetchRealtimeBalance(): Promise<RealtimeBalanceData | null> {
  const { data, error } = await supabase.rpc('get_realtime_balance');
  if (error) throw error;
  return data as RealtimeBalanceData | null;
}

export function useRealtimeBalance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [refreshingAccountId, setRefreshingAccountId] = useState<string | null>(null);
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState<Record<string, number>>({});

  const query = useQuery({
    queryKey: REALTIME_BALANCE_QUERY_KEY,
    queryFn: fetchRealtimeBalance,
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });

  const refreshAccountBalance = useCallback(
    async (pluggyAccountId: string) => {
      if (!user?.id) return;
      const now = Date.now();
      if ((refreshCooldownUntil[pluggyAccountId] ?? 0) > now) {
        toast({
          title: 'Aguarde',
          description: 'Atualização disponível em alguns segundos.',
          variant: 'default',
        });
        return;
      }
      setRefreshingAccountId(pluggyAccountId);
      try {
        const { data, error } = await supabase.rpc('get_account_balance_fresh', {
          p_user_id: user.id,
          p_account_id: pluggyAccountId,
        });
        if (error) throw error;
        const result = (data ?? null) as {
          balance: number;
          balance_updated_at: string | null;
          balance_age_minutes: number | null;
          is_stale: boolean;
          credit_limit: number | null;
          available_credit_limit: number | null;
        } | null;

        queryClient.setQueryData<RealtimeBalanceData | null>(REALTIME_BALANCE_QUERY_KEY, (prev) => {
          if (!prev || !result) return prev;
          const nextAccounts = prev.accounts.map((acc) =>
            acc.pluggy_account_id === pluggyAccountId
              ? {
                  ...acc,
                  balance: result.balance ?? acc.balance,
                  balance_updated_at: result.balance_updated_at ?? acc.balance_updated_at,
                  balance_age_minutes: result.balance_age_minutes ?? acc.balance_age_minutes,
                  is_stale: result.is_stale ?? acc.is_stale,
                  credit_limit: result.credit_limit ?? acc.credit_limit,
                  available_credit_limit: result.available_credit_limit ?? acc.available_credit_limit,
                }
              : acc
          );

          const totalChecking = nextAccounts
            .filter(
              (a) =>
                a.type === 'BANK' &&
                (a.subtype === 'CHECKING_ACCOUNT' || (a.subtype ?? '').toLowerCase().includes('checking'))
            )
            .reduce((s, a) => s + (a.balance ?? 0), 0);
          const totalSavings = nextAccounts
            .filter(
              (a) =>
                a.type === 'BANK' &&
                (a.subtype === 'SAVINGS_ACCOUNT' || (a.subtype ?? '').toLowerCase().includes('savings'))
            )
            .reduce((s, a) => s + (a.balance ?? 0), 0);

          return {
            ...prev,
            accounts: nextAccounts,
            summary: {
              ...prev.summary,
              total_checking: totalChecking,
              total_savings: totalSavings,
              any_stale: nextAccounts.some((a) => !!a.is_stale),
            },
          };
        });

        toast({
          title: 'Saldo atualizado',
          duration: 2000,
        });
        setRefreshCooldownUntil((prev) => ({
          ...prev,
          [pluggyAccountId]: now + REFRESH_COOLDOWN_MS,
        }));
      } catch {
        toast({
          title: 'Não foi possível atualizar',
          description: 'tente sincronizar novamente',
          variant: 'destructive',
        });
      } finally {
        setRefreshingAccountId(null);
      }
    },
    [queryClient, toast, refreshCooldownUntil, user?.id]
  );

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    refreshAccountBalance,
    refreshingAccountId,
    isRefreshCooldown: (pluggyAccountId: string) =>
      (refreshCooldownUntil[pluggyAccountId] ?? 0) > Date.now(),
  };
}
