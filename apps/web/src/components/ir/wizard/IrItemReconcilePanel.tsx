import React, { useState, useEffect, useCallback } from 'react';
import { Link2, Plus, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { irCodeToAssetType } from '@/lib/ir-groups';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { IrSuggestion, WizardItemState, ReconcileAction } from './types';

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

type PanelMode = 'choose' | 'link' | 'create' | 'ignore';

export interface IrItemReconcilePanelProps {
  suggestion: IrSuggestion;
  currentState?: WizardItemState;
  anoCalendario?: number;
  onSave: (state: WizardItemState) => void;
  onClose: () => void;
}

interface AssetOption {
  id: string;
  name: string;
  value: number;
  isUserAsset: boolean;
}

export function IrItemReconcilePanel({
  suggestion,
  currentState,
  anoCalendario,
  onSave,
  onClose,
}: IrItemReconcilePanelProps) {
  const [mode, setMode] = useState<PanelMode>('choose');
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(
    currentState?.userAssetId ?? currentState?.assetId ?? suggestion.suggested_ua_id ?? suggestion.suggested_asset_id ?? null
  );
  const [createName, setCreateName] = useState(suggestion.ir_descricao ?? '');
  const [createRealValue, setCreateRealValue] = useState<number>(suggestion.ir_situacao_atual ?? 0);
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const { user } = useAuth();

  const assetType = irCodeToAssetType(suggestion.ir_item_code);

  const loadOptions = useCallback(async () => {
    if (!user?.id) return;
    setOptionsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('user_assets')
        .select('id, name, value, type')
        .eq('user_id', user.id)
        .eq('type', assetType);

      if (error) throw error;
      const list: AssetOption[] = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name ?? 'Sem nome',
        value: Number(r.value) ?? 0,
        isUserAsset: true,
      }));
      setAssetOptions(list);
      if (suggestion.confidence === 'high') {
        const suggestedId = suggestion.suggested_ua_id ?? suggestion.suggested_asset_id;
        if (suggestedId && list.some((o) => o.id === suggestedId)) {
          setSelectedLinkId(suggestedId);
        }
      }
    } finally {
      setOptionsLoading(false);
    }
  }, [user?.id, assetType, suggestion.confidence, suggestion.suggested_ua_id, suggestion.suggested_asset_id]);

  useEffect(() => {
    if (mode === 'link') loadOptions();
  }, [mode, loadOptions]);

  const handleSave = useCallback(
    (action: ReconcileAction, payload?: Partial<WizardItemState>) => {
      const state: WizardItemState = {
        index: suggestion.ir_item_index,
        action,
        ...payload,
      };
      onSave(state);
      onClose();
    },
    [suggestion.ir_item_index, onSave, onClose]
  );

  const handleLinkConfirm = () => {
    if (selectedLinkId) {
      handleSave('linked', {
        userAssetId: selectedLinkId,
      });
    }
  };

  const handleCreateConfirm = () => {
    handleSave('created', {
      newAssetName: createName.trim() || suggestion.ir_descricao ?? undefined,
      realValue: createRealValue,
    });
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
      {mode === 'choose' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => setMode('link')}
            >
              <Link2 className="h-5 w-5" />
              <span className="font-medium">Vincular</span>
              <span className="text-xs text-muted-foreground">A um bem já cadastrado</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => setMode('create')}
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Criar</span>
              <span className="text-xs text-muted-foreground">Novo bem no patrimônio</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => setMode('ignore')}
            >
              <EyeOff className="h-5 w-5" />
              <span className="font-medium">Ignorar</span>
              <span className="text-xs text-muted-foreground">Não vincular este item</span>
            </Button>
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </>
      )}

      {mode === 'link' && (
        <>
          <div className="space-y-2">
            <Label>Selecionar bem</Label>
            {optionsLoading ? (
              <p className="text-sm text-muted-foreground">Carregando bens...</p>
            ) : assetOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum bem deste tipo encontrado.{' '}
                <button
                  type="button"
                  className="text-primary underline underline-offset-2"
                  onClick={() => setMode('create')}
                >
                  Criar novo bem
                </button>
              </p>
            ) : (
              <Select
                value={selectedLinkId ?? ''}
                onValueChange={(v) => setSelectedLinkId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um bem" />
                </SelectTrigger>
                <SelectContent>
                  {assetOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name} — {formatBRL(opt.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => setMode('choose')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleLinkConfirm} disabled={!selectedLinkId || assetOptions.length === 0}>
                Vincular
              </Button>
            </div>
          </div>
        </>
      )}

      {mode === 'create' && (
        <>
          <div className="space-y-3">
            <div>
              <Label htmlFor="create-name">Nome do bem</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ex.: Apartamento Centro"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Valor declarado (IR)</Label>
              <Input
                readOnly
                value={formatBRL(suggestion.ir_situacao_atual ?? 0)}
                className="mt-1 bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="create-real">Valor real (mercado)</Label>
              <Input
                id="create-real"
                type="number"
                min={0}
                step={0.01}
                value={createRealValue || ''}
                onChange={(e) => setCreateRealValue(Number(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O valor declarado é o informado na Receita Federal. O valor real é o de mercado atual — só você vê essa diferença.
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => setMode('choose')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCreateConfirm}>
                Criar bem
              </Button>
            </div>
          </div>
        </>
      )}

      {mode === 'ignore' && (
        <>
          <p className="text-sm text-muted-foreground">
            Ignorar significa que este item do IR não será vinculado a nenhum bem no seu patrimônio. Você poderá reconciliar depois se quiser.
          </p>
          <div className="flex items-center justify-between pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => setMode('choose')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleSave('ignored')}>
                Confirmar
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
