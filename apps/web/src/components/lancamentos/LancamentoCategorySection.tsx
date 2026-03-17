import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { LancamentoRealizado } from '@/hooks/useLancamentosRealizados';
import { useTransactionCategories } from '@/hooks/useTransactionCategories';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCategoryId } from '@/utils/categoryUtils';
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

type SuggestionEntry = { suggestedCategoryId: string; suggestedCategory: string; confidence: string };

export function LancamentoCategorySection({
  lancamentos,
  onCategoryUpdated,
}: LancamentoCategorySectionProps) {
  const { isHidden } = useVisibility();
  const isMobile = useIsMobile();
  const { incomeCategories, expenseGroups, isLoading: loadingCategories } = useTransactionCategories();

  const [showUnvalidatedOnly, setShowUnvalidatedOnly] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showMobileSortMenu, setShowMobileSortMenu] = useState(false);
  const [suggestionMap, setSuggestionMap] = useState<Record<string, SuggestionEntry>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Mobile edit dialog
  const [selectedLancamento, setSelectedLancamento] = useState<LancamentoRealizado | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const unvalidatedIdsKey = useMemo(
    () => lancamentos.filter((l) => !l.is_category_confirmed).map((l) => l.id).sort().join(','),
    [lancamentos]
  );

  // Fetch AI category suggestions for unvalidated lançamentos (conta)
  useEffect(() => {
    const unvalidated = lancamentos.filter((l) => !l.is_category_confirmed);
    if (lancamentos.length === 0) return; // dados ainda não carregaram
    if (unvalidated.length === 0) {
      setSuggestionMap({});
      return;
    }
    let cancelled = false;
    setLoadingSuggestions(true);
    (async () => {
      try {
        const allResults: { id: string; entry: SuggestionEntry }[] = [];
        for (let i = 0; i < unvalidated.length; i += BATCH_SIZE) {
          if (cancelled) return;
          const batch = unvalidated.slice(i, i + BATCH_SIZE);
          const transactions = batch.map((l) => ({
            storeName: (l.friendly_name || l.nome || '').trim() || 'Sem descrição',
            value: l.valor_realizado ?? l.valor_previsto ?? 0,
            date: l.data_pagamento || l.data_registro || l.mes_referencia + '-01',
            isAccountTransaction: true as const,
          }));
          const incomeCategoryNames = incomeCategories.map((c) => c.name);
          const { data, error } = await supabase.functions.invoke('categorize-transactions', {
            body: { transactions, incomeCategories: incomeCategoryNames },
          });
          if (error || !data?.categorizedTransactions) {
            if (!cancelled) setSuggestionMap((prev) => prev);
            return;
          }
          const categorized = data.categorizedTransactions as Array<{ suggestedCategoryId?: string; suggestedCategory?: string; confidence?: string }>;
          batch.forEach((l, idx) => {
            const c = categorized[idx];
            const suggestedCategory = (c?.suggestedCategory || 'Outros').trim();
            const suggestedCategoryId = c?.suggestedCategoryId || 'outros';
            const confidence = c?.confidence || 'low';
            allResults.push({ id: l.id, entry: { suggestedCategoryId, suggestedCategory, confidence } });
          });
        }
        if (!cancelled) {
          setSuggestionMap((prev) => {
            const next = { ...prev };
            allResults.forEach(({ id, entry }) => {
              next[id] = entry;
            });
            return next;
          });
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
  }, [unvalidatedIdsKey]);

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const expenseCategoryNames = useMemo(
    () => [...new Set(expenseGroups.map((g) => g.name))],
    [expenseGroups]
  );

  const getCategoriesForType = (tipo: 'receita' | 'despesa') => {
    if (tipo === 'receita') {
      return incomeCategories.map((c) => ({ value: c.name, label: c.name }));
    }
    return expenseCategoryNames.map((name) => ({ value: name, label: name }));
  };

  const getCategoriesForItem = useCallback(
    (item: LancamentoRealizado) => {
      const base = getCategoriesForType(item.tipo);
      const suggestion = suggestionMap[item.id]?.suggestedCategory;
      if (!suggestion || base.some((c) => c.value === suggestion)) return base;
      return [...base, { value: suggestion, label: suggestion }];
    },
    [suggestionMap, expenseCategoryNames, incomeCategories]
  );

  const getDisplayCategory = (item: LancamentoRealizado) =>
    item.categoria?.trim() || suggestionMap[item.id]?.suggestedCategory || '';

  // Filter & sort
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
          comparison = (a.categoria || '').localeCompare(b.categoria || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return items;
  }, [lancamentos, showUnvalidatedOnly, sortField, sortDirection]);

  const unvalidatedCount = lancamentos.filter((l) => !l.is_category_confirmed).length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const handleCategoryChange = useCallback(async (item: LancamentoRealizado, newCategory: string) => {
    setUpdatingId(item.id);
    try {
      const { error } = await supabase
        .from('lancamentos_realizados_v')
        .update({
          categoria: newCategory,
          category_id: getCategoryId(newCategory),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', item.id);
      if (error) throw error;
      onCategoryUpdated();
    } catch (err) {
      console.error('Error updating category:', err);
      toast.error('Erro ao atualizar categoria');
    } finally {
      setUpdatingId(null);
    }
  }, [onCategoryUpdated]);

  const handleConfirmCategory = useCallback(async (item: LancamentoRealizado) => {
    setUpdatingId(item.id);
    try {
      const categoryToSave = getDisplayCategory(item) || item.categoria;
      const updates: Record<string, unknown> = {
        is_category_confirmed: true,
        updated_at: new Date().toISOString(),
      };
      if (categoryToSave) {
        updates.categoria = categoryToSave;
        updates.category_id = getCategoryId(categoryToSave);
      }
      const { error } = await supabase
        .from('lancamentos_realizados_v')
        .update(updates as any)
        .eq('id', item.id);
      if (error) throw error;
      onCategoryUpdated();

      const label = item.nome.length > 25 ? item.nome.substring(0, 25) + '…' : item.nome;
      toast.success('Categoria confirmada!', {
        action: {
          label: `Sempre aplicar para "${label}"`,
          onClick: async () => {
            try {
              const { data, error: rpcError } = await supabase.rpc(
                'apply_lancamento_category_rule' as any,
                {
                  p_nome_pattern: item.nome,
                  p_categoria: categoryToSave,
                  p_tipo: item.tipo,
                }
              );
              if (rpcError) throw rpcError;
              const updated = (data as any)?.updated || 0;
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
      console.error('Error confirming category:', err);
      toast.error('Erro ao confirmar categoria');
    } finally {
      setUpdatingId(null);
    }
  }, [onCategoryUpdated, suggestionMap]);

  const openEditDialog = (item: LancamentoRealizado) => {
    setSelectedLancamento(item);
    setShowEditDialog(true);
  };

  const getFormaPagamentoLabel = (item: LancamentoRealizado) => {
    if (item.forma_pagamento) return item.forma_pagamento;
    if (item.source_type === 'credit_card') return 'Cartão';
    return '—';
  };

  if (loadingCategories) {
    return (
      <RXFinLoadingSpinner height="py-8" />
    );
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

  // ── Mobile View ──
  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Toolbar */}
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
                {([
                  { field: 'date' as SortField, label: 'Data' },
                  { field: 'name' as SortField, label: 'Nome (A-Z)' },
                  { field: 'value' as SortField, label: 'Valor' },
                  { field: 'category' as SortField, label: 'Categoria' },
                ]).map(({ field, label }) => (
                  <Button
                    key={field}
                    variant={sortField === field ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-between h-8 text-xs"
                    onClick={() => { handleSort(field); setShowMobileSortMenu(false); }}
                  >
                    {label}
                    {sortField === field && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Mobile List */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-1">
            {filteredAndSorted.length === 0 ? (
              <EmptyState
                description="Nenhum lançamento encontrado"
                className="py-6"
              />
            ) : (
              filteredAndSorted.map((item) => {
                const isEntrada = item.tipo === 'receita';
                const isConfirmed = item.is_category_confirmed;
                const dateStr = item.data_pagamento || item.data_registro;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "p-2.5 rounded-lg border transition-colors cursor-pointer active:scale-[0.98]",
                      isConfirmed
                        ? "bg-emerald-50/60 border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-800/40"
                        : "bg-card border-border"
                    )}
                    onClick={() => openEditDialog(item)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] text-muted-foreground">{dateStr ? formatShortDate(dateStr) : '—'}</span>
                          {isConfirmed && (
                            <Check className="h-3 w-3 text-emerald-500/60" strokeWidth={2.5} />
                          )}
                          <Badge
                            variant="outline"
                            className={cn(
                              "h-3.5 px-1 text-[8px]",
                              isEntrada ? "bg-income/10 border-income/20 text-income" : "bg-expense/10 border-expense/20 text-expense"
                            )}
                          >
                            {isEntrada ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
                          </Badge>
                        </div>
                        <p className="text-xs font-medium truncate">{item.nome}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{item.categoria}</p>
                      </div>
                      <span className={cn(
                        "font-medium text-xs tabular-nums whitespace-nowrap",
                        isEntrada ? "text-income" : "text-expense"
                      )}>
                        {formatCurrency(item.valor_realizado ?? item.valor_previsto)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Mobile Summary */}
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

        {/* Mobile Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-[90vw] sm:max-w-md rounded-xl" hideCloseButton={false}>
            {selectedLancamento && (() => {
              const item = selectedLancamento;
              const isEntrada = item.tipo === 'receita';
              const categories = getCategoriesForItem(item);
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
                    {/* Value */}
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Valor</span>
                      <span className={cn("text-lg font-bold", isEntrada ? "text-income" : "text-expense")}>
                        {formatCurrency(item.valor_realizado ?? item.valor_previsto)}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Data</span>
                      <span className="text-sm font-medium">{dateStr ? formatDate(dateStr) : '—'}</span>
                    </div>

                    {/* Forma de pagamento */}
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Forma de Pagamento</span>
                      <span className="text-sm">{getFormaPagamentoLabel(item)}</span>
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                      <span className="text-sm text-muted-foreground">Categoria</span>
                      <Select
                        key={`${item.id}-${suggestionMap[item.id]?.suggestedCategoryId ?? 'empty'}`}
                        value={getDisplayCategory(item) || undefined}
                        onValueChange={(value) => handleCategoryChange(item, value)}
                        disabled={updatingId === item.id}
                      >
                        <SelectTrigger className="w-full">
                          {loadingSuggestions && !suggestionMap[item.id] && !item.categoria?.trim() ? (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Sugerindo…
                            </span>
                          ) : (
                            <SelectValue placeholder="Selecionar" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Observações */}
                    {item.observacoes && (
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Observações</span>
                        <p className="text-sm text-muted-foreground/80 bg-muted/40 rounded-md px-3 py-1.5">{item.observacoes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {!item.is_category_confirmed && (
                      <Button
                        variant="default"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                          handleConfirmCategory(item);
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

  // ── Desktop / Tablet View ──
  return (
    <div className="space-y-4">
      {/* Toolbar */}
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

      {/* Table */}
      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="min-w-[800px]">
          <Table className="text-xs">
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors py-2 px-2 w-24"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1 font-semibold">
                    Data
                    {getSortIcon('date')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors py-2 px-2"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Descrição
                    {getSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead className="py-2 px-2 w-56">Categoria</TableHead>
                <TableHead className="py-2 px-1 w-14 text-center">Status</TableHead>
                <TableHead className="py-2 px-2 w-28">Banco</TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50 transition-colors py-2 px-2 w-28"
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
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    Nenhum lançamento encontrado com os filtros aplicados
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((item) => {
                  const isEntrada = item.tipo === 'receita';
                  const isUpdating = updatingId === item.id;
                  const isConfirmed = item.is_category_confirmed;
                  const dateStr = item.data_pagamento || item.data_registro;

                  return (
                    <TableRow key={item.id} className="text-xs">
                      {/* Date */}
                      <TableCell className="whitespace-nowrap py-1.5 px-2 font-semibold text-foreground">
                        {dateStr ? formatDate(dateStr) : '—'}
                      </TableCell>

                      {/* Name / Description */}
                      <TableCell className="font-medium max-w-[220px] py-1.5 px-2">
                        <div className="truncate flex items-center gap-1.5">
                          <div className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center shrink-0",
                            isEntrada ? "bg-income/10" : "bg-expense/10"
                          )}>
                            {isEntrada ? (
                              <TrendingUp className="h-3 w-3 text-income" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-expense" />
                            )}
                          </div>
                          <span className="truncate" title={item.nome}>{item.nome}</span>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="py-1.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <Select
                            key={`${item.id}-${suggestionMap[item.id]?.suggestedCategoryId ?? 'empty'}`}
                            value={getDisplayCategory(item) || undefined}
                            onValueChange={(value) => handleCategoryChange(item, value)}
                            disabled={isUpdating}
                          >
                            <SelectTrigger className={cn(
                              "w-[200px] h-6 text-[10px] border",
                              isConfirmed
                                ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800"
                                : "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800"
                            )}>
                              {loadingSuggestions && !suggestionMap[item.id] && !item.categoria?.trim() ? (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Sugerindo…
                                </span>
                              ) : (
                                <SelectValue placeholder="Selecionar" />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {getCategoriesForItem(item).map((cat) => (
                                <SelectItem key={cat.value} value={cat.value} className="text-xs">
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!isConfirmed && suggestionMap[item.id] && (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={cn(
                                      "shrink-0 w-2 h-2 rounded-full",
                                      suggestionMap[item.id].confidence === 'high'
                                        ? "bg-emerald-500"
                                        : suggestionMap[item.id].confidence === 'medium'
                                          ? "bg-amber-500"
                                          : "bg-muted-foreground/50"
                                    )}
                                    aria-label={`Confiança: ${suggestionMap[item.id].confidence}`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">Sugestão IA — confiança {suggestionMap[item.id].confidence}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {isUpdating && (
                            <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center py-1.5 px-1">
                        {isConfirmed ? (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
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
                                  onClick={() => handleConfirmCategory(item)}
                                  disabled={isUpdating}
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">Confirmar categoria</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>

                      {/* Banco / Forma de Pagamento */}
                      <TableCell className="py-1.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <Wallet className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-[10px] text-muted-foreground truncate">
                            {getFormaPagamentoLabel(item)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Value */}
                      <TableCell className={cn(
                        "text-right font-medium tabular-nums py-1.5 px-2",
                        isEntrada ? "text-income" : "text-expense"
                      )}>
                        {formatCurrency(item.valor_realizado ?? item.valor_previsto)}
                      </TableCell>

                      {/* Actions */}
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

      {/* Summary */}
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
            <p className="text-base font-bold text-primary">
              {formatCurrency(totals.filteredTotal)}
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md rounded-xl" hideCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Editar Lançamento</DialogTitle>
            <DialogDescription>Altere a categoria do lançamento</DialogDescription>
          </DialogHeader>
          {selectedLancamento && (() => {
            const item = selectedLancamento;
            const isEntrada = item.tipo === 'receita';
            const categories = getCategoriesForItem(item);
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
                    <p className={cn("font-bold text-lg", isEntrada ? "text-income" : "text-expense")}>
                      {formatCurrency(item.valor_realizado ?? item.valor_previsto)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Forma de Pagamento</label>
                    <p className="text-sm">{getFormaPagamentoLabel(item)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-2">Categoria</label>
                  <Select
                    key={`${item.id}-${suggestionMap[item.id]?.suggestedCategoryId ?? 'empty'}`}
                    value={getDisplayCategory(item) || undefined}
                    onValueChange={(value) => handleCategoryChange(item, value)}
                    disabled={updatingId === item.id}
                  >
                    <SelectTrigger className="w-full">
                      {loadingSuggestions && !suggestionMap[item.id] && !item.categoria?.trim() ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Sugerindo…
                        </span>
                      ) : (
                        <SelectValue placeholder="Selecionar" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {item.observacoes && (
                  <div className="p-2 bg-muted/40 rounded-lg">
                    <p className="text-xs text-muted-foreground">{item.observacoes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {!item.is_category_confirmed && (
                    <Button
                      variant="default"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        handleConfirmCategory(item);
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
