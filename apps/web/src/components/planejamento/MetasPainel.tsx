import React, { useMemo, useState } from 'react';
import { useMetas, useAddAporteMeta, type MetaComProgresso } from '@/hooks/planejamento/useMetas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn, formatCurrency } from '@/lib/utils';

function riskToStyles(risk: MetaComProgresso['risk_level']) {
  switch (risk) {
    case 'ok':
    case 'concluida':
      return { barClass: 'bg-income', textClass: 'text-income', badgeVariant: 'default' as const, badgeText: risk === 'concluida' ? 'Concluída' : 'No prazo' };
    case 'atencao':
      return { barClass: 'bg-amber-500', textClass: 'text-amber-600', badgeVariant: 'secondary' as const, badgeText: 'Atenção' };
    case 'critica':
    case 'vencida':
      return { barClass: 'bg-expense', textClass: 'text-expense', badgeVariant: 'destructive' as const, badgeText: risk === 'vencida' ? 'Vencida' : 'Crítico' };
    case 'sem_prazo':
      return { barClass: 'bg-muted-foreground/40', textClass: 'text-muted-foreground', badgeVariant: 'secondary' as const, badgeText: 'Sem prazo' };
    default:
      return { barClass: 'bg-muted-foreground/40', textClass: 'text-muted-foreground', badgeVariant: 'secondary' as const, badgeText: '—' };
  }
}

export function MetasPainel({ saldo_disponivel }: { saldo_disponivel: number }) {
  const { data: metas, isLoading, error } = useMetas();
  const addAporte = useAddAporteMeta();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState<MetaComProgresso | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [referenceMonth, setReferenceMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const openAporte = (meta: MetaComProgresso) => {
    setSelectedMeta(meta);
    setAmount('');
    setReferenceMonth(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    setDialogOpen(true);
  };

  const onConfirm = async () => {
    if (!selectedMeta) return;
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    try {
      await addAporte.mutateAsync({
        goalId: selectedMeta.id,
        amount: parsedAmount,
        referenceMonth,
      });
      setDialogOpen(false);
    } catch {
      // erro já será tratado pela lib/console; mantemos UI consistente
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metas do planejamento</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Carregando...</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metas do planejamento</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Não foi possível carregar metas.</CardContent>
      </Card>
    );
  }

  if (!metas || metas.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base">Metas do planejamento</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Saldo disponível usado para sugerir aportes.</p>
            </div>
            <div className={saldo_disponivel >= 0 ? 'text-income' : 'text-expense'} style={{ fontWeight: 600 }}>
              Saldo: {formatCurrency(saldo_disponivel)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {metas.map((meta) => {
            const styles = riskToStyles(meta.risk_level);
            const progressValue = meta.target_amount > 0 ? Math.min(100, Math.max(0, meta.percent_done)) : 0;
            const showSuggested = meta.risk_level !== 'concluida' && meta.required_monthly > 0;

            return (
              <div key={meta.id} className="rounded-xl border border-border/60 bg-card p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs">
                        {meta.icon ? meta.icon.slice(0, 1) : '•'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{meta.name}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <Badge variant={styles.badgeVariant} className="text-xs">{styles.badgeText}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(meta.current_amount)} de {formatCurrency(meta.target_amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {showSuggested && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Aporte sugerido</p>
                      <p className="text-sm font-semibold">{formatCurrency(meta.required_monthly)}/mês</p>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', styles.barClass)}
                      style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{meta.percent_done.toFixed(0)}% concluído</span>
                    {meta.months_remaining !== null ? <span>{meta.months_remaining} mês(es) restantes</span> : <span>—</span>}
                  </div>
                </div>

                {meta.required_monthly > saldo_disponivel * 0.5 && meta.risk_level !== 'concluida' && meta.required_monthly > 0 && (
                  <Alert variant="destructive" className="p-2">
                    <AlertDescription className="text-xs">
                      Aviso: aporte excede 50% do seu saldo.
                    </AlertDescription>
                  </Alert>
                )}

                {meta.risk_level !== 'concluida' && meta.required_monthly > 0 && (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAporte(meta)}
                      disabled={addAporte.isPending}
                      className="h-8"
                    >
                      Registrar aporte
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar aporte</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {selectedMeta && (
              <div>
                <p className="text-sm font-medium">{selectedMeta.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Meta alvo: {formatCurrency(selectedMeta.target_amount)} · Atual: {formatCurrency(selectedMeta.current_amount)}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label>Valor do aporte</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex.: 500"
              />
            </div>

            <div className="space-y-1">
              <Label>Mês de referência</Label>
              <Input value={referenceMonth} onChange={(e) => setReferenceMonth(e.target.value)} placeholder="YYYY-MM" />
            </div>

            {selectedMeta && selectedMeta.required_monthly > saldo_disponivel * 0.5 && (
              <Alert className="p-2">
                <AlertDescription className="text-xs">
                  ⚠ Aporte excede 50% do seu saldo disponível.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={addAporte.isPending}>
                Cancelar
              </Button>
              <Button onClick={onConfirm} disabled={addAporte.isPending}>
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

