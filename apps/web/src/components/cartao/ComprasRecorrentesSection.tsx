import React, { useState, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { useRecorrentesCartao } from '@/hooks/useRecorrentesCartao';
import { RecurringCardWithCard } from './RecurringCardWithCard';

const STORAGE_KEY = 'rxfin_compras_recorrentes_cartao_collapsed';

function SkeletonCard() {
  return (
    <Card className="bg-[hsl(var(--color-surface-raised))] border-[hsl(var(--color-border-default))]">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

export interface ComprasRecorrentesSectionProps {
  defaultOpen?: boolean;
}

export const ComprasRecorrentesSection: React.FC<ComprasRecorrentesSectionProps> = ({
  defaultOpen = true,
}) => {
  const { data, isLoading, error } = useRecorrentesCartao();
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setOpen(JSON.parse(stored));
    } catch {}
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const compras = data?.compras_recorrentes ?? [];
  const totalRecorrentes = data?.summary?.total_recorrentes ?? 0;
  const totalMensalEstimado = data?.summary?.total_mensal_estimado ?? 0;
  const hasData = compras.length > 0;

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center justify-between rounded-lg border border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] px-4 py-3 text-left transition-colors hover:bg-muted/50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {open ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="font-semibold">Compras Recorrentes</span>
            <Badge variant="secondary" className="text-xs">
              {totalRecorrentes} {totalRecorrentes === 1 ? 'ativa' : 'ativas'}
            </Badge>
            {hasData && (
              <span className="text-xs text-muted-foreground">
                R$ {formatCurrency(totalMensalEstimado)}/mês estimado
              </span>
            )}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="overflow-hidden transition-all duration-200 ease-out">
          <div className="rounded-b-lg border border-t-0 border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] p-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">
                Não foi possível carregar as compras recorrentes.
              </p>
            ) : !hasData ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma compra recorrente detectada ainda.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {compras.map((item) => (
                  <RecurringCardWithCard
                    key={item.id}
                    item={item}
                    cardName={item.card_name}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
