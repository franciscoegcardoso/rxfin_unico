import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Repeat, CheckCircle2, Sparkles, Loader2, Search } from 'lucide-react';
import { CreditCardTransaction } from '@/hooks/useCreditCardTransactions';
import {
  useRecorrentesCartao,
  confirmRecorrenteCartao,
  ignorarRecorrenteCartao,
  RECORRENTES_CARTAO_QUERY_KEY,
  type RecorrenteCartaoItem,
} from '@/hooks/useRecorrentesCartao';
import { useRecorrentesCartaoHistorico } from '@/hooks/useRecorrentesCartaoHistorico';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useVisibility } from '@/contexts/VisibilityContext';
import { RecurringCartaoMetricCard } from './RecurringCartaoMetricCard';
import { Skeleton } from '@/components/ui/skeleton';

interface RecurringPurchasesSectionProps {
  transactions: CreditCardTransaction[];
  onToggleRecurring: (id: string, isRecurring: boolean, confidenceLevel?: string) => Promise<boolean>;
  onDetectRecurring: () => Promise<unknown>;
  detecting: boolean;
}

export function RecurringPurchasesSection({
  onDetectRecurring,
  detecting,
}: RecurringPurchasesSectionProps) {
  const queryClient = useQueryClient();
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const { isHidden } = useVisibility();

  const { data: recorrentesData, isLoading: loadingRecorrentes } = useRecorrentesCartao();
  const { data: historicoData } = useRecorrentesCartaoHistorico();

  const formatCurrencyFn = useCallback(
    (value: number) => {
      if (isHidden) return '••••••';
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
      }).format(value);
    },
    [isHidden]
  );

  const compras = recorrentesData?.compras_recorrentes ?? [];
  const historico = historicoData?.historico ?? [];

  const summary = useMemo(() => {
    let total_confirmadas = 0;
    let total_sugestoes = 0;
    let total_mensal_confirmado = 0;
    for (const item of compras) {
      if (item.confirmed_by_user === true) {
        total_confirmadas += 1;
        total_mensal_confirmado += item.average_amount ?? 0;
      } else {
        total_sugestoes += 1;
      }
    }
    return { total_confirmadas, total_sugestoes, total_mensal_confirmado };
  }, [compras]);

  const { confirmed, suggestions } = useMemo(() => {
    const confirmedList: RecorrenteCartaoItem[] = [];
    const suggestionsList: RecorrenteCartaoItem[] = [];
    for (const item of compras) {
      if (item.confirmed_by_user === true) {
        confirmedList.push(item);
      } else {
        suggestionsList.push(item);
      }
    }
    confirmedList.sort((a, b) => (b.average_amount ?? 0) - (a.average_amount ?? 0));
    suggestionsList.sort((a, b) => (b.average_amount ?? 0) - (a.average_amount ?? 0));
    return { confirmed: confirmedList, suggestions: suggestionsList };
  }, [compras]);

  const getMonthsForItem = useCallback(
    (recurringId: string) => historico.find((h) => h.recurring_id === recurringId)?.months ?? null,
    [historico]
  );

  const handleDetect = useCallback(async () => {
    await onDetectRecurring();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: RECORRENTES_CARTAO_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['recorrentes-cartao-historico'] }),
    ]);
  }, [onDetectRecurring, queryClient]);

  const handleConfirm = useCallback(
    async (id: string) => {
      setUpdatingIds((prev) => new Set(prev).add(id));
      try {
        await confirmRecorrenteCartao(id);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: RECORRENTES_CARTAO_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: ['recorrentes-cartao-historico'] }),
        ]);
        toast.success('Marcado como recorrente');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao confirmar');
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [queryClient]
  );

  const handleIgnore = useCallback(
    async (id: string) => {
      setUpdatingIds((prev) => new Set(prev).add(id));
      try {
        await ignorarRecorrenteCartao(id);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: RECORRENTES_CARTAO_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: ['recorrentes-cartao-historico'] }),
        ]);
        toast.success('Sugestão ignorada');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao ignorar');
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [queryClient]
  );

  if (loadingRecorrentes) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (compras.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Repeat className="h-10 w-10 mx-auto mb-4 opacity-30" strokeWidth={1.5} />
        <p className="font-medium text-sm">Nenhuma compra recorrente identificada</p>
        <p className="text-xs mt-1 text-muted-foreground/70">
          Clique em &quot;Detectar&quot; para analisar suas transações
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs mt-4"
          onClick={handleDetect}
          disabled={detecting}
        >
          {detecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Detectar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleDetect}
          disabled={detecting}
        >
          {detecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Detectar
        </Button>
      </div>

      {/* Header: 3 mini-cards — CONFIRMADAS | SUGESTÕES | TOTAL MENSAL */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] p-4">
          <p className="text-xs uppercase text-muted-foreground font-medium tracking-wider">Confirmadas</p>
          <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">{summary.total_confirmadas}</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] p-4">
          <p className="text-xs uppercase text-muted-foreground font-medium tracking-wider">Sugestões</p>
          <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">{summary.total_sugestoes}</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] p-4">
          <p className="text-xs uppercase text-muted-foreground font-medium tracking-wider">Total mensal</p>
          <p className="text-lg font-bold text-foreground tabular-nums mt-0.5 truncate">
            {formatCurrencyFn(summary.total_mensal_confirmado)}
          </p>
        </div>
      </div>

      {/* Confirmadas — 1 card por grupo de recorrência */}
      {confirmed.length > 0 && (
        <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Recorrências Confirmadas</CardTitle>
                <CardDescription className="text-xs">Assinaturas que você confirmou</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6">
            <ScrollArea className="h-[280px]">
              <div className="space-y-3">
                {confirmed.map((item) => (
                  <RecurringCartaoMetricCard
                    key={item.id}
                    item={item}
                    months={getMonthsForItem(item.id)}
                    isConfirmed
                    isUpdating={updatingIds.has(item.id)}
                    onDismiss={handleIgnore}
                    formatCurrencyFn={formatCurrencyFn}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Sugestões de Recorrência */}
      {suggestions.length > 0 && (
        <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Sugestões de Recorrência</CardTitle>
                <CardDescription className="text-xs">Analise cada sugestão com base no nível de confiança</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {suggestions.map((item) => (
                  <RecurringCartaoMetricCard
                    key={item.id}
                    item={item}
                    months={getMonthsForItem(item.id)}
                    isConfirmed={false}
                    isUpdating={updatingIds.has(item.id)}
                    onConfirm={handleConfirm}
                    onDismiss={handleIgnore}
                    formatCurrencyFn={formatCurrencyFn}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
