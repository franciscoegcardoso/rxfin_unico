import React from 'react';
import {
  PiggyBank,
  TrendingUp,
  BarChart3,
  Building2,
  Layers,
  ChevronDown,
  ChevronUp,
  Wallet,
  Shield,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

function CategoryIcon({ type, className }: { type: string; className?: string }) {
  const c = className ?? 'w-4 h-4 text-primary';
  const map: Record<string, React.ReactNode> = {
    Ações: <TrendingUp className={c} />,
    FIIs: <Building2 className={c} />,
    ETFs: <Layers className={c} />,
    'Renda Fixa': <PiggyBank className={c} />,
    Fundos: <BarChart3 className={c} />,
    Previdência: <Shield className={c} />,
    Outros: <Wallet className={c} />,
  };
  return <>{map[type] ?? <Wallet className={c} />}</>;
}

function ChevronIcon({ isExpanded, className }: { isExpanded: boolean; className?: string }) {
  return isExpanded ? (
    <ChevronUp className={className ?? 'w-4 h-4 text-muted-foreground'} />
  ) : (
    <ChevronDown className={className ?? 'w-4 h-4 text-muted-foreground'} />
  );
}

const formatPercent = (value: number | null) =>
  value != null ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%` : '—';

export interface InvestmentGroupHeaderProps {
  label: string;
  count: number;
  totalBalance: number;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: string;
  coverageBadge?: string;
  allocationPercent?: number | null;
  avgLast12MonthsRate?: number | null;
}

export function InvestmentGroupHeader({
  label,
  count,
  totalBalance,
  isExpanded,
  onToggle,
  badge,
  coverageBadge,
  allocationPercent,
  avgLast12MonthsRate,
}: InvestmentGroupHeaderProps) {
  return (
    <button
      type="button"
      className={cn(
        'w-full flex items-center gap-3 px-3 py-3 md:px-4 lg:px-6',
        'bg-muted/30 hover:bg-muted/50 transition-colors',
        'border-b border-border'
      )}
      onClick={onToggle}
    >
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <CategoryIcon type={label} />
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          {coverageBadge && (
            <span
              title="Parte dos ativos desta classe retornada pelo Open Finance."
              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-400/40"
            >
              {coverageBadge}
            </span>
          )}
          {badge && (
            <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{count} ativos</span>
      </div>

      <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
        <div className="text-sm font-semibold tabular-nums">{formatCurrency(totalBalance)}</div>
        <div className="flex items-center gap-2 justify-end flex-wrap">
          {allocationPercent != null && (
            <span className="text-[10px] px-1.5 py-0 rounded-md bg-secondary text-secondary-foreground font-medium">
              {allocationPercent.toFixed(1)}%
            </span>
          )}
          {avgLast12MonthsRate != null && (
            <span
              className={cn(
                'text-xs font-medium',
                avgLast12MonthsRate >= 0 ? 'text-income' : 'text-expense'
              )}
            >
              12m: {formatPercent(avgLast12MonthsRate)}
            </span>
          )}
        </div>
        <ChevronIcon isExpanded={isExpanded} className="w-4 h-4 text-muted-foreground mt-0.5" />
      </div>
    </button>
  );
}
