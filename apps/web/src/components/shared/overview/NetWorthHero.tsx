import React from 'react';
import { cn } from '@/lib/utils';

export interface NetWorthHeroProps {
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
  /** Variação % aproximada (ex.: últimos snapshots de investimentos). */
  monthlyDeltaPct?: number | null;
  isLoading?: boolean;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const NetWorthHero: React.FC<NetWorthHeroProps> = ({
  netWorth,
  totalAssets,
  totalDebt,
  monthlyDeltaPct,
  isLoading,
}) => {
  const sum = totalAssets + totalDebt;
  const assetPct = sum > 0 ? (totalAssets / sum) * 100 : 100;
  const debtPct = sum > 0 ? (totalDebt / sum) * 100 : 0;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card text-card-foreground p-4 space-y-3">
        <div className="animate-pulse bg-muted rounded-md h-4 w-32" />
        <div className="animate-pulse bg-muted rounded-md h-9 w-48" />
        <div className="animate-pulse bg-muted rounded-md h-1 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground p-4 space-y-3">
      <p className="text-sm text-muted-foreground">Patrimônio líquido</p>
      <p className="text-3xl font-semibold text-foreground tabular-nums">{formatBRL(netWorth)}</p>
      {monthlyDeltaPct != null && Number.isFinite(monthlyDeltaPct) && (
        <p
          className={cn(
            'text-xs font-medium tabular-nums',
            monthlyDeltaPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
          )}
        >
          {monthlyDeltaPct >= 0 ? '+' : ''}
          {monthlyDeltaPct.toFixed(1)}% no período (investimentos)
        </p>
      )}
      <div className="space-y-1">
        <div className="flex h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${assetPct}%` }}
            title="Ativos"
          />
          <div
            className="h-full bg-destructive transition-all duration-300"
            style={{ width: `${debtPct}%` }}
            title="Dívidas"
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Ativos {formatBRL(totalAssets)}</span>
          <span>Dívidas {formatBRL(totalDebt)}</span>
        </div>
      </div>
    </div>
  );
};
