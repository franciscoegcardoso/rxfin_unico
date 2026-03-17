import React, { useState, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecorrentesExtrato } from '@/hooks/useRecorrentesExtrato';
import { RecurringCard } from '@/components/compromissos/RecurringCard';
import type { CompromissoItem } from '@/hooks/useCompromissos';
import type { RecorrenteItem } from '@/hooks/useRecorrentesExtrato';

const STORAGE_KEY = 'rxfin_compromissos_recorrentes_extrato_collapsed';

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
        </div>
      </CardContent>
    </Card>
  );
}

export interface CompromissosRecorrentesSectionProps {
  defaultOpen?: boolean;
}

export const CompromissosRecorrentesSection: React.FC<CompromissosRecorrentesSectionProps> = ({
  defaultOpen = true,
}) => {
  const { data, isLoading, error } = useRecorrentesExtrato();
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

  const totalCompromissos = data?.summary?.total_compromissos ?? 0;
  const totalReceitas = data?.summary?.total_receitas ?? 0;
  const totalAtivos = totalCompromissos + totalReceitas;
  const compromissos = data?.compromissos ?? [];
  const receitas = data?.receitas ?? [];
  const hasData = compromissos.length > 0 || receitas.length > 0;

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center justify-between rounded-lg border border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] px-4 py-3 text-left transition-colors hover:bg-muted/50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-semibold">Compromissos Recorrentes</span>
            <Badge
              variant="secondary"
              className={cn(
                'text-xs',
                totalAtivos > 0 && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
              )}
            >
              {totalAtivos} {totalAtivos === 1 ? 'ativo' : 'ativos'}
            </Badge>
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
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">
                Não foi possível carregar os compromissos recorrentes.
              </p>
            ) : !hasData ? (
              <p className="text-sm text-muted-foreground">
                Nenhum compromisso recorrente detectado ainda.
              </p>
            ) : (
              <>
                {compromissos.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Compromissos recorrentes
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {compromissos.map((item: RecorrenteItem) => (
                        <RecurringCard
                          key={item.id}
                          item={item as unknown as CompromissoItem}
                          type="expense"
                        />
                      ))}
                    </div>
                  </div>
                )}
                {receitas.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Receitas recorrentes
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {receitas.map((item: RecorrenteItem) => (
                        <RecurringCard
                          key={item.id}
                          item={item as unknown as CompromissoItem}
                          type="income"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full gap-1.5"
              disabled
            >
              <Plus className="h-4 w-4" />
              Nova recorrente
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
