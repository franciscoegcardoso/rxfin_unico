import React, { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  RefreshCcw,
  Calendar,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { expenseCategories } from '@/data/defaultData';
import { PendingTransaction } from '@/hooks/useCreditCardTransactions';
import { detectRecurringByWhitelist } from '@/utils/recurringWhitelist';

interface TransactionReviewTableProps {
  transactions: PendingTransaction[];
  onCategoryChange: (index: number, categoryId: string) => void;
  onInstallmentChange: (index: number, current: number | undefined, total: number | undefined) => void;
  onBatchCategoryChange?: (indices: number[], categoryId: string) => void;
  cardName?: string;
}

type SortField = 'date' | 'storeName' | 'value';
type SortDirection = 'asc' | 'desc';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export function TransactionReviewTable({
  transactions,
  onCategoryChange,
  onInstallmentChange,
  onBatchCategoryChange,
  cardName,
}: TransactionReviewTableProps) {
  // Filters
  const [storeFilter, setStoreFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [batchCategoryId, setBatchCategoryId] = useState<string>('');

  const toggleSelectRow = (idx: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleSelectAll = (filteredIdxs: number[]) => {
    const allSelected = filteredIdxs.every(i => selectedIndices.has(i));
    setSelectedIndices(allSelected ? new Set() : new Set(filteredIdxs));
  };

  const applyBatch = () => {
    if (!batchCategoryId || selectedIndices.size === 0) return;
    onBatchCategoryChange?.(Array.from(selectedIndices), batchCategoryId);
    setSelectedIndices(new Set());
    setBatchCategoryId('');
  };

  const allCategories = useMemo(() => [
    ...expenseCategories,
    { id: 'outros', name: 'Não atribuído', reference: '' }
  ], []);

  // Get unique categories from transactions for filter
  const transactionCategories = useMemo(() => {
    const categories = new Set<string>();
    transactions.forEach(t => {
      const catId = t.selectedCategoryId || t.suggestedCategoryId || 'outros';
      categories.add(catId);
    });
    return Array.from(categories).map(id => {
      const cat = allCategories.find(c => c.id === id);
      return { id, name: cat?.name || 'Não atribuído' };
    });
  }, [transactions, allCategories]);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let result = transactions.map((t, originalIndex) => ({ ...t, originalIndex }));

    // Apply store name filter
    if (storeFilter.trim()) {
      const searchLower = storeFilter.toLowerCase();
      result = result.filter(t => 
        t.storeName.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (categoryFilter && categoryFilter !== 'all') {
      result = result.filter(t => {
        const catId = t.selectedCategoryId || t.suggestedCategoryId || 'outros';
        return catId === categoryFilter;
      });
    }

    // Apply date range filter
    if (startDate) {
      result = result.filter(t => t.date >= startDate);
    }
    if (endDate) {
      result = result.filter(t => t.date <= endDate);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = a.date.localeCompare(b.date);
          break;
        case 'storeName':
          comparison = a.storeName.localeCompare(b.storeName);
          break;
        case 'value':
          comparison = a.value - b.value;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [transactions, storeFilter, categoryFilter, startDate, endDate, sortField, sortDirection]);

  // Calculate totals
  const totals = useMemo(() => {
    const filteredTotal = filteredAndSortedTransactions.reduce((sum, t) => sum + t.value, 0);
    const grandTotal = transactions.reduce((sum, t) => sum + t.value, 0);
    return { filteredTotal, grandTotal, filteredCount: filteredAndSortedTransactions.length };
  }, [filteredAndSortedTransactions, transactions]);

  // Handle sort
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
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-primary" />
      : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  const clearFilters = () => {
    setStoreFilter('');
    setCategoryFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = storeFilter || categoryFilter !== 'all' || startDate || endDate;

  const getConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-income/20 text-income border-income/30 text-[10px] px-1.5 py-0">Alta</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-[10px] px-1.5 py-0">Média</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0">Baixa</Badge>;
    }
  };

  // Detect if transaction might be recurring (uses shared whitelist)
  const isRecurring = (storeName: string): boolean => {
    return detectRecurringByWhitelist(storeName);
  };

  // Parse installment info - first from dedicated fields, then from string, then from store name
  const parseInstallmentInfo = (transaction: PendingTransaction): { current: number; total: number } | null => {
    // First, check if there are dedicated fields (already parsed)
    if (transaction.installmentCurrent && transaction.installmentTotal) {
      return { current: transaction.installmentCurrent, total: transaction.installmentTotal };
    }
    
    // Second, check if there's a dedicated installment string field
    if (transaction.installment) {
      const match = transaction.installment.match(/(\d{1,2})\s*[\/\\]\s*(\d{1,2})/);
      if (match) {
        const current = parseInt(match[1]);
        const total = parseInt(match[2]);
        if (current <= total && total <= 48 && total > 1) {
          return { current, total };
        }
      }
    }
    
    // Fallback: try to parse from store name
    const patterns = [
      /(\d{1,2})\s*\/\s*(\d{1,2})/,
      /parcela?\s*(\d{1,2})\s*(?:de|\/)\s*(\d{1,2})/i,
      /parc\.?\s*(\d{1,2})\s*(?:de|\/)\s*(\d{1,2})/i,
    ];
    
    for (const pattern of patterns) {
      const match = transaction.storeName.match(pattern);
      if (match) {
        const current = parseInt(match[1]);
        const total = parseInt(match[2]);
        if (current <= total && total <= 48 && total > 1) {
          return { current, total };
        }
      }
    }
    return null;
  };

  return (
    <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
      {/* Filters Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtros
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={clearFilters}
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-12 gap-3">
          {/* Store name filter */}
          <div className="col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar estabelecimento..."
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category filter */}
          <div className="col-span-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {transactionCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range filter */}
          <div className="col-span-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Data inicial"
              className="text-sm"
            />
          </div>
          <div className="col-span-2">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Data final"
              className="text-sm"
            />
          </div>
          <div className="col-span-1 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Batch action bar */}
      {selectedIndices.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg mb-2 text-xs">
          <span className="text-muted-foreground font-medium">{selectedIndices.size} selecionadas</span>
          <Select value={batchCategoryId} onValueChange={setBatchCategoryId}>
            <SelectTrigger className="w-[150px] h-7 text-xs">
              <SelectValue placeholder="Escolher categoria" />
            </SelectTrigger>
            <SelectContent>
              {allCategories.map(cat => (
                <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7 text-xs" onClick={applyBatch} disabled={!batchCategoryId}>
            Aplicar
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIndices(new Set())}>
            Cancelar
          </Button>
        </div>
      )}

      {/* Table */}
      <ScrollArea className="h-[350px] border border-border/40 rounded-xl">
        <div className="min-w-[700px] overflow-auto">
          <Table className="text-xs">
            <TableHeader className="sticky top-0 bg-muted/30 z-10">
              <TableRow className="border-b border-border/30 hover:bg-transparent">
                <TableHead className="w-8 py-2 px-2">
                  <Checkbox
                    checked={
                      filteredAndSortedTransactions.length > 0 &&
                      filteredAndSortedTransactions.every(t => selectedIndices.has(t.originalIndex))
                    }
                    onCheckedChange={() =>
                      toggleSelectAll(filteredAndSortedTransactions.map(t => t.originalIndex))
                    }
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors py-2.5 px-4"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Data
                    {getSortIcon('date')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors py-2.5 px-4"
                  onClick={() => handleSort('storeName')}
                >
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Estabelecimento
                    {getSortIcon('storeName')}
                  </div>
                </TableHead>
                <TableHead className="text-center py-2.5 px-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Recorr.</span>
                </TableHead>
                <TableHead className="text-center py-2.5 px-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Pgto</span>
                </TableHead>
                <TableHead className="text-center py-2.5 px-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Parc.</span>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50 transition-colors py-2.5 px-4"
                  onClick={() => handleSort('value')}
                >
                  <div className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Valor
                    {getSortIcon('value')}
                  </div>
                </TableHead>
                <TableHead className="py-2.5 px-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Categoria</span>
                </TableHead>
                <TableHead className="text-center py-2.5 px-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Conf.</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                    {hasActiveFilters 
                      ? 'Nenhuma transação encontrada com os filtros aplicados'
                      : 'Nenhuma transação para exibir'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedTransactions.map((t, idx) => {
                  const installmentInfo = parseInstallmentInfo(t);
                  const recurring = isRecurring(t.storeName);
                  const isInstallment = installmentInfo !== null;
                  const isEven = idx % 2 === 0;
                  
                  return (
                    <TableRow key={t.originalIndex} className={`text-xs ${selectedIndices.has(t.originalIndex) ? 'bg-primary/5' : ''}`}>
                      <TableCell className="py-1.5 px-2 w-8">
                        <Checkbox
                          checked={selectedIndices.has(t.originalIndex)}
                          onCheckedChange={() => toggleSelectRow(t.originalIndex)}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-2 px-4 text-xs font-medium text-muted-foreground tabular-nums font-mono">
                        {formatDate(t.date)}
                      </TableCell>
                      <TableCell className="font-medium max-w-[160px] truncate py-2 px-4 text-xs text-muted-foreground" title={t.storeName}>
                        {t.storeName}
                      </TableCell>
                      <TableCell className="text-center py-2 px-2">
                        {recurring ? (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">
                            <RefreshCcw className="h-2.5 w-2.5 mr-0.5" />
                            Sim
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/20">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-2 px-2">
                        <Select
                          value={isInstallment ? 'parcelado' : 'vista'}
                          onValueChange={(value) => {
                            if (value === 'vista') {
                              onInstallmentChange(t.originalIndex, undefined, undefined);
                            } else {
                              onInstallmentChange(t.originalIndex, 1, 2);
                            }
                          }}
                        >
                          <SelectTrigger className="w-[70px] h-6 text-[10px] px-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vista" className="text-xs">À Vista</SelectItem>
                            <SelectItem value="parcelado" className="text-xs">Parc.</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center py-2 px-2">
                        {isInstallment ? (
                          <div className="flex items-center gap-0.5 justify-center">
                            <Input
                              type="number"
                              min="1"
                              max={installmentInfo?.total || 48}
                              value={installmentInfo?.current || 1}
                              onChange={(e) => {
                                const current = parseInt(e.target.value) || 1;
                                onInstallmentChange(t.originalIndex, current, installmentInfo?.total || 2);
                              }}
                              className="w-8 h-6 text-[10px] text-center p-0 font-mono tabular-nums"
                            />
                            <span className="text-muted-foreground/40 text-[10px]">/</span>
                            <Input
                              type="number"
                              min="2"
                              max="48"
                              value={installmentInfo?.total || 2}
                              onChange={(e) => {
                                const total = parseInt(e.target.value) || 2;
                                onInstallmentChange(t.originalIndex, installmentInfo?.current || 1, total);
                              }}
                              className="w-8 h-6 text-[10px] text-center p-0 font-mono tabular-nums"
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground/20">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums font-mono py-2 px-4 text-xs text-muted-foreground">
                        {formatCurrency(t.value)}
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <Select
                          value={t.selectedCategoryId || t.suggestedCategoryId || 'outros'}
                          onValueChange={(value) => onCategoryChange(t.originalIndex, value)}
                        >
                          <SelectTrigger className="w-[120px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {allCategories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id} className="text-xs">
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center py-2 px-2">
                        {getConfidenceBadge(t.confidence)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>

      {/* Summary Section */}
      <div className="border-t pt-4 space-y-3">
        {/* Card subtotal */}
        {cardName && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Subtotal {cardName}:
            </span>
            <span className="font-semibold">
              {formatCurrency(totals.grandTotal)}
            </span>
          </div>
        )}

        {/* Filtered results info */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
            <span className="text-muted-foreground">
              Exibindo {totals.filteredCount} de {transactions.length} transações
            </span>
            <span className="font-medium">
              Subtotal filtrado: {formatCurrency(totals.filteredTotal)}
            </span>
          </div>
        )}

        {/* Grand total */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{transactions.length}</span> transações
          </span>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total da fatura</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(totals.grandTotal)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
