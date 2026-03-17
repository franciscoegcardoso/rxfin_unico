import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/utils';
import { formatRegularity } from '@/utils/formatRecurring';
import type { CompromissoItem } from '@/hooks/useCompromissos';
import { cn } from '@/lib/utils';

export interface RecurringCardProps {
  item: CompromissoItem;
  /** 'income' = badge "✓ Recebido" / "Aguardando"; 'expense' = "✓ Pago" / "A pagar" */
  type: 'income' | 'expense';
  className?: string;
}

function getInitial(description: string): string {
  const trimmed = (description || '').trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

export const RecurringCard: React.FC<RecurringCardProps> = ({ item, type, className }) => {
  const { label, color } = formatRegularity(item.regularity_pct ?? 0);
  const progressIndicatorClass =
    color === 'green'
      ? '[&>div]:bg-green-500'
      : color === 'amber'
        ? '[&>div]:bg-amber-500'
        : '[&>div]:bg-[hsl(var(--color-border-default))]';

  const seenLabel = type === 'income' ? '✓ Recebido' : '✓ Pago';
  const pendingLabel = type === 'income' ? 'Aguardando' : 'A pagar';
  const badgeVariant = item.seen_this_month ? 'success' : type === 'income' ? 'secondary' : 'warning';

  return (
    <TooltipProvider>
      <Card
        className={cn(
          'bg-[hsl(var(--color-surface-raised))] border-[hsl(var(--color-border-default))]',
          className
        )}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 rounded-full border border-[hsl(var(--color-border-subtle))]">
              <AvatarImage src={item.connector_image_url ?? undefined} alt="" />
              <AvatarFallback className="text-sm font-medium bg-[hsl(var(--color-surface-sunken))] text-[hsl(var(--color-text-primary))]">
                {getInitial(item.description)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[hsl(var(--color-text-primary))] truncate capitalize">
                {(item.description || '').trim() || 'Sem nome'}
              </p>
              <p className="text-sm tabular-nums text-[hsl(var(--color-text-tertiary))]">
                {formatCurrency(item.average_amount)} / mês
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[hsl(var(--color-text-tertiary))] cursor-default">
                    {label}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Detectado em {item.occurrence_count} ocorrências</p>
                </TooltipContent>
              </Tooltip>
              <span className="tabular-nums text-[hsl(var(--color-text-tertiary))]">
                {Math.round(item.regularity_pct ?? 0)}%
              </span>
            </div>
            <Progress
              value={item.regularity_pct ?? 0}
              className={cn(
                'h-1.5 overflow-hidden rounded-full [&>div]:transition-all',
                progressIndicatorClass
              )}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={badgeVariant}
              className="text-xs"
            >
              {item.seen_this_month ? seenLabel : pendingLabel}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
