import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FreshnessIndicator } from '@/components/openfinance/FreshnessIndicator';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ConnectionStatus {
  connector_name: string;
  status: string;
  last_sync_at: string | null;
  latestTransactionDate?: string | null;
}

interface PluggySyncStatusProps {
  accountType?: 'CREDIT' | 'BANK';
  className?: string;
  compact?: boolean;
}

export const PluggySyncStatus: React.FC<PluggySyncStatusProps> = ({
  accountType,
  className,
  compact = true,
}) => {
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch accounts to filter by type and get latest transaction dates
      let accountsQuery = supabase
        .from('pluggy_accounts')
        .select('id, connection_id, type')
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (accountType) {
        accountsQuery = accountsQuery.eq('type', accountType);
      }

      const { data: accounts } = await accountsQuery;
      if (!accounts || accounts.length === 0) {
        setConnections([]);
        return;
      }

      const connIds = [...new Set(accounts.map(a => a.connection_id))];
      const accountIds = accounts.map(a => a.id);

      // Fetch connections and latest transaction dates in parallel
      const [connectionsRes, latestTxRes] = await Promise.all([
        supabase
          .from('pluggy_connections')
          .select('id, connector_name, status, last_sync_at')
          .in('id', connIds)
          .is('deleted_at', null),
        // full-range intencional — sem pruning (amostra recente p/ última data de tx por conexão)
        supabase
          .from('pluggy_transactions')
          .select('account_id, date')
          .in('account_id', accountIds)
          .order('date', { ascending: false })
          .limit(500),
      ]);

      const conns = (connectionsRes.data || []) as Array<{
        id: string; connector_name: string; status: string; last_sync_at: string | null;
      }>;

      // Build map: connection_id -> latest transaction date
      const connLatestDate: Record<string, string> = {};
      const accountToConn: Record<string, string> = {};
      for (const acc of accounts) {
        accountToConn[acc.id] = acc.connection_id;
      }

      for (const tx of (latestTxRes.data || [])) {
        const connId = accountToConn[tx.account_id];
        if (!connId) continue;
        const txDate = (tx.date as string).split('T')[0];
        if (!connLatestDate[connId] || txDate > connLatestDate[connId]) {
          connLatestDate[connId] = txDate;
        }
      }

      setConnections(conns.map(c => ({
        connector_name: c.connector_name,
        status: c.status,
        last_sync_at: c.last_sync_at,
        latestTransactionDate: connLatestDate[c.id] || null,
      })));
    };
    fetchData();
  }, [accountType]);

  if (connections.length === 0) return null;

  const sorted = [...connections].sort((a, b) => {
    const aError = (a.status === 'LOGIN_ERROR' || a.status === 'OUTDATED') ? 1 : 0;
    const bError = (b.status === 'LOGIN_ERROR' || b.status === 'OUTDATED') ? 1 : 0;
    if (aError !== bError) return bError - aError;
    const aTime = a.last_sync_at ? new Date(a.last_sync_at).getTime() : 0;
    const bTime = b.last_sync_at ? new Date(b.last_sync_at).getTime() : 0;
    return aTime - bTime;
  });

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 flex-wrap', className)}>
        {sorted.map((conn, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">{conn.connector_name}:</span>
            <FreshnessIndicator
              lastSyncAt={conn.last_sync_at}
              status={conn.status}
              latestTransactionDate={conn.latestTransactionDate}
            />
          </div>
        ))}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/50 cursor-help shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[240px] text-xs">
              Algumas transações podem levar algumas horas para aparecer dependendo do processamento da instituição financeira.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border bg-muted/30 px-3 py-2 space-y-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">Status de Sincronização</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[240px] text-xs">
              Algumas transações podem levar algumas horas para aparecer dependendo do processamento da instituição financeira.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {sorted.map((conn, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">{conn.connector_name}:</span>
          <FreshnessIndicator
            lastSyncAt={conn.last_sync_at}
            status={conn.status}
            latestTransactionDate={conn.latestTransactionDate}
          />
        </div>
      ))}
    </div>
  );
};
