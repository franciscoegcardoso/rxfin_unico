import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokePluggySync } from '@/lib/pluggySync';
import { useToast } from '@/hooks/use-toast';

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
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const { data, error } = await invokePluggySync({
          action: 'realtime-balance',
          pluggy_account_id: pluggyAccountId,
        });
        clearTimeout(timeout);
        if (error) throw new Error(error.message);
        const result = data as { success?: boolean; balance?: number; update_date_time?: string } | null;
        await queryClient.invalidateQueries({ queryKey: REALTIME_BALANCE_QUERY_KEY });
        const newBalance = result?.balance;
        toast({
          title: 'Saldo atualizado',
          description:
            newBalance != null
              ? `Novo saldo: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newBalance)}`
              : undefined,
        });
        setRefreshCooldownUntil((prev) => ({
          ...prev,
          [pluggyAccountId]: now + REFRESH_COOLDOWN_MS,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Não foi possível atualizar o saldo.';
        toast({ title: 'Erro', description: message, variant: 'destructive' });
      } finally {
        setRefreshingAccountId(null);
      }
    },
    [queryClient, toast, refreshCooldownUntil]
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
