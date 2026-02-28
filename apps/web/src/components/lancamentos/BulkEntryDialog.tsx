import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CurrencyInput, CurrencyInputRef } from '@/components/ui/currency-input';
import { useFinancial } from '@/contexts/FinancialContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { expenseCategories } from '@/data/defaultData';
import { 
  TrendingUp, TrendingDown, Check, X, Search, 
  ChevronRight, Zap, Calendar, Sparkles, Package,
  ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BulkEntry {
  itemId: string;
  name: string;
  value: number;
  type: 'income' | 'expense';
  category?: string;
  isNew?: boolean;
}

interface BulkEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntriesAdded: (entries: BulkEntry[], referenceMonth: string) => void;
}

export const BulkEntryDialog: React.FC<BulkEntryDialogProps> = ({
  open,
  onOpenChange,
  onEntriesAdded,
}) => {
  const { config } = useFinancial();
  const { isHidden } = useVisibility();
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<Map<string, number>>(new Map());
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const inputRefs = useRef<Map<string, CurrencyInputRef | null>>(new Map());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Month navigation state
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [pendingMonthChange, setPendingMonthChange] = useState<Date | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const enabledIncomes = useMemo(() => 
    config.incomeItems.filter(i => i.enabled),
    [config.incomeItems]
  );

  const enabledExpenses = useMemo(() => 
    config.expenseItems.filter(e => e.enabled),
    [config.expenseItems]
  );

  // Group expenses by category
  const expensesByCategory = useMemo(() => {
    const groups: Record<string, typeof enabledExpenses> = {};
    enabledExpenses.forEach(expense => {
      const category = expense.category || 'Outros';
      if (!groups[category]) groups[category] = [];
      groups[category].push(expense);
    });
    return groups;
  }, [enabledExpenses]);

  // Filter items based on search
  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expensesByCategory;
    const query = searchQuery.toLowerCase();
    const filtered: Record<string, typeof enabledExpenses> = {};
    Object.entries(expensesByCategory).forEach(([category, items]) => {
      const matchingItems = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        category.toLowerCase().includes(query)
      );
      if (matchingItems.length > 0) {
        filtered[category] = matchingItems;
      }
    });
    return filtered;
  }, [expensesByCategory, searchQuery]);

  const filteredIncomes = useMemo(() => {
    if (!searchQuery.trim()) return enabledIncomes;
    const query = searchQuery.toLowerCase();
    return enabledIncomes.filter(item => 
      item.name.toLowerCase().includes(query)
    );
  }, [enabledIncomes, searchQuery]);

  // Calculate totals
  const totals = useMemo(() => {
    let incomeTotal = 0;
    let expenseTotal = 0;
    entries.forEach((value, key) => {
      const isIncome = enabledIncomes.some(i => i.id === key);
      if (isIncome) {
        incomeTotal += value;
      } else {
        expenseTotal += value;
      }
    });
    return { income: incomeTotal, expense: expenseTotal };
  }, [entries, enabledIncomes]);

  const entriesCount = useMemo(() => {
    return Array.from(entries.values()).filter(v => v > 0).length;
  }, [entries]);

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const handleValueChange = (itemId: string, value: number) => {
    setEntries(prev => {
      const newEntries = new Map(prev);
      if (value > 0) {
        newEntries.set(itemId, value);
      } else {
        newEntries.delete(itemId);
      }
      return newEntries;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, items: { id: string }[]) => {
    const currentIndex = items.findIndex(item => item.id === itemId);
    
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      // Move to next item
      const nextIndex = currentIndex + 1;
      if (nextIndex < items.length) {
        const nextId = items[nextIndex].id;
        setFocusedItemId(nextId);
        inputRefs.current.get(nextId)?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex + 1;
      if (nextIndex < items.length) {
        const nextId = items[nextIndex].id;
        setFocusedItemId(nextId);
        inputRefs.current.get(nextId)?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        const prevId = items[prevIndex].id;
        setFocusedItemId(prevId);
        inputRefs.current.get(prevId)?.focus();
      }
    }
  };

  const handleSubmit = () => {
    const bulkEntries: BulkEntry[] = [];
    
    entries.forEach((value, itemId) => {
      if (value <= 0) return;
      
      const income = enabledIncomes.find(i => i.id === itemId);
      const expense = enabledExpenses.find(e => e.id === itemId);
      
      if (income) {
        bulkEntries.push({
          itemId,
          name: income.name,
          value,
          type: 'income',
        });
      } else if (expense) {
        bulkEntries.push({
          itemId,
          name: expense.name,
          value,
          type: 'expense',
          category: expense.category,
        });
      }
    });

    if (bulkEntries.length === 0) {
      toast.error('Adicione pelo menos um valor');
      return;
    }

    const referenceMonth = format(selectedMonth, 'yyyy-MM');
    onEntriesAdded(bulkEntries, referenceMonth);
    handleClose();
  };

  const handleClose = () => {
    setEntries(new Map());
    setSearchQuery('');
    setFocusedItemId(null);
    setExpandedCategories(new Set());
    setSelectedMonth(startOfMonth(new Date()));
    setPendingMonthChange(null);
    onOpenChange(false);
  };

  // Month navigation with unsaved changes guard
  const hasUnsavedChanges = entriesCount > 0;

  const handleMonthChange = (newMonth: Date) => {
    if (hasUnsavedChanges) {
      setPendingMonthChange(newMonth);
      setShowDiscardDialog(true);
    } else {
      setSelectedMonth(newMonth);
    }
  };

  const handleDiscardAndChangeMonth = () => {
    if (pendingMonthChange) {
      setEntries(new Map());
      setSelectedMonth(pendingMonthChange);
      setPendingMonthChange(null);
    }
    setShowDiscardDialog(false);
  };

  const handleCancelMonthChange = () => {
    setPendingMonthChange(null);
    setShowDiscardDialog(false);
  };

  const goToPreviousMonth = () => handleMonthChange(subMonths(selectedMonth, 1));
  const goToNextMonth = () => handleMonthChange(addMonths(selectedMonth, 1));

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Get all expense items as flat list for keyboard navigation
  const allExpenseItems = useMemo(() => {
    const items: { id: string }[] = [];
    Object.values(filteredExpenses).forEach(categoryItems => {
      categoryItems.forEach(item => items.push({ id: item.id }));
    });
    return items;
  }, [filteredExpenses]);

  // Auto-expand categories that have search matches
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedCategories(new Set(Object.keys(filteredExpenses)));
    }
  }, [searchQuery, filteredExpenses]);

  const getCategoryIcon = (categoryName: string) => {
    const category = expenseCategories.find(c => c.name === categoryName);
    if (category?.reference.includes('Necessidades')) {
      return <div className="w-2 h-2 rounded-full bg-orange-500" />;
    } else if (category?.reference.includes('Desejos')) {
      return <div className="w-2 h-2 rounded-full bg-purple-500" />;
    }
    return <div className="w-2 h-2 rounded-full bg-muted-foreground" />;
  };

  const getCategoryTotal = (category: string) => {
    const items = expensesByCategory[category] || [];
    return items.reduce((sum, item) => sum + (entries.get(item.id) || 0), 0);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0">
          {/* Month Navigation Header */}
          <div className="flex items-center justify-center px-4 py-3 border-b bg-muted/30 gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToPreviousMonth}
              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium capitalize">
                {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Não salvo
                </Badge>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToNextMonth}
              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Header */}
          <div className="p-6 pb-4 border-b shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Lançamento Rápido
              </DialogTitle>
              <DialogDescription>
                Insira múltiplos lançamentos de forma eficiente. Use Tab ou Enter para navegar.
              </DialogDescription>
            </DialogHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'expense' | 'income')} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Despesas
                {totals.expense > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-expense/10 text-expense">
                    {formatCurrency(totals.expense)}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="income" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Receitas
                {totals.income > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-income/10 text-income">
                    {formatCurrency(totals.income)}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-4">
          {activeTab === 'expense' ? (
            <div className="space-y-2">
              {Object.entries(filteredExpenses).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma despesa encontrada
                </div>
              ) : (
                Object.entries(filteredExpenses).map(([category, items]) => {
                  const isExpanded = expandedCategories.has(category) || searchQuery.trim();
                  const categoryTotal = getCategoryTotal(category);
                  const hasEntries = items.some(item => entries.get(item.id));

                  return (
                    <div key={category} className="rounded-lg border bg-card overflow-hidden">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(category)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors",
                          hasEntries && "bg-accent/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <ChevronRight 
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              isExpanded && "rotate-90"
                            )} 
                          />
                          {getCategoryIcon(category)}
                          <span className="font-medium text-sm">{category}</span>
                          <Badge variant="outline" className="text-xs">
                            {items.length}
                          </Badge>
                        </div>
                        {categoryTotal > 0 && (
                          <Badge className="bg-expense/10 text-expense border-expense/20">
                            {formatCurrency(categoryTotal)}
                          </Badge>
                        )}
                      </button>

                      {/* Category Items */}
                      {isExpanded && (
                        <div className="border-t divide-y">
                          {items.map((item) => {
                            const value = entries.get(item.id) || 0;
                            const hasValue = value > 0;

                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  "flex items-center gap-3 p-3 pl-10 transition-colors",
                                  focusedItemId === item.id && "bg-accent/50",
                                  hasValue && "bg-expense/5"
                                )}
                              >
                                <div className="flex-1 min-w-0">
                                  <span className={cn(
                                    "text-sm truncate block",
                                    hasValue && "font-medium"
                                  )}>
                                    {item.name}
                                  </span>
                                  {item.isRecurring && (
                                    <span className="text-xs text-muted-foreground">Recorrente</span>
                                  )}
                                </div>
                                <div className="w-32 shrink-0">
                                  <CurrencyInput
                                    ref={(el) => inputRefs.current.set(item.id, el)}
                                    value={value}
                                    onChange={(v) => handleValueChange(item.id, v)}
                                    onFocus={() => setFocusedItemId(item.id)}
                                    onKeyDown={(e) => handleKeyDown(e, item.id, allExpenseItems)}
                                    placeholder="0,00"
                                    compact
                                    className="text-right"
                                  />
                                </div>
                                {hasValue && (
                                  <button
                                    onClick={() => handleValueChange(item.id, 0)}
                                    className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredIncomes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma receita encontrada
                </div>
              ) : (
                filteredIncomes.map((item) => {
                  const value = entries.get(item.id) || 0;
                  const hasValue = value > 0;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        focusedItemId === item.id && "bg-accent/50 border-primary/50",
                        hasValue && "bg-income/5 border-income/20"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          "text-sm truncate block",
                          hasValue && "font-medium"
                        )}>
                          {item.name}
                        </span>
                        {item.method === 'gross' && (
                          <span className="text-xs text-muted-foreground">Valor bruto</span>
                        )}
                      </div>
                      <div className="w-32 shrink-0">
                        <CurrencyInput
                          ref={(el) => inputRefs.current.set(item.id, el)}
                          value={value}
                          onChange={(v) => handleValueChange(item.id, v)}
                          onFocus={() => setFocusedItemId(item.id)}
                          onKeyDown={(e) => handleKeyDown(e, item.id, filteredIncomes)}
                          placeholder="0,00"
                          compact
                          className="text-right"
                        />
                      </div>
                      {hasValue && (
                        <button
                          onClick={() => handleValueChange(item.id, 0)}
                          className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm">
              {entriesCount > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{entriesCount}</span>
                    <span className="text-muted-foreground">itens</span>
                  </div>
                  {totals.expense > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-4 w-4 text-expense" />
                      <span className="font-medium text-expense">{formatCurrency(totals.expense)}</span>
                    </div>
                  )}
                  {totals.income > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-income" />
                      <span className="font-medium text-income">{formatCurrency(totals.income)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={entriesCount === 0}
                className="min-w-[140px]"
              >
                <Zap className="h-4 w-4 mr-2" />
                Lançar {entriesCount > 0 ? `(${entriesCount})` : ''}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Discard Changes Dialog */}
    <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
          <AlertDialogDescription>
            Você tem {entriesCount} lançamento(s) não salvo(s). Ao mudar de mês, esses dados serão perdidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelMonthChange}>
            Continuar editando
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleDiscardAndChangeMonth} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Descartar e mudar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
};
