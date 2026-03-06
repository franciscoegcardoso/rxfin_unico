import React, { useState, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Conta } from '@/hooks/useContasPagarReceber';
import { ArrowUpCircle, ArrowDownCircle, ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { parseISO, isBefore, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

const STORAGE_KEY_PREFIX = 'rxfin_recorrentes_collapsed_';

function getTipoCobrancaLabel(tipo?: string): string {
  const t = (tipo || '').toLowerCase();
  if (t === 'parcelada') return 'Parcelado';
  if (t === 'recorrente') return 'Recorrente';
  if (t === 'mensal') return 'Mensal';
  if (t === 'semanal') return 'Semanal';
  if (t === 'anual') return 'Anual';
  return tipo || '—';
}

function getStatusBadge(conta: Conta): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  const now = new Date();
  const vencimento = conta.dataVencimento ? parseISO(conta.dataVencimento) : null;
  if (conta.dataPagamento) {
    const pagamento = parseISO(conta.dataPagamento);
    const mesPagamento = startOfMonth(pagamento);
    const mesAtual = startOfMonth(now);
    if (mesPagamento.getTime() === mesAtual.getTime() || isBefore(mesAtual, mesPagamento)) {
      return { label: 'Em dia', variant: 'default' };
    }
  }
  if (vencimento && isBefore(vencimento, now)) {
    return { label: 'Pendente', variant: 'outline' };
  }
  return { label: 'Em dia', variant: 'default' };
}

interface RecorrentesSectionProps {
  recorrrentes: Conta[];
  userId: string | undefined;
  onOpenNewRecorrente: () => void;
  onEditRecorrente: (conta: Conta) => void;
  onDeleteRecorrente: (id: string) => Promise<boolean>;
  loading?: boolean;
}

export const RecorrentesSection: React.FC<RecorrentesSectionProps> = ({
  recorrrentes,
  userId,
  onOpenNewRecorrente,
  onEditRecorrente,
  onDeleteRecorrente,
  loading,
}) => {
  const storageKey = userId ? `${STORAGE_KEY_PREFIX}${userId}` : null;
  const [open, setOpen] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = localStorage.getItem(storageKey);
      setOpen(stored === null ? true : JSON.parse(stored));
    } catch {
      setOpen(true);
    }
  }, [storageKey]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    const ok = await onDeleteRecorrente(deleteId);
    setDeleteId(null);
  };

  const count = recorrrentes.length;

  return (
    <>
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'flex w-full items-center justify-between rounded-lg border border-border/80 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50',
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
              <Badge variant="secondary" className="text-xs">
                {count} {count === 1 ? 'ativo' : 'ativos'}
              </Badge>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="overflow-hidden transition-all duration-200 ease-out">
            <div className="rounded-b-lg border border-t-0 border-border/80 bg-muted/20 p-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : recorrrentes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum compromisso recorrente.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recorrrentes.map((conta) => {
                    const isPagar = conta.tipo === 'pagar';
                    const status = getStatusBadge(conta);
                    return (
                      <Card
                        key={conta.id}
                        className="rounded-[14px] border border-border/80 overflow-hidden transition-colors hover:bg-muted/30"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                                isPagar ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'
                              )}
                            >
                              {isPagar ? (
                                <ArrowDownCircle className="h-5 w-5" />
                              ) : (
                                <ArrowUpCircle className="h-5 w-5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{conta.nome}</p>
                              <p className="text-xs text-muted-foreground">{conta.categoria}</p>
                              <p className={cn('text-sm font-semibold mt-1', isPagar ? 'text-destructive' : 'text-emerald-600')}>
                                {formatCurrency(conta.valor)}
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {conta.diaRecorrencia != null && (
                                  <Badge variant="secondary" className="text-xs">
                                    Todo dia {conta.diaRecorrencia}
                                  </Badge>
                                )}
                                {conta.tipoCobranca && (
                                  <Badge variant="outline" className="text-xs">
                                    {getTipoCobrancaLabel(conta.tipoCobranca)}
                                  </Badge>
                                )}
                                {conta.totalParcelas != null && conta.parcelaAtual != null && (
                                  <Badge variant="outline" className="text-xs">
                                    Parcela {conta.parcelaAtual}/{conta.totalParcelas}
                                  </Badge>
                                )}
                                <Badge
                                  variant={status.variant === 'default' ? 'default' : 'secondary'}
                                  className={cn(
                                    'text-xs',
                                    status.label === 'Em dia' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                                    status.label === 'Pendente' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                  )}
                                >
                                  {status.label}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 min-h-[44px] min-w-[44px]"
                                onClick={() => onEditRecorrente(conta)}
                                aria-label="Editar recorrente"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive min-h-[44px] min-w-[44px]"
                                onClick={() => setDeleteId(conta.id)}
                                aria-label="Excluir recorrente"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full gap-1.5"
                onClick={onOpenNewRecorrente}
              >
                <Plus className="h-4 w-4" />
                Nova recorrente
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir compromisso recorrente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O compromisso será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleConfirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
