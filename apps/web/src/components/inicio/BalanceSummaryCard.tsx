import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { useRealtimeBalance } from '@/hooks/useRealtimeBalance';
import { formatBalanceAge, getStaleStatus } from '@/utils/formatBalance';
import { useVisibility } from '@/contexts/VisibilityContext';
import { ConnectorLogo } from '@/components/openfinance/ConnectorLogo';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number, isHidden: boolean) => {
  if (isHidden) return '••••••';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const BalanceSummaryCard: React.FC = () => {
  const { isHidden } = useVisibility();
  const {
    data,
    isLoading,
    refreshAccountBalance,
    refreshingAccountId,
    isRefreshCooldown,
  } = useRealtimeBalance();

  if (isLoading && !data) {
    return (
      <Card className="rounded-xl border border-border bg-card">
        <CardContent className="p-5">
          <div className="animate-pulse flex flex-col gap-3">
            <div className="h-6 w-32 bg-muted rounded" />
            <div className="h-8 w-48 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || (data.accounts.length === 0 && data.summary.total_checking === 0 && data.summary.total_savings === 0)) {
    return null;
  }

  const { accounts, summary } = data;
  const isChecking = (a: RealtimeBalanceAccount) =>
    a.type === 'BANK' && (a.subtype === 'CHECKING_ACCOUNT' || (a.subtype ?? '').toLowerCase().includes('checking'));
  const isSavings = (a: RealtimeBalanceAccount) =>
    a.type === 'BANK' && (a.subtype === 'SAVINGS_ACCOUNT' || (a.subtype ?? '').toLowerCase().includes('savings'));
  const checkingAccounts = accounts.filter(isChecking);
  const savingsAccounts = accounts.filter(isSavings);
  const totalChecking = summary.total_checking ?? checkingAccounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalSavings = summary.total_savings ?? savingsAccounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  const displayAccounts = accounts.filter((a) => a.type === 'BANK');

  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardContent className="p-5 space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Saldo em contas
          </p>
          <p className="text-2xl font-bold tabular-nums text-foreground mt-0.5">
            {formatCurrency(totalChecking, isHidden)}
          </p>
          {totalSavings > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Poupança: {formatCurrency(totalSavings, isHidden)}
            </p>
          )}
        </div>

        {summary.any_stale && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              Atualizado há {summary.oldest_balance_at ? formatBalanceAge((Date.now() - new Date(summary.oldest_balance_at).getTime()) / 60000) : 'várias horas'}
            </span>
          </div>
        )}

        {summary.has_errors && (
          <Link
            to="/instituicoes-financeiras"
            className="inline-flex items-center gap-1.5 text-sm text-destructive hover:underline"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            Há conexões com erro
          </Link>
        )}

        {displayAccounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {displayAccounts.map((acc) => {
              const staleStatus = getStaleStatus(acc.is_stale, acc.balance_age_minutes);
              const ageLabel = formatBalanceAge(acc.balance_age_minutes);
              const isRefreshing = refreshingAccountId === acc.pluggy_account_id;
              const onCooldown = isRefreshCooldown(acc.pluggy_account_id);

              return (
                <div
                  key={acc.id}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                    staleStatus === 'stale'
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-border bg-muted/30'
                  )}
                >
                  <ConnectorLogo
                    imageUrl={acc.connector_image_url}
                    primaryColor={acc.connector_color}
                    connectorName={acc.connector_name}
                    size="sm"
                    className="shrink-0"
                  />
                  <span className="font-medium truncate max-w-[120px]" title={acc.connector_name}>
                    {acc.connector_name}
                  </span>
                  <span className="tabular-nums font-semibold text-foreground shrink-0">
                    {formatCurrency(acc.balance ?? 0, isHidden)}
                  </span>
                  {ageLabel && (
                    <span className="text-xs text-muted-foreground shrink-0">{ageLabel}</span>
                  )}
                  {(acc.is_stale || staleStatus === 'aging') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      disabled={isRefreshing || onCooldown}
                      onClick={() => refreshAccountBalance(acc.pluggy_account_id)}
                      aria-label="Atualizar saldo"
                    >
                      {isRefreshing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
