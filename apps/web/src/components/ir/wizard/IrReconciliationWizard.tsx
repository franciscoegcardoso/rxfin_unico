import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Car, TrendingUp, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { irCodeToLabel, irCodeToTargetTable } from '@/lib/ir-groups';
import { supabase } from '@/lib/supabase';
import { IrItemReconcilePanel } from './IrItemReconcilePanel';
import type { IrSuggestion, WizardItemState } from './types';

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

function iconForType(irCode: string, suggestedType?: string | null) {
  const t = (suggestedType ?? irCode ?? '').toLowerCase();
  if (t.includes('imovel') || t.includes('property') || t.includes('building')) return Building2;
  if (t.includes('veic') || t.includes('car') || t.includes('vehicle')) return Car;
  if (t.includes('invest') || t.includes('stock') || t.includes('finance')) return TrendingUp;
  return Package;
}

export interface IrReconciliationWizardProps {
  irImportId: string;
  anoCalendario?: number;
  onComplete?: (result: {
    success: boolean;
    created: number;
    linked: number;
    ignored: number;
    total: number;
  }) => void;
}

export function IrReconciliationWizard({
  irImportId,
  anoCalendario,
  onComplete,
}: IrReconciliationWizardProps) {
  const [suggestions, setSuggestions] = useState<IrSuggestion[]>([]);
  const [itemStates, setItemStates] = useState<Record<number, WizardItemState>>({});
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await (supabase as any).rpc('ir_suggest_reconciliation', {
          p_ir_import_id: irImportId,
        });
        if (cancelled) return;
        if (rpcError) throw rpcError;
        const list = (data ?? []) as IrSuggestion[];
        setSuggestions(list);
        const initial: Record<number, WizardItemState> = {};
        list.forEach((s) => {
          initial[s.ir_item_index] = {
            index: s.ir_item_index,
            action: s.already_linked ? 'linked' : 'pending',
            ...(s.already_linked && s.suggested_ua_id
              ? { userAssetId: s.suggested_ua_id }
              : s.already_linked && s.suggested_asset_id
                ? { assetId: s.suggested_asset_id }
                : {}),
          };
        });
        setItemStates(initial);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Erro ao carregar sugestões');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [irImportId]);

  const updateItemState = useCallback((state: WizardItemState) => {
    setItemStates((prev) => ({ ...prev, [state.index]: state }));
  }, []);

  const resolvedCount = Object.values(itemStates).filter((s) => s.action !== 'pending').length;
  const total = suggestions.length;
  const progressPercent = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;
  const pendingCount = total - resolvedCount;

  const handleSavePanel = useCallback(
    (state: WizardItemState) => {
      updateItemState(state);
      setOpenIndex(null);
    },
    [updateItemState]
  );

  const handleConfirm = useCallback(async () => {
    if (resolvedCount === 0 || saving) return;
    setSaving(true);
    try {
      const p_actions = Object.values(itemStates)
        .filter((s) => s.action !== 'pending')
        .map((s) => {
          const base: any = { index: s.index, action: s.action };
          if (s.action === 'linked') {
            if (s.userAssetId) base.user_asset_id = s.userAssetId;
            if (s.assetId) base.asset_id = s.assetId;
          }
          if (s.action === 'created') {
            const code = suggestions.find((x) => x.ir_item_index === s.index)?.ir_item_code;
            base.new_asset = {
              name: s.newAssetName,
              value: s.realValue,
              target_table: code ? irCodeToTargetTable(code) : 'user_assets',
            };
          }
          return base;
        });

      const { data, error: rpcError } = await (supabase as any).rpc('confirm_ir_reconciliation', {
        p_ir_import_id: irImportId,
        p_actions,
      });

      if (rpcError) throw rpcError;
      const created = Object.values(itemStates).filter((s) => s.action === 'created').length;
      const linked = Object.values(itemStates).filter((s) => s.action === 'linked').length;
      const ignored = Object.values(itemStates).filter((s) => s.action === 'ignored').length;
      onComplete?.({
        success: true,
        created,
        linked,
        ignored,
        total,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao confirmar');
    } finally {
      setSaving(false);
    }
  }, [irImportId, itemStates, resolvedCount, saving, suggestions, total, onComplete]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">Erro</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          {resolvedCount} de {total} bens reconciliados
        </p>
        <Progress value={progressPercent} className="h-1.5 mt-1" />
      </div>

      <div className="divide-y divide-border rounded-lg border overflow-hidden">
        {suggestions.map((s) => {
          const state = itemStates[s.ir_item_index];
          const isOpen = openIndex === s.ir_item_index;
          const Icon = iconForType(s.ir_item_code, s.suggested_type);
          const statusLabel =
            state?.action === 'linked'
              ? 'Vinculado'
              : state?.action === 'created'
                ? 'Criado'
                : state?.action === 'ignored'
                  ? 'Ignorado'
                  : 'Pendente';

          return (
            <div key={s.ir_item_index}>
              <button
                type="button"
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setOpenIndex(isOpen ? null : s.ir_item_index)}
              >
                <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.ir_descricao || 'Sem descrição'}</p>
                  <p className="text-xs text-muted-foreground">
                    {irCodeToLabel(s.ir_item_code)} · {formatBRL(s.ir_situacao_atual ?? 0)}
                  </p>
                </div>
                <Badge variant={state?.action === 'pending' ? 'secondary' : 'default'}>
                  {statusLabel}
                </Badge>
                {state?.action === 'pending' && s.suggested_name && (
                  <Badge variant="outline" className="text-xs">
                    Sugestão: {s.suggested_name}
                  </Badge>
                )}
              </button>
              {isOpen && (
                <div className="px-3 pb-3">
                  <IrItemReconcilePanel
                    suggestion={s}
                    currentState={state}
                    anoCalendario={anoCalendario}
                    onSave={handleSavePanel}
                    onClose={() => setOpenIndex(null)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-muted-foreground">{pendingCount} bens pendentes</span>
        <Button
          disabled={resolvedCount === 0 || saving}
          onClick={handleConfirm}
        >
          {saving ? 'Salvando...' : `Confirmar ${resolvedCount} itens`}
        </Button>
      </div>
    </div>
  );
}
