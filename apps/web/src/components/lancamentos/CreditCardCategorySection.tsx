import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { CreditCardTransaction } from '@/hooks/useCreditCardTransactions';
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
  CreditCard,
} from 'lucide-react';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { cn } from '@/lib/utils';
import type { ExpenseGroup } from '@/hooks/useUserCategories';

export interface CreditCardCategorySectionProps {
  transactions: CreditCardTransaction[];
  loading: boolean;
  onUpdated: () => void;
  getCardLabel: (cardId: string | null) => string;
}

type SortField = 'date' | 'name' | 'value' | 'category';
type SortDirection = 'asc' | 'desc';

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const formatShortDate = (dateStr: string) => {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
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

function isIncomeTx(t: CreditCardTransaction): boolean {
  return t.value > 0;
}

function groupForItemId(groups: ExpenseGroup[], itemId: string | null | undefined): ExpenseGroup | undefined {
  if (!itemId) return undefined;
  return groups.find((g) => g.items.some((i) => i.id === itemId));
}

export function CreditCardCategorySection({
  transactions,
  loading: parentLoading,
  onUpdated,
  getCardLabel,
}: CreditCardCategorySectionProps) {
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

  const [selectedTx, setSelectedTx] = useState<CreditCardTransaction | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const unvalidatedIdsKey = useMemo(
    () => transactions.filter((t) => !t.is_category_confirmed).map((t) => t.id).sort().join(','),
    [transactions]
  );

  useEffect(() => {
    const unvalidated = transactions.filter((t) => !t.is_category_confirmed);
    if (transactions.length === 0) return;
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
          const batchPayload = batch.map((t) => ({
            storeName: (t.friendly_name || t.store_name || '').trim() || 'Sem descriÃ§Ã£o',
            value: t.value,
            date: t.transaction_date,
          }));
          const { data, error } = await supabase.functions.invoke('categorize-transactions', {
            body: {
              transactions: batchPayload,
              expenseGroups: userCats?.expenseGroups ?? [],
              incomeItems: userCats?.incomeItems ?? [],
            },
          });
          if (!error && data?.categorizedTransactions) {
            const newMap: Record<string, SuggestionEntry> = {};
            data.categorizedTransactions.forEach((result: Record<string, unknown>, idx: number) => {
              const id = batch[idx]?.id;
              if (id) {
                const inc = isIncomeTx(batch[idx]);
                newMap[id] = {
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
      } catch (e) {
        console.error(e);
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
    if (isHidden) return 'â€¢â€¢â€¢â€¢â€¢â€¢';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);
  };

  const getSortCategoryLabel = (t: CreditCardTransaction) => {
    if (isIncomeTx(t)) {
      const id = t.category_id ?? selectedItems[t.id] ?? suggestionMap[t.id]?.suggestedCategoryId;
      return userCats?.incomeItems.find((i) => i.id === id)?.name ?? t.category ?? '';
    }
    const gid =
      selectedGroups[t.id] ??
      groupForItemId(userCats?.expenseGroups ?? [], t.category_id)?.category_id ??
      suggestionMap[t.id]?.suggestedGroupId;
    const g = userCats?.expenseGroups.find((x) => x.category_id === gid);
    const iid = selectedItems[t.id] ?? t.category_id ?? suggestionMap[t.id]?.suggestedCategoryId;
    const itm = g?.items.find((x) => x.id === iid);
    return `${g?.category_name ?? ''} ${itm?.name ?? t.category ?? ''}`.trim();
  };

  const filteredAndSorted = useMemo(() => {
    let items = [...transactions];
    if (showUnvalidatedOnly) items = items.filter((t) => !t.is_category_confirmed);
    items.sort((a, b) => {
      let c = 0;
      switch (sortField) {
        case 'date':
          c = a.transaction_date.localeCompare(b.transaction_date);
          break;
        case 'name':
          c = a.store_name.localeCompare(b.store_name);
          break;
        case 'value':
          c = a.value - b.value;
          break;
        case 'category':
          c = getSortCategoryLabel(a).localeCompare(getSortCategoryLabel(b));
          break;
      }
      return sortDirection === 'asc' ? c : -c;
    });
    return items;
  }, [transactions, showUnvalidatedOnly, sortField, sortDirection, userCats, selectedGroups, selectedItems, suggestionMap]);

  const unvalidatedCount = transactions.filter((t) => !t.is_category_confirmed).length;

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection((p) => (p === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  };

  const persistCcCategory = useCallback(
    async (id: string, categoryId: string, categoryName: string, confirm: boolean) => {
      const { error } = await supabase
        .from('credit_card_transactions_v')
        .update({
          category_id: categoryId,
          category: categoryName,
          ...(confirm ? { is_category_confirmed: true } : {}),
        })
        .eq('id', id);
      if (error) throw error;
      onUpdated();
    },
    [onUpdated]
  );

  const handleConfirm = useCallback(
    async (t: CreditCardTransaction) => {
      const income = isIncomeTx(t);
      const sugg = suggestionMap[t.id];
      if (income) {
        const incomeId = selectedItems[t.id] ?? sugg?.suggestedCategoryId ?? t.category_id ?? '';
        const name = userCats?.incomeItems.find((i) => i.id === incomeId)?.name ?? '';
        if (!incomeId) {
          toast.error('Selecione uma categoria de receita');
          return;
        }
        setUpdatingId(t.id);
        try {
          await persistCcCategory(t.id, incomeId, name, true);
          toast.success('Categoria confirmada!');
        } catch {
          toast.error('Erro ao confirmar');
        } finally {
          setUpdatingId(null);
        }
        return;
      }
      const gid = selectedGroups[t.id] ?? sugg?.suggestedGroupId ?? groupForItemId(userCats?.expenseGroups ?? [], t.category_id)?.category_id ?? '';
      const iid = selectedItems[t.id] ?? sugg?.suggestedCategoryId ?? t.category_id ?? '';
      const group = userCats?.expenseGroups.find((g) => g.category_id === gid);
      const itm = group?.items.find((i) => i.id === iid);
      if (!gid || !iid) {
        toast.error('Selecione grupo e item');
        return;
      }
      setUpdatingId(t.id);
      try {
        await persistCcCategory(t.id, iid, itm?.name ?? '', true);
        toast.success('Categoria confirmada!');
      } catch {
        toast.error('Erro ao confirmar');
      } finally {
        setUpdatingId(null);
      }
    },
    [persistCcCategory, selectedGroups, selectedItems, suggestionMap, userCats]
  );

  const handleConfirmedChange = useCallback(
    async (t: CreditCardTransaction, income: boolean, categoryId: string, categoryName: string) => {
      setUpdatingId(t.id);
      try {
        await persistCcCategory(t.id, categoryId, categoryName, false);
      } catch {
        toast.error('Erro ao atualizar');
      } finally {
        setUpdatingId(null);
      }
    },
    [persistCcCategory]
  );

  const openEdit = (t: CreditCardTransaction) => {
    setSelectedTx(t);
    setShowEditDialog(true);
  };

  const mobileSubtitle = (t: CreditCardTransaction) => {
    if (isIncomeTx(t)) {
      const id = selectedItems[t.id] ?? t.category_id ?? suggestionMap[t.id]?.suggestedCategoryId;
      return userCats?.incomeItems.find((i) => i.id === id)?.name ?? t.category ?? 'â€”';
    }
    const gid =
      selectedGroups[t.id] ??
      groupForItemId(userCats?.expenseGroups ?? [], t.category_id)?.category_id ??
      suggestionMap[t.id]?.suggestedGroupId;
    const g = userCats?.expenseGroups.find((x) => x.category_id === gid);
    const iid = selectedItems[t.id] ?? t.category_id ?? suggestionMap[t.id]?.suggestedCategoryId;
    const itm = g?.items.find((x) => x.id === iid);
    const gn = g?.category_name ?? '';
    const nn = itm?.name ?? t.category ?? '';
    return gn && nn ? `${gn} â€º ${nn}` : nn || gn || 'â€”';
  };

  const renderIncomeSelect = (t: CreditCardTransaction, compact: boolean) => {
    const sugg = suggestionMap[t.id];
    const val =
      selectedItems[t.id] ??
      (t.is_category_confirmed ? t.category_id : undefined) ??
      sugg?.suggestedCategoryId ??
      '';
    const loadingRow = loadingSuggestions && !sugg && !t.is_category_confirmed;
    return (
      <Select
        key={`inc-${t.id}`}
        value={val || undefined}
        onValueChange={(v) => {
          setSelectedItems((p) => ({ ...p, [t.id]: v }));
          if (t.is_category_confirmed) {
            const n = userCats?.incomeItems.find((i) => i.id === v)?.name ?? '';
            if (n) handleConfirmedChange(t, true, v, n);
          }
        }}
        disabled={updatingId === t.id}
      >
        <SelectTrigger
          className={cn(
            compact ? 'w-full h-9' : 'w-full min-w-[120px] h-6 text-[10px]',
            t.is_category_confirmed
              ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20'
          )}
        >
          {loadingRow ? (
            <span className="flex gap-1 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Sugerindoâ€¦
            </span>
          ) : (
            <SelectValue placeholder="Receita" />
          )}
        </SelectTrigger>
        <SelectContent>
          {(userCats?.incomeItems ?? []).map((i) => (
            <SelectItem key={i.id} value={i.id} className={compact ? '' : 'text-xs'}>
              {i.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const renderGroupSelect = (t: CreditCardTransaction, compact: boolean) => {
    const sugg = suggestionMap[t.id];
    const fromDb = groupForItemId(userCats?.expenseGroups ?? [], t.category_id)?.category_id;
    const val = selectedGroups[t.id] ?? (t.is_category_confirmed ? fromDb : undefined) ?? sugg?.suggestedGroupId ?? '';
    const loadingRow = loadingSuggestions && !sugg && !t.is_category_confirmed;
    return (
      <Select
        key={`grp-${t.id}`}
        value={val || undefined}
        onValueChange={(v) => {
          setSelectedGroups((p) => ({ ...p, [t.id]: v }));
          setSelectedItems((p) => {
            const n = { ...p };
            delete n[t.id];
            return n;
          });
          if (t.is_category_confirmed) {
            const g = userCats?.expenseGroups.find((x) => x.category_id === v);
            const itm = g?.items.find((i) => i.id === t.category_id);
            if (g && itm) handleConfirmedChange(t, false, itm.id, itm.name);
          }
        }}
        disabled={updatingId === t.id}
      >
        <SelectTrigger
          className={cn(
            compact ? 'w-full h-9' : 'w-[120px] h-6 text-[10px]',
            t.is_category_confirmed
              ? 'border-emerald-300 bg-emerald-50/50'
              : 'border-amber-300 bg-amber-50/50'
          )}
        >
          {loadingRow ? (
            <Loader2 className="h-3 w-3 animate-spin" />
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

  const renderItemSelect = (t: CreditCardTransaction, compact: boolean) => {
    const sugg = suggestionMap[t.id];
    const gid =
      selectedGroups[t.id] ??
      groupForItemId(userCats?.expenseGroups ?? [], t.is_category_confirmed ? t.category_id : undefined)?.category_id ??
      sugg?.suggestedGroupId ??
      '';
    const group = (userCats?.expenseGroups ?? []).find((g) => g.category_id === gid);
    const items = group?.items ?? [];
    const rawVal =
      selectedItems[t.id] ?? (t.is_category_confirmed ? t.category_id : undefined) ?? sugg?.suggestedCategoryId ?? '';
    const val = items.some((i) => i.id === rawVal) ? rawVal : '';

    return (
      <Select
        key={`itm-${t.id}-${gid}`}
        value={val || undefined}
        onValueChange={(v) => {
          setSelectedItems((p) => ({ ...p, [t.id]: v }));
          if (t.is_category_confirmed && group) {
            const itm = group.items.find((i) => i.id === v);
            if (itm) handleConfirmedChange(t, false, v, itm.name);
          }
        }}
        disabled={items.length === 0 || updatingId === t.id}
      >
        <SelectTrigger
          className={cn(
            compact ? 'w-full h-9' : 'w-[120px] h-6 text-[10px]',
            t.is_category_confirmed ? 'border-emerald-300 bg-emerald-50/50' : 'border-amber-300 bg-amber-50/50'
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

  if (userCatsLoading || parentLoading) {
    return <RXFinLoadingSpinner height="py-8" />;
  }

  if (transactions.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma transaÃ§Ã£o neste perÃ­odo.</div>;
  }

  const totals = {
    filteredCount: filteredAndSorted.length,
    filteredTotal: filteredAndSorted.reduce((s, t) => s + t.value, 0),
    unvalidatedCount,
  };

  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={showUnvalidatedOnly ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-[10px] gap-1"
            onClick={() => setShowUnvalidatedOnly(!showUnvalidatedOnly)}
          >
            <Filter className="h-3 w-3" />
            NÃ£o validados
            {unvalidatedCount > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 p-0 text-[9px] ml-0.5">
                {unvalidatedCount}
              </Badge>
            )}
          </Button>
          <Popover open={showMobileSortMenu} onOpenChange={setShowMobileSortMenu}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
                {sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                Ordenar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              {(['date', 'name', 'value', 'category'] as SortField[]).map((field) => (
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
                  {field === 'date' ? 'Data' : field === 'name' ? 'DescriÃ§Ã£o' : field === 'value' ? 'Valor' : 'Categoria'}
                </Button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
        <ScrollArea className="h-[400px]">
          <div className="space-y-1">
            {filteredAndSorted.length === 0 ? (
              <EmptyState description="Nenhuma transaÃ§Ã£o" className="py-6" />
            ) : (
              filteredAndSorted.map((t) => {
                const inc = isIncomeTx(t);
                return (
                  <div
                    key={t.id}
                    className={cn(
                      'p-2.5 rounded-lg border cursor-pointer',
                      t.is_category_confirmed
                        ? 'bg-emerald-50/60 border-emerald-200/60'
                        : 'bg-card border-border'
                    )}
                    onClick={() => openEdit(t)}
                  >
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-muted-foreground">
                          {formatShortDate(t.transaction_date)}
                        </span>
                        <p className="text-xs font-medium truncate">{t.friendly_name || t.store_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{mobileSubtitle(t)}</p>
                      </div>
                      <span className={cn('text-xs font-medium tabular-nums', inc ? 'text-income' : 'text-expense')}>
                        {formatCurrency(t.value)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        <div className="border-t pt-2 flex justify-between text-xs">
          <span>
            <span className="font-medium">{totals.filteredCount}</span> transaÃ§Ã£o(Ãµes)
          </span>
          <span className="font-bold text-primary">{formatCurrency(totals.filteredTotal)}</span>
        </div>
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-[90vw] sm:max-w-md rounded-xl">
            {selectedTx && (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-left text-sm">{selectedTx.friendly_name || selectedTx.store_name}</DialogTitle>
                  <DialogDescription className="text-left text-[11px] flex items-center gap-1">
                    {isIncomeTx(selectedTx) ? (
                      <TrendingUp className="h-3 w-3 text-income" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-expense" />
                    )}
                    {isIncomeTx(selectedTx) ? 'Receita' : 'Despesa'} Â· {getCardLabel(selectedTx.card_id)}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex justify-between border-b py-2">
                    <span className="text-sm text-muted-foreground">Valor</span>
                    <span className={cn('text-lg font-bold', isIncomeTx(selectedTx) ? 'text-income' : 'text-expense')}>
                      {formatCurrency(selectedTx.value)}
                    </span>
                  </div>
                  {isIncomeTx(selectedTx) ? (
                    <div className="space-y-1.5">
                      <span className="text-sm text-muted-foreground">Receita</span>
                      {renderIncomeSelect(selectedTx, true)}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <span className="text-sm text-muted-foreground">Grupo</span>
                        {renderGroupSelect(selectedTx, true)}
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-sm text-muted-foreground">Item</span>
                        {renderItemSelect(selectedTx, true)}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {!selectedTx.is_category_confirmed && (
                    <Button
                      className="flex-1 bg-emerald-600"
                      onClick={() => {
                        handleConfirm(selectedTx);
                        setSelectedTx({ ...selectedTx, is_category_confirmed: true });
                      }}
                      disabled={updatingId === selectedTx.id}
                    >
                      {updatingId === selectedTx.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-2" />Confirmar</>}
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1" onClick={() => setShowEditDialog(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={showUnvalidatedOnly ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-[10px] gap-1"
          onClick={() => setShowUnvalidatedOnly(!showUnvalidatedOnly)}
        >
          <Filter className="h-3 w-3" />
          NÃ£o validados
          {unvalidatedCount > 0 && <Badge className="ml-0.5 h-4 text-[9px]">{unvalidatedCount}</Badge>}
        </Button>
      </div>
      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="min-w-[900px]">
          <Table className="text-xs">
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="cursor-pointer py-2 px-2 w-24" onClick={() => handleSort('date')}>
                  Data {getSortIcon('date')}
                </TableHead>
                <TableHead className="cursor-pointer py-2 px-2" onClick={() => handleSort('name')}>
                  DescriÃ§Ã£o {getSortIcon('name')}
                </TableHead>
                <TableHead className="py-2 px-2 w-32">Grupo</TableHead>
                <TableHead className="py-2 px-2 w-32">Item</TableHead>
                <TableHead className="py-2 px-1 w-12 text-center">Status</TableHead>
                <TableHead className="py-2 px-2 w-28">CartÃ£o</TableHead>
                <TableHead className="text-right py-2 px-2 w-24" onClick={() => handleSort('value')}>
                  Valor {getSortIcon('value')}
                </TableHead>
                <TableHead className="text-center w-14">AÃ§Ãµes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    Nenhuma transaÃ§Ã£o
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((t) => {
                  const inc = isIncomeTx(t);
                  const sugg = suggestionMap[t.id];
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap py-1.5 px-2 font-semibold">
                        {formatDate(t.transaction_date)}
                      </TableCell>
                      <TableCell className="max-w-[180px] py-1.5 px-2">
                        <div className="flex items-center gap-1 truncate">
                          {inc ? <TrendingUp className="h-3 w-3 text-income shrink-0" /> : <TrendingDown className="h-3 w-3 text-expense shrink-0" />}
                          <span className="truncate">{t.friendly_name || t.store_name}</span>
                        </div>
                      </TableCell>
                      {inc ? (
                        <TableCell colSpan={2} className="py-1.5 px-2">
                          {renderIncomeSelect(t, false)}
                        </TableCell>
                      ) : (
                        <>
                          <TableCell className="py-1.5 px-2">{renderGroupSelect(t, false)}</TableCell>
                          <TableCell className="py-1.5 px-2">
                            <div className="flex items-center gap-1">
                              {renderItemSelect(t, false)}
                              {!t.is_category_confirmed && sugg && (
                                <span
                                  className={cn(
                                    'w-2 h-2 rounded-full shrink-0',
                                    sugg.confidence === 'high' ? 'bg-emerald-500' : sugg.confidence === 'medium' ? 'bg-amber-500' : 'bg-muted-foreground/50'
                                  )}
                                />
                              )}
                              {updatingId === t.id && <Loader2 className="h-3 w-3 animate-spin" />}
                            </div>
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-center py-1.5">
                        {t.is_category_confirmed ? (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 bg-emerald-50 text-emerald-700">
                            <Check className="h-2 w-2 mr-0.5" />
                            Ok
                          </Badge>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleConfirm(t)} disabled={updatingId === t.id}>
                                  {updatingId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Confirmar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 px-2">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[100px]">
                          <CreditCard className="h-3 w-3 shrink-0" />
                          {getCardLabel(t.card_id)}
                        </div>
                      </TableCell>
                      <TableCell className={cn('text-right font-medium tabular-nums py-1.5', inc ? 'text-income' : 'text-expense')}>
                        {formatCurrency(t.value)}
                      </TableCell>
                      <TableCell className="text-center py-1.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(t)}>
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
      <div className="border-t pt-2 flex justify-between text-xs">
        <span>
          <span className="font-medium">{totals.filteredCount}</span> transaÃ§Ã£o(Ãµes)
        </span>
        <span className="font-bold text-primary">{formatCurrency(totals.filteredTotal)}</span>
      </div>
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <p className="text-sm font-medium">{selectedTx.friendly_name || selectedTx.store_name}</p>
              {isIncomeTx(selectedTx) ? (
                <div>
                  <label className="text-xs text-muted-foreground">Receita</label>
                  {renderIncomeSelect(selectedTx, true)}
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">Grupo</label>
                    {renderGroupSelect(selectedTx, true)}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Item</label>
                    {renderItemSelect(selectedTx, true)}
                  </div>
                </>
              )}
              <div className="flex gap-2">
                {!selectedTx.is_category_confirmed && (
                  <Button
                    className="flex-1 bg-emerald-600"
                    onClick={() => {
                      handleConfirm(selectedTx);
                      setSelectedTx({ ...selectedTx, is_category_confirmed: true });
                    }}
                    disabled={updatingId === selectedTx.id}
                  >
                    Confirmar
                  </Button>
                )}
                <Button variant="outline" className="flex-1" onClick={() => setShowEditDialog(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
