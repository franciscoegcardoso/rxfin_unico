import React from 'react';
import { Clock, Loader2, RefreshCw } from 'lucide-react';
import { useRealtimeBalance } from '@/hooks/useRealtimeBalance';
import { useVisibility } from '@/contexts/VisibilityContext';
import { formatBalanceAge, isRealtimeBalanceFresh } from '@/utils/formatBalance';
import { BalanceLiveStatusBadge } from '@/components/inicio/BalanceLiveStatusBadge';
import { ConnectorLogo } from '@/components/openfinance/ConnectorLogo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number, isHidden: boolean) => {
  if (isHidden) return '••••••';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getAccountTypeLabel = (subtype: string | null) => {
  if (!subtype) return 'Conta';
  const s = subtype.toLowerCase();
  if (s.includes('checking')) return 'Corrente';
  if (s.includes('savings')) return 'Poupança';
  return 'Conta';
};

function staleBalanceHint(ageMinutes: number): string {
  if (ageMinutes >= 60) return `Atualizado há ${Math.floor(ageMinutes / 60)}h`;
  return `Atualizado há ${Math.round(ageMinutes)}min`;
}

export const ContasBancarias: React.FC = () => {
  const { data, isLoading, refreshAccountBalance, refreshingAccountId } = useRealtimeBalance();
  const { isHidden } = useVisibility();

  if (isLoading && !data) {
    return (
      <Card className="rounded-xl border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))]">
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-base font-semibold">Contas</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const accounts = (data?.accounts ?? []).filter((a) => a.type === 'BANK');
  const oldestMinutes = accounts.reduce((acc, a) => {
    const m = a.balance_age_minutes ?? 0;
    return m > acc ? m : acc;
  }, 0);
  const updatedLabel = formatBalanceAge(oldestMinutes);

  if (accounts.length === 0) return null;

  return (
    <Card className="rounded-xl border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))]">
      <CardHeader className="pb-2 p-4 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-[hsl(var(--color-text-primary))]">
          Contas
        </CardTitle>
        {updatedLabel && (
          <span
            className="text-[10px] text-[hsl(var(--color-text-tertiary))]"
          >
            Atualizado {updatedLabel}
          </span>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="flex items-center gap-3 rounded-lg border border-[hsl(var(--color-border-subtle))] p-3"
          >
            <ConnectorLogo
              imageUrl={acc.connector_image_url}
              primaryColor={acc.connector_color}
              connectorName={acc.connector_name}
              size="sm"
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[hsl(var(--color-text-primary))] truncate">
                {acc.connector_name}
              </p>
              <p className="text-xs text-[hsl(var(--color-text-tertiary))]">
                {getAccountTypeLabel(acc.subtype)}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {acc.is_stale === true && acc.balance_age_minutes != null && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex text-amber-600 dark:text-amber-500 cursor-default"
                      aria-label={staleBalanceHint(acc.balance_age_minutes)}
                    >
                      <Clock className="h-3 w-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {staleBalanceHint(acc.balance_age_minutes)}
                  </TooltipContent>
                </Tooltip>
              )}
              <button
                type="button"
                onClick={() => void refreshAccountBalance(acc.id)}
                disabled={refreshingAccountId === acc.id}
                className={cn(
                  'p-1 rounded-md text-muted-foreground hover:text-primary transition-colors',
                  'disabled:opacity-50 disabled:pointer-events-none'
                )}
                aria-label="Atualizar saldo desta conta"
              >
                {refreshingAccountId === acc.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </button>
              <p
                className="text-sm font-semibold tabular-nums"
                style={{ color: 'hsl(var(--color-text-primary))', fontFamily: 'var(--font-numeric)', letterSpacing: '-0.01em' }}
              >
                {formatCurrency(acc.balance ?? 0, isHidden)}
              </p>
              <BalanceLiveStatusBadge live={isRealtimeBalanceFresh(acc)} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
