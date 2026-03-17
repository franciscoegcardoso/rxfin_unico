import React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';
import { ConnectorLogo } from '@/components/openfinance/ConnectorLogo';
import { formatRecorrenteConfidenceBadge } from '@/utils/formatRecurring';
import type { RecorrenteCartaoItem } from '@/hooks/useRecorrentesCartao';
import type { MonthEntry } from '@/hooks/useRecorrentesCartaoHistorico';
import { cn } from '@/lib/utils';

export interface RecurringCartaoMetricCardProps {
  item: RecorrenteCartaoItem;
  /** Last 13 months, most recent first. amount !== null => dot filled. */
  months?: MonthEntry[] | null;
  isConfirmed?: boolean;
  isUpdating?: boolean;
  onConfirm?: (id: string) => void;
  onDismiss?: (id: string) => void;
  formatCurrencyFn?: (value: number) => string;
  className?: string;
}

function monthLabel(ym: string): string {
  try {
    return format(parseISO(ym + '-01'), 'MMM', { locale: ptBR });
  } catch {
    return ym;
  }
}

export function RecurringCartaoMetricCard({
  item,
  months = null,
  isConfirmed,
  isUpdating,
  onConfirm,
  onDismiss,
  formatCurrencyFn = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v),
  className,
}: RecurringCartaoMetricCardProps) {
  const badge = formatRecorrenteConfidenceBadge(item.regularity_pct ?? 0);
  const totalAno = (item.average_amount ?? 0) * 12;
  const description = (item.description || '').trim() || 'Sem nome';
  const displayName = description.charAt(0).toUpperCase() + description.slice(1).toLowerCase();

  return (
    <Card
      className={cn(
        'bg-[hsl(var(--color-surface-raised))] border-[hsl(var(--color-border-default))]',
        isConfirmed && 'border-emerald-200/60 dark:border-emerald-800/40',
        className
      )}
    >
      <CardContent className="p-4 space-y-4">
        {/* [logo] NOME [Muito Alta ↑] [Cartão XP Visa] */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <ConnectorLogo
              imageUrl={item.connector_image_url}
              connectorName={item.connector_name ?? description}
              size="sm"
              className="shrink-0"
            />
            <p className="font-medium text-[hsl(var(--color-text-primary))] truncate text-sm capitalize">
              {displayName}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Badge
              variant="secondary"
              className={cn(
                'text-[10px]',
                badge.color === 'green' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/60',
                badge.color === 'amber' && 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200/60',
                badge.color === 'gray' && 'bg-muted/50 text-muted-foreground border-border/60'
              )}
            >
              {badge.label}
            </Badge>
            {item.card_name && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {item.card_name}
              </Badge>
            )}
          </div>
        </div>

        {/* VALOR MÉDIO | DETECTADO | TOTAL/ANO ESTIMADO */}
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-[hsl(var(--color-surface-sunken))] p-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--color-text-tertiary))]">
              Valor médio
            </p>
            <p className="text-sm font-semibold tabular-nums font-numeric text-[hsl(var(--color-text-primary))]">
              {formatCurrencyFn(item.average_amount ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--color-text-tertiary))]">
              Detectado
            </p>
            <p className="text-sm font-semibold tabular-nums font-numeric text-[hsl(var(--color-text-primary))]">
              {item.occurrence_count ?? 0}x (últimos 13m)
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--color-text-tertiary))]">
              Total/ano estimado
            </p>
            <p className="text-sm font-semibold tabular-nums font-numeric text-[hsl(var(--color-text-primary))]">
              {formatCurrencyFn(totalAno)}
            </p>
          </div>
        </div>

        {/* Heat dots: 13 meses, esquerda = mais recente; ● = amount !== null, ○ = amount === null */}
        {months && months.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-0.5 flex-wrap">
              {months.slice(0, 13).map((m) => {
                const filled = m.amount !== null;
                return (
                  <span
                    key={m.month}
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      filled ? 'bg-emerald-500' : 'bg-muted/40 border border-border/40'
                    )}
                    title={`${monthLabel(m.month)} ${filled ? '• Cobrança detectada' : '• Sem cobrança'}`}
                    aria-hidden
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-0.5 text-[9px] text-[hsl(var(--color-text-tertiary))]">
              {months.slice(0, 13).map((m) => (
                <span key={m.month} className="w-5 text-center truncate">
                  {monthLabel(m.month)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Ações: [✓ Confirmar] [✕ Ignorar] ou só [✕ Remover] se confirmado */}
        <div className="flex justify-end gap-1 pt-1">
          {isConfirmed ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={() => onDismiss?.(item.id)}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <><X className="h-3 w-3 mr-1" /> Remover</>}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1 border-emerald-200/80 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800/60 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                onClick={() => onConfirm?.(item.id)}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3" /> Confirmar</>}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={() => onDismiss?.(item.id)}
                disabled={isUpdating}
              >
                <X className="h-3 w-3" /> Ignorar
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
