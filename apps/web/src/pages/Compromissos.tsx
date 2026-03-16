import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCompromissos } from '@/hooks/useCompromissos';
import { RecurringSummaryHeader } from '@/components/compromissos/RecurringSummaryHeader';
import { RecurringCard } from '@/components/compromissos/RecurringCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CalendarClock, RefreshCw } from 'lucide-react';
import { invokePluggySync } from '@/lib/pluggySync';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

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

export default function Compromissos() {
  const { data, isLoading, error, refetch } = useCompromissos();
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { error: err } = await invokePluggySync({ action: 'sync-recurring-payments' });
      if (err) throw new Error(err.message);
      await queryClient.invalidateQueries({ queryKey: ['compromissos'] });
      await refetch();
    } catch (e) {
      console.error('[Compromissos] Sync error:', e);
    } finally {
      setSyncing(false);
    }
  };

  const hasData = data && (data.incomes?.length > 0 || data.expenses?.length > 0);
  const hasSyncedBefore = data?.monthly_summary?.last_synced_at != null;
  const emptyNoSync = !hasData && !hasSyncedBefore && !isLoading && !error;
  const emptyAfterSync = !hasData && hasSyncedBefore && !isLoading && !error;

  return (
    <AppLayout
      title="Compromissos Fixos"
      description="Receitas e despesas recorrentes detectadas automaticamente."
      icon={<CalendarClock className="h-6 w-6" />}
    >
      <div className="space-y-8">
        {isLoading && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[72px] rounded-lg" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </>
        )}

        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <p className="text-sm text-destructive">
                Não foi possível carregar os compromissos. Tente novamente.
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                Tentar de novo
              </Button>
            </CardContent>
          </Card>
        )}

        {emptyNoSync && !isLoading && (
          <Card className="bg-[hsl(var(--color-surface-raised))] border-[hsl(var(--color-border-default))]">
            <CardContent className="p-8 text-center">
              <CalendarClock className="h-12 w-12 mx-auto text-[hsl(var(--color-text-muted))] mb-4" />
              <h2 className="font-semibold text-lg text-[hsl(var(--color-text-primary))] mb-2">
                Sincronize suas contas
              </h2>
              <p className="text-sm text-[hsl(var(--color-text-muted))] mb-6 max-w-md mx-auto">
                Sincronize suas contas para detectar compromissos recorrentes automaticamente.
              </p>
              <Button onClick={handleSync} disabled={syncing}>
                <RefreshCw className={cn('h-4 w-4 mr-2', syncing && 'animate-spin')} />
                {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
              </Button>
            </CardContent>
          </Card>
        )}

        {emptyAfterSync && !isLoading && (
          <Card className="bg-[hsl(var(--color-surface-raised))] border-[hsl(var(--color-border-default))]">
            <CardContent className="p-8 text-center">
              <CalendarClock className="h-12 w-12 mx-auto text-[hsl(var(--color-text-muted))] mb-4" />
              <p className="text-sm text-[hsl(var(--color-text-muted))]">
                Nenhum compromisso recorrente detectado ainda. A sincronização ocorre semanalmente.
              </p>
            </CardContent>
          </Card>
        )}

        {data && (hasData || hasSyncedBefore) && !isLoading && (
          <>
            <RecurringSummaryHeader summary={data.monthly_summary} />

            {data.incomes && data.incomes.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-[hsl(var(--color-text-primary))] mb-4">
                  Receitas Recorrentes
                </h2>
                <div
                  className={cn(
                    'grid gap-4',
                    isMobile ? 'grid-cols-1' : 'grid-cols-2'
                  )}
                >
                  {data.incomes.map((item) => (
                    <RecurringCard key={item.id} item={item} type="income" />
                  ))}
                </div>
              </section>
            )}

            {data.expenses && data.expenses.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-[hsl(var(--color-text-primary))] mb-4">
                  Despesas Recorrentes
                </h2>
                <div
                  className={cn(
                    'grid gap-4',
                    isMobile ? 'grid-cols-1' : 'grid-cols-2'
                  )}
                >
                  {data.expenses.map((item) => (
                    <RecurringCard key={item.id} item={item} type="expense" />
                  ))}
                </div>
              </section>
            )}

            {hasSyncedBefore && !hasData && (
              <p className="text-sm text-[hsl(var(--color-text-muted))] text-center py-4">
                Nenhum compromisso recorrente detectado ainda. A sincronização ocorre semanalmente.
              </p>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
