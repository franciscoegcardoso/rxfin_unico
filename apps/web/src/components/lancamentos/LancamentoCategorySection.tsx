import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { LancamentoRealizado } from '@/hooks/useLancamentosRealizados';
import { useUserCategories } from '@/hooks/useUserCategories';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Check,
  Loader2,
  Filter,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  SortAsc,
  SortDesc,
  Wallet,
} from 'lucide-react';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { cn } from '@/lib/utils';

interface LancamentoCategorySectionProps {
  lancamentos: LancamentoRealizado[];
  onCategoryUpdated: () => void;
}

type SortField = 'date' | 'name' | 'value' | 'category';
type SortDirection = 'asc' | 'desc';

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const formatShortDate = (dateStr: string) => {
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
};

const BATCH_SIZE = 50;

interface SuggestionEntry {
  suggestedGroupId: string | null;
  suggestedGroupName: string | null;
  suggestedCategoryId: string;
  suggestedCategory: string;
  confidence: 'high' | 'medium' | 'low';
  isIncome: boolean;
}

function isIncomeLancamento(item: LancamentoRealizado): boolean {
  return item.tipo === 'receita' || (item.valor_realizado ?? item.valor_previsto ?? 0) > 0;
}

export function LancamentoCategorySection({
  lancamentos,
  onCategoryUpdated,
}: LancamentoCategorySectionProps) {
  const { isHidden } = useVisibility();
  const isMobile = useIsMobile();
  const { data: userCats, loading: userCatsLoading } = useUserCategories();

  const [showUnvalidatedOnly, setShowUnvalidatedOnly] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showMobileSortMenu, setShowMobileSortMenu] = useState(false);
  const [suggestionMap, setSuggestionMap] = useState<Record<string, SuggestionEntry>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Record<string, string>>({});
  const [selectedItems, setSelectedItems] = useState<Record<string, string>>({});

  const [selectedLancamento, setSelectedLancamento] = useState<LancamentoRealizado | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const unvalidatedIdsKey = useMemo(
    () => lancamentos.filter((l) => !l.is_category_confirmed).map((l) => l.id).sort().join(','),
    [lancamentos]
  );

  useEffect(() => {
    const unvalidated = lancamentos.filter((l) => !l.is_category_confirmed);
    if (lancamentos.length === 0) return;
    if (userCatsLoading) return;
    if (unvalidated.length === 0) {
      setSuggestionMap({});
      return;
    }
    let cancelled = false;
    setLoadingSuggestions(true);
    (async () => {
      try {
        for (let i = 0; i < unvalidated.length; i += BATCH_SIZE) {
          if (cancelled) return;
          const batch = unvalidated.slice(i, i + BATCH_SIZE);
          const batchPayload = batch.map((l) => ({
            storeName: (l.friendly_name || l.nome || '').trim() || 'Sem descrição',
            value: l.valor_realizado ?? l.valor_previsto ?? 0,
            date: l.data_pagamento || l.data_registro || l.mes_referencia + '-01',
            isAccountTransaction: true as const,
          }));
          const { data, error } = await supabase.functions.invoke('categorize-transactions', {
            body: {
              transactions: batchPayload,
              isAccountTransaction: true,
              expenseGroups: userCats?.expenseGroups ?? [],
              incomeItems: userCats?.incomeItems ?? [],
            },
          });

          if (!error && data?.categorizedTransactions) {
            const newMap: Record<string, SuggestionEntry> = {};
            data.categorizedTransactions.forEach((result: Record<string, unknown>, idx: number) => {
              const lancId = batch[idx]?.id;
              if (lancId) {
                const inc = isIncomeLancamento(batch[idx]);
                newMap[lancId] = {
                  suggestedGroupId: (result?.suggestedGroupId as string) ?? null,
                  suggestedGroupName: (result?.suggestedGroupName as string) ?? null,
                  suggestedCategoryId: String(result?.suggestedCategoryId ?? ''),
                  suggestedCategory: String(result?.suggestedCategory ?? '').trim(),
                  confidence: (result?.confidence as SuggestionEntry['confidence']) ?? 'low',
                  isIncome: typeof result?.isIncome === 'boolean' ? (result.isIncome as boolean) : inc,
                };
              }
            });
            if (!cancelled) setSuggestionMap((prev) => ({ ...prev, ...newMap }));
          }
        }
      } catch (err) {
        console.error('Error fetching category suggestions:', err);
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unvalidatedIdsKey, userCatsLoading]);

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getSortCategoryLabel = (item: LancamentoRealizado) => {
    if (isIncomeLancamento(item)) {
      const id = item.category_id ?? selectedItems[item.id] ?? suggestionMap[item.id]?.suggestedCategoryId;
      const name =
        userCats?.incomeItems.find((i) => i.id === id)?.name ??
        item.categoria ??
        suggestionMap[item.id]?.suggestedCategory ??
        '';
      return name;
    }
    const gid = item.group_category_id ?? selectedGroups[item.id] ?? suggestionMap[item.id]?.suggestedGroupId;
    const group = userCats?.expenseGroups.find((g) => g.category_id === gid);
    const iid = item.category_id ?? selectedItems[item.id] ?? suggestionMap[item.id]?.suggestedCategoryId;
    const itm = group?.items.find((x) => x.id === iid);
    const gname = group?.category_name ?? item.group_category_name ?? '';
    const iname = itm?.name ?? item.categoria ?? '';
    return `${gname} ${iname}`.trim();
  };

  const filteredAndSorted = useMemo(() => {
    let items = [...lancamentos];
    if (showUnvalidatedOnly) {
      items = items.filter((l) => !l.is_category_confirmed);
    }
    items.sort((a, b) => {
      let comparison = 0;
      const dateA = a.data_pagamento || a.data_registro || '';
      const dateB = b.data_pagamento || b.data_registro || '';
      switch (sortField) {
        case 'date':
          comparison = dateA.localeCompare(dateB);
          break;
        case 'name':
          comparison = a.nome.localeCompare(b.nome);
          break;
        case 'value':
          comparison = (a.valor_realizado ?? a.valor_previsto) - (b.valor_realizado ?? b.valor_previsto);
          break;
        case 'category':
          comparison = getSortCategoryLabel(a).localeCompare(getSortCategoryLabel(b));
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return items;
  }, [lancamentos, showUnvalidatedOnly, sortField, sortDirection, userCats, selectedGroups, selectedItems, suggestionMap]);

  const unvalidatedCount = lancamentos.filter((l) => !l.is_category_confirmed).length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  };

  const applyCategory = useCallback(
    async (payload: {
      transaction_id: string;
      group_category_id: string | null;
      group_category_name: string | null;
      category_id: string;
      category_name: string;
    }) => {
      const { error } = await supabase.rpc('apply_batch_categories', { p_items: [payload] });
      if (error) throw error;
    },
    []
  );

  const handleConfirm = useCallback(
    async (item: LancamentoRealizado) => {
      const isIncome = isIncomeLancamento(item);
      const sugg = suggestionMap[item.id];

      if (isIncome) {
        const incomeId = selectedItems[item.id] ?? sugg?.suggestedCategoryId ?? item.category_id ?? '';
        const incomeName = userCats?.incomeItems.find((i) => i.id === incomeId)?.name ?? '';
        if (!incomeId) {
          toast.error('Selecione uma categoria de receita');
          return;
        }
        setUpdatingId(item.id);
        try {
          await applyCategory({
            transaction_id: item.id,
            group_category_id: null,
            group_category_name: null,
            category_id: incomeId,
            category_name: incomeName,
          });
          onCategoryUpdated();
          const label = item.nome.length > 25 ? item.nome.substring(0, 25) + '…' : item.nome;
          toast.success('Categoria confirmada!', {
            action: {
              label: `Sempre aplicar para "${label}"`,
              onClick: async () => {
                try {
                  const { data, error: rpcError } = await supabase.rpc('apply_lancamento_category_rule' as never, {
                    p_nome_pattern: item.nome,
                    p_categoria: incomeName,
                    p_tipo: item.tipo,
                  });
                  if (rpcError) throw rpcError;
                  const updated = (data as { updated?: number })?.updated ?? 0;
                  toast.success(`Regra aplicada! ${updated} lançamento(s) atualizado(s).`);
                  onCategoryUpdated();
                } catch (err) {
                  console.error('Error applying rule:', err);
                  toast.error('Erro ao aplicar regra');
                }
              },
            },
            duration: 8000,
          });
        } catch (err) {
          console.error(err);
          toast.error('Erro ao confirmar categoria');
        } finally {
          setUpdatingId(null);
        }
        return;
      }

      const groupId =
        selectedGroups[item.id] ?? sugg?.suggestedGroupId ?? item.group_category_id ?? '';
      const itemId =
        selectedItems[item.id] ?? sugg?.suggestedCategoryId ?? item.category_id ?? '';
      const group = userCats?.expenseGroups.find((g) => g.category_id === groupId);
      const itm = group?.items.find((i) => i.id === itemId);
      if (!groupId || !itemId) {
        toast.error('Selecione grupo e item de despesa');
        return;
      }
      setUpdatingId(item.id);
      try {
        await applyCategory({
          transaction_id: item.id,
          group_category_id: groupId,
          group_category_name: group?.category_name ?? '',
          category_id: itemId,
          category_name: itm?.name ?? '',
        });
        onCategoryUpdated();
        const label = item.nome.length > 25 ? item.nome.substring(0, 25) + '…' : item.nome;
        toast.success('Categoria confirmada!', {
          action: {
            label: `Sempre aplicar para "${label}"`,
            onClick: async () => {
              try {
                const { data, error: rpcError } = await supabase.rpc('apply_lancamento_category_rule' as never, {
                  p_nome_pattern: item.nome,
                  p_categoria: itm?.name ?? '',
                  p_tipo: item.tipo,
                });
                if (rpcError) throw rpcError;
                const updated = (data as { updated?: number })?.updated ?? 0;
                toast.success(`Regra aplicada! ${updated} lançamento(s) atualizado(s).`);
                onCategoryUpdated();
              } catch (err) {
                console.error('Error applying rule:', err);
                toast.error('Erro ao aplicar regra');
              }
            },
          },
          duration: 8000,
        });
      } catch (err) {
        console.error(err);
        toast.error('Erro ao confirmar categoria');
      } finally {
        setUpdatingId(null);
      }
    },
    [applyCategory, onCategoryUpdated, selectedGroups, selectedItems, suggestionMap, userCats]
  );

  /** Atualização imediata ao mudar categoria em lançamento já confirmado (edição). */
  const handleConfirmedChange = useCallback(
    async (item: LancamentoRealizado, isIncome: boolean, groupId: string | null, itemId: string, itemName: string) => {
      setUpdatingId(item.id);
      try {
        if (isIncome) {
          await applyCategory({
            transaction_id: item.id,
            group_category_id: null,
            group_category_name: null,
            category_id: itemId,
            category_name: itemName,
          });
        } else {
          const group = userCats?.expenseGroups.find((g) => g.category_id === groupId);
          await applyCategory({
            transaction_id: item.id,
            group_category_id: groupId,
            group_category_name: group?.category_name ?? '',
            category_id: itemId,
            category_name: itemName,
          });
        }
        onCategoryUpdated();
      } catch (err) {
        console.error(err);
        toast.error('Erro ao atualizar categoria');
      } finally {
        setUpdatingId(null);
      }
    },
    [applyCategory, onCategoryUpdated, userCats]
  );

  const openEditDialog = (item: LancamentoRealizado) => {
    setSelectedLancamento(item);
    setShowEditDialog(true);
  };

  const getFormaPagamentoLabel = (item: LancamentoRealizado) => {
    if (item.forma_pagamento) return item.forma_pagamento;
    if (item.source_type === 'credit_card') return 'Cartão';
    return '—';
  };

  const getBancoLabel = (item: LancamentoRealizado) => {
    const extended = item as LancamentoRealizado & {
      account_name?: string | null;
      conta_nome?: string | null;
      instituicao?: string | null;
    };
    return extended.account_name ?? extended.conta_nome ?? extended.instituicao ?? getFormaPagamentoLabel(item);
  };

  const mobileCategorySubtitle = (item: LancamentoRealizado) => {
    if (isIncomeLancamento(item)) {
      const id = selectedItems[item.id] ?? item.category_id ?? suggestionMap[item.id]?.suggestedCategoryId;
      return userCats?.incomeItems.find((i) => i.id === id)?.name ?? item.categoria ?? '—';
    }
    const gid = selectedGroups[item.id] ?? item.group_category_id ?? suggestionMap[item.id]?.suggestedGroupId;
    const group = userCats?.expenseGroups.find((g) => g.category_id === gid);
    const iid = selectedItems[item.id] ?? item.category_id ?? suggestionMap[item.id]?.suggestedCategoryId;
    const itm = group?.items.find((x) => x.id === iid);
    const g = group?.category_name ?? item.group_category_name ?? '';
    const n = itm?.name ?? item.categoria ?? '';
    if (g && n) return `${g} › ${n}`;
    return n || g || '—';
  };

  if (userCatsLoading) {
    return <RXFinLoadingSpinner height="py-8" />;
  }

  if (lancamentos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhum lançamento neste período.
      </div>
    );
  }

  const totals = {
    filteredCount: filteredAndSorted.length,
    filteredTotal: filteredAndSorted.reduce((sum, l) => sum + (l.valor_realizado ?? l.valor_previsto ?? 0), 0),
    unvalidatedCount,
  };

  const renderIncomeSelect = (item: LancamentoRealizado, compact: boolean) => {
    const sugg = suggestionMap[item.id];
    const val =
      selectedItems[item.id] ??
      (item.is_category_confirmed ? item.category_id : undefined) ??
      sugg?.suggestedCategoryId ??
      '';
    const loadingRow = loadingSuggestions && !sugg && !item.is_category_confirmed;
    return (
      <Select
        key={`inc-${item.id}-${sugg?.suggestedCategoryId ?? 'empty'}`}
        value={val || undefined}
        onValueChange={(v) => {
          setSelectedItems((prev) => ({ ...prev, [item.id]: v }));
          if (item.is_category_confirmed) {
            const name = userCats?.incomeItems.find((i) => i.id === v)?.name ?? '';
            if (name) handleConfirmedChange(item, true, null, v, name);
          }
        }}
        disabled={updatingId === item.id}
      >
        <SelectTrigger
          className={cn(
            compact ? 'w-full h-9' : 'w-full min-w-[140px] h-6 text-[10px]',
            item.is_category_confirmed
              ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20'
          )}
        >
          {loadingRow ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Sugerindo…
            </span>
          ) : (
            <SelectValue placeholder="Selecionar receita" />
          )}
        </SelectTrigger>
        <SelectContent>
          {(userCats?.incomeItems ?? []).map((inc) => (
            <SelectItem key={inc.id} value={inc.id} className={compact ? '' : 'text-xs'}>
              {inc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const renderExpenseGroupSelect = (item: LancamentoRealizado, compact: boolean) => {
    const sugg = suggestionMap[item.id];
    const val =
      selectedGroups[item.id] ??
      (item.is_category_confirmed ? item.group_category_id : undefined) ??
      sugg?.suggestedGroupId ??
      '';
    const loadingRow = loadingSuggestions && !sugg && !item.is_category_confirmed;
    return (
      <Select
        key={`grp-${item.id}-${sugg?.suggestedGroupId ?? 'empty'}`}
        value={val || undefined}
        onValueChange={(v) => {
          setSelectedGroups((prev) => ({ ...prev, [item.id]: v }));
          setSelectedItems((prev) => {
            const n = { ...prev };
            delete n[item.id];
            return n;
          });
          if (item.is_category_confirmed) {
            const group = userCats?.expenseGroups.find((g) => g.category_id === v);
            const curId = item.category_id ?? '';
            const itm = group?.items.find((i) => i.id === curId);
            if (group && itm) {
              handleConfirmedChange(item, false, v, itm.id, itm.name);
            }
          }
        }}
        disabled={updatingId === item.id}
      >
        <SelectTrigger
          className={cn(
            compact ? 'w-full h-9' : 'w-[130px] h-6 text-[10px]',
            item.is_category_confirmed
              ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20'
          )}
        >
          {loadingRow ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              …
            </span>
          ) : (
            <SelectValue placeholder="Grupo" />
          )}
        </SelectTrigger>
        <SelectContent>
          {(userCats?.expenseGroups ?? []).map((g) => (
            <SelectItem key={g.category_id} value={g.category_id} className={compact ? '' : 'text-xs'}>
              {g.category_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const renderExpenseItemSelect = (item: LancamentoRealizado, compact: boolean) => {
    const sugg = suggestionMap[item.id];
    const groupId =
      selectedGroups[item.id] ??
      (item.is_category_confirmed ? item.group_category_id : undefined) ??
      sugg?.suggestedGroupId ??
      '';
    const group = (userCats?.expenseGroups ?? []).find((g) => g.category_id === groupId);
    const items = group?.items ?? [];
    const val =
      selectedItems[item.id] ??
      (item.is_category_confirmed ? item.category_id : undefined) ??
      sugg?.suggestedCategoryId ??
      '';
    return (
      <Select
        key={`itm-${item.id}-${groupId}-${sugg?.suggestedCategoryId ?? 'empty'}`}
        value={val || undefined}
        onValueChange={(v) => {
          setSelectedItems((prev) => ({ ...prev, [item.id]: v }));
          if (item.is_category_confirmed && group) {
            const itm = group.items.find((i) => i.id === v);
            if (itm) handleConfirmedChange(item, false, groupId, v, itm.name);
          }
        }}
        disabled={items.length === 0 || updatingId === item.id}
      >
        <SelectTrigger
          className={cn(
            compact ? 'w-full h-9' : 'w-[130px] h-6 text-[10px]',
            item.is_category_confirmed
              ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20'
          )}
        >
          <SelectValue placeholder="Item" />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.id} value={i.id} className={compact ? '' : 'text-xs'}>
              {i.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={showUnvalidatedOnly ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-[10px] gap-1"
            onClick={() => setShowUnvalidatedOnly(!showUnvalidatedOnly)}
          >
            <Filter className="h-3 w-3" />
            Não validados
            {unvalidatedCount > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 p-0 text-[9px] flex items-center justify-center ml-0.5">
                {unvalidatedCount}
              </Badge>
            )}
          </Button>

          <Popover open={showMobileSortMenu} onOpenChange={setShowMobileSortMenu}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]">
                {sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                Ordenar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Ordenar por</p>
                {(
                  [
                    { field: 'date' as SortField, label: 'Data' },
                    { field: 'name' as SortField, label: 'Nome (A-Z)' },
                    { field: 'value' as SortField, label: 'Valor' },
                    { field: 'category' as SortField, label: 'Categoria' },
                  ] as const
                ).map(({ field, label }) => (
                  <Button
                    key={field}
                    variant={sortField === field ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-between h-8 text-xs"
                    onClick={() => {
                      handleSort(field);
                      setShowMobileSortMenu(false);
                    }}
                  >
                    {label}
                    {sortField === field &&
                      (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-1">
            {filteredAndSorted.length === 0 ? (
              <EmptyState description="Nenhum lançamento encontrado" className="py-6" />
            ) : (
              filteredAndSorted.map((item) => {
                const isEntrada = isIncomeLancamento(item);
                const isConfirmed = item.is_category_confirmed;
                const dateStr = item.data_pagamento || item.data_registro;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-2.5 rounded-lg border transition-colors cursor-pointer active:scale-[0.98]',
                      isConfirmed
                        ? 'bg-emerald-50/60 border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-800/40'
                        : 'bg-card border-border'
                    )}
                    onClick={() => openEditDialog(item)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] text-muted-foreground">{dateStr ? formatShortDate(dateStr) : '—'}</span>
                          {isConfirmed && <Check className="h-3 w-3 text-emerald-500/60" strokeWidth={2.5} />}
                          <Badge
                            variant="outline"
                            className={cn(
                              'h-3.5 px-1 text-[8px]',
                              isEntrada ? 'bg-income/10 border-income/20 text-income' : 'bg-expense/10 border-expense/20 text-expense'
                            )}
                          >
                            {isEntrada ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
                          </Badge>
                        </div>
                        <p className="text-xs font-medium truncate">{item.nome}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{mobileCategorySubtitle(item)}</p>
                      </div>
                      <span
                        className={cn('font-medium text-xs tabular-nums whitespace-nowrap', isEntrada ? 'text-income' : 'text-expense')}
                      >
                        {formatCurrency(item.valor_realizado ?? item.valor_previsto)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="border-t pt-2 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{totals.filteredCount}</span> lançamento(s)
            </span>
            <span className="font-bold text-primary">{formatCurrency(totals.filteredTotal)}</span>
          </div>
          {totals.unvalidatedCount > 0 && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              {totals.unvalidatedCount} lançamento(s) com categoria não validada
            </p>
          )}
        </div>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-[90vw] sm:max-w-md rounded-xl" hideCloseButton={false}>
            {selectedLancamento && (() => {
              const item = selectedLancamento;
              const isEntrada = isIncomeLancamento(item);
              const dateStr = item.data_pagamento || item.data_registro;

              return (
                <div className="space-y-4">
                  <DialogHeader>
                    <DialogTitle className="text-left text-sm">{item.nome}</DialogTitle>
                    <DialogDescription className="text-left text-[11px] text-muted-foreground/70 flex items-center gap-1">
                      {isEntrada ? <TrendingUp className="h-3 w-3 text-income" /> : <TrendingDown className="h-3 w-3 text-expense" />}
                      {isEntrada ? 'Receita' : 'Despesa'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Valor</span>
                      <span className={cn('text-lg font-bold', isEntrada ? 'text-income' : 'text-expense')}>
                        {formatCurrency(item.valor_realizado ?? item.valor_previsto)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Data</span>
                      <span className="text-sm font-medium">{dateStr ? formatDate(dateStr) : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Forma de Pagamento</span>
                      <span className="text-sm">{getBancoLabel(item)}</span>
                    </div>

                    {isEntrada ? (
                      <div className="space-y-1.5">
                        <span className="text-sm text-muted-foreground">Categoria (receita)</span>
                        {renderIncomeSelect(item, true)}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <span className="text-sm text-muted-foreground">Grupo</span>
                          {renderExpenseGroupSelect(item, true)}
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-sm text-muted-foreground">Item</span>
                          {renderExpenseItemSelect(item, true)}
                        </div>
                      </>
                    )}

                    {item.observacoes && (
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Observações</span>
                        <p className="text-sm text-muted-foreground/80 bg-muted/40 rounded-md px-3 py-1.5">{item.observacoes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    {!item.is_category_confirmed && (
                      <Button
                        variant="default"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                          handleConfirm(item);
                          setSelectedLancamento({ ...item, is_category_confirmed: true });
                        }}
                        disabled={updatingId === item.id}
                      >
                        {updatingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Confirmar Categoria
                          </>
                        )}
                      </Button>
                    )}
                    <Button variant="outline" className="flex-1" onClick={() => setShowEditDialog(false)}>
                      Fechar
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={showUnvalidatedOnly ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-[10px] gap-1"
          onClick={() => setShowUnvalidatedOnly(!showUnvalidatedOnly)}
        >
          <Filter className="h-3 w-3" />
          Não validados
          {unvalidatedCount > 0 && (
            <Badge variant="secondary" className="h-4 min-w-4 p-0 text-[9px] flex items-center justify-center ml-0.5">
              {unvalidatedCount}
            </Badge>
          )}
        </Button>
      </div>

      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="min-w-[920px]">
          <Table className="text-xs">
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50 py-2 px-2 w-24" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1 font-semibold">
                    Data
                    {getSortIcon('date')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 py-2 px-2" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    Descrição
                    {getSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead className="py-2 px-2 w-36">Grupo</TableHead>
                <TableHead className="py-2 px-2 w-36">Item</TableHead>
                <TableHead className="py-2 px-1 w-14 text-center">Status</TableHead>
                <TableHead className="py-2 px-2 w-28">Banco</TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50 py-2 px-2 w-28"
                  onClick={() => handleSort('value')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Valor
                    {getSortIcon('value')}
                  </div>
                </TableHead>
                <TableHead className="text-center py-2 px-1 w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    Nenhum lançamento encontrado com os filtros aplicados
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((item) => {
                  const isEntrada = isIncomeLancamento(item);
                  const isUpdating = updatingId === item.id;
                  const isConfirmed = item.is_category_confirmed;
                  const dateStr = item.data_pagamento || item.data_registro;
                  const sugg = suggestionMap[item.id];

                  return (
                    <TableRow key={item.id} className="text-xs">
                      <TableCell className="whitespace-nowrap py-1.5 px-2 font-semibold text-foreground">
                        {dateStr ? formatDate(dateStr) : '—'}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] py-1.5 px-2">
                        <div className="truncate flex items-center gap-1.5">
                          <div
                            className={cn(
                              'h-5 w-5 rounded-full flex items-center justify-center shrink-0',
                              isEntrada ? 'bg-income/10' : 'bg-expense/10'
                            )}
                          >
                            {isEntrada ? (
                              <TrendingUp className="h-3 w-3 text-income" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-expense" />
                            )}
                          </div>
                          <span className="truncate" title={item.nome}>
                            {item.nome}
                          </span>
                        </div>
                      </TableCell>
                      {isEntrada ? (
                        <TableCell colSpan={2} className="py-1.5 px-2">
                          <div className="flex items-center gap-1.5 max-w-[280px]">{renderIncomeSelect(item, false)}</div>
                        </TableCell>
                      ) : (
                        <>
                          <TableCell className="py-1.5 px-2 align-top">
                            <div className="flex items-center gap-1">{renderExpenseGroupSelect(item, false)}</div>
                          </TableCell>
                          <TableCell className="py-1.5 px-2 align-top">
                            <div className="flex items-center gap-1">
                              {renderExpenseItemSelect(item, false)}
                              {!isConfirmed && sugg && (
                                <TooltipProvider delayDuration={200}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span
                                        className={cn(
                                          'shrink-0 w-2 h-2 rounded-full',
                                          sugg.confidence === 'high'
                                            ? 'bg-emerald-500'
                                            : sugg.confidence === 'medium'
                                              ? 'bg-amber-500'
                                              : 'bg-muted-foreground/50'
                                        )}
                                        aria-label={`Confiança: ${sugg.confidence}`}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p className="text-xs">Sugestão IA — confiança {sugg.confidence}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {isUpdating && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
                            </div>
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-center py-1.5 px-1">
                        {isConfirmed ? (
                          <Badge
                            variant="outline"
                            className="text-[8px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                          >
                            <Check className="h-2 w-2 mr-0.5" />
                            Ok
                          </Badge>
                        ) : (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-amber-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                  onClick={() => handleConfirm(item)}
                                  disabled={isUpdating}
                                >
                                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">Confirmar categoria</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <Wallet className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-[10px] text-muted-foreground truncate" title={getBancoLabel(item)}>
                            {getBancoLabel(item)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-medium tabular-nums py-1.5 px-2',
                          isEntrada ? 'text-income' : 'text-expense'
                        )}
                      >
                        {formatCurrency(item.valor_realizado ?? item.valor_previsto)}
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>

      <div className="border-t pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>
              <span className="font-medium text-foreground">{totals.filteredCount}</span> lançamento(s)
            </p>
            {totals.unvalidatedCount > 0 && (
              <p className="text-amber-600 dark:text-amber-400">
                {totals.unvalidatedCount} lançamento(s) com categoria não validada
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Total do período</p>
            <p className="text-base font-bold text-primary">{formatCurrency(totals.filteredTotal)}</p>
          </div>
        </div>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md rounded-xl" hideCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Editar Lançamento</DialogTitle>
            <DialogDescription>Altere grupo e item de categoria</DialogDescription>
          </DialogHeader>
          {selectedLancamento && (() => {
            const item = selectedLancamento;
            const isEntrada = isIncomeLancamento(item);
            const dateStr = item.data_pagamento || item.data_registro;
            return (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Data</label>
                    <p className="font-medium text-sm">{dateStr ? formatDate(dateStr) : '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Valor</label>
                    <p className={cn('font-bold text-lg', isEntrada ? 'text-income' : 'text-expense')}>
                      {formatCurrency(item.valor_realizado ?? item.valor_previsto)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Forma de Pagamento</label>
                    <p className="text-sm">{getBancoLabel(item)}</p>
                  </div>
                </div>
                {isEntrada ? (
                  <div>
                    <label className="text-xs text-muted-foreground block mb-2">Receita</label>
                    {renderIncomeSelect(item, true)}
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-2">Grupo</label>
                      {renderExpenseGroupSelect(item, true)}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-2">Item</label>
                      {renderExpenseItemSelect(item, true)}
                    </div>
                  </>
                )}
                {selectedLancamento.observacoes && (
                  <div className="p-2 bg-muted/40 rounded-lg">
                    <p className="text-xs text-muted-foreground">{selectedLancamento.observacoes}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  {!item.is_category_confirmed && (
                    <Button
                      variant="default"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        handleConfirm(item);
                        setSelectedLancamento({ ...item, is_category_confirmed: true });
                      }}
                      disabled={updatingId === item.id}
                    >
                      {updatingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Confirmar
                        </>
                      )}
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1" onClick={() => setShowEditDialog(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
