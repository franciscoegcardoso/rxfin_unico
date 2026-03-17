import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { MonthlySummary } from '@/hooks/useCompromissos';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface RecurringSummaryHeaderProps {
  summary: MonthlySummary;
  className?: string;
}

function formatLastSync(lastSyncedAt: string | null): string {
  if (!lastSyncedAt) return '—';
  try {
    return formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true, locale: ptBR });
  } catch {
    return '—';
  }
}

export const RecurringSummaryHeader: React.FC<RecurringSummaryHeaderProps> = ({
  summary,
  className,
}) => {
  const totalExp = summary.total_expenses_count || 1;
  const seenExp = summary.expenses_seen_this_month ?? 0;
  const confirmadasLabel = `${seenExp} / ${totalExp}`;

  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4',
        className
      )}
    >
      <Card className="bg-[hsl(var(--color-surface-raised))] border-[hsl(var(--color-border-default))]">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-red-500/10 p-2 text-red-600">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-[hsl(var(--color-text-tertiary))]">
              Despesas Fixas Esperadas
            </p>
            <p className="text-base font-semibold tabular-nums text-[hsl(var(--color-text-primary))]">
              {formatCurrency(summary.expected_expenses ?? 0)} / mês
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[hsl(var(--color-surface-raised))] border-[hsl(var(--color-border-default))]">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-green-500/10 p-2 text-green-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-[hsl(var(--color-text-tertiary))]">
              Receitas Esperadas
            </p>
            <p className="text-base font-semibold tabular-nums text-[hsl(var(--color-text-primary))]">
              {formatCurrency(summary.expected_incomes ?? 0)} / mês
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[hsl(var(--color-surface-raised))] border-[hsl(var(--color-border-default))]">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-[hsl(var(--color-text-tertiary))]">
              Confirmadas este mês
            </p>
            <p className="text-base font-semibold tabular-nums text-[hsl(var(--color-text-primary))]">
              {confirmadasLabel}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[hsl(var(--color-surface-raised))] border-[hsl(var(--color-border-default))]">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-muted p-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-[hsl(var(--color-text-tertiary))]">
              Última sincronização
            </p>
            <p className="text-base font-semibold text-[hsl(var(--color-text-primary))]">
              {formatLastSync(summary.last_synced_at)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
