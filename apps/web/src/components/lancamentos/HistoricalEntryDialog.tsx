import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput, CurrencyInputRef } from '@/components/ui/currency-input';
import { Textarea } from '@/components/ui/textarea';
import { useFinancial } from '@/contexts/FinancialContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { expenseCategories } from '@/data/defaultData';
import { 
  TrendingUp, TrendingDown, Check, X, Search, 
  ChevronRight, ChevronLeft, Calendar, History,
  Package, Sparkles, Copy, ClipboardPaste, AlertCircle,
  Save, ArrowUp, ArrowDown, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoricalEntry {
  itemId: string;
  name: string;
  value: number;
  type: 'income' | 'expense';
  category?: string;
  month: string;
}

interface ConflictEntry extends HistoricalEntry {
  existingValue: number;
}

interface HistoricalEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntriesAdded: (entries: HistoricalEntry[]) => void;
}

interface SelectedItem {
  id: string;
  name: string;
  type: 'income' | 'expense';
  category?: string;
}

interface ItemNavigation {
  prev: SelectedItem | null;
  next: SelectedItem | null;
}

const generateMonthOptions = (monthsBack: number = 24) => {
  const months: { value: string; label: string; shortLabel: string }[] = [];
  const today = new Date();
  
  for (let i = 0; i < monthsBack; i++) {
    const date = subMonths(startOfMonth(today), i);
    months.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      shortLabel: format(date, "MMM/yy", { locale: ptBR }),
    });
  }
  
  return months;
};

export const HistoricalEntryDialog: React.FC<HistoricalEntryDialogProps> = ({
  open,
  onOpenChange,
  onEntriesAdded,
}) => {
  const { config, getMonthlyEntry } = useFinancial();
  const { isHidden } = useVisibility();
  const [step, setStep] = useState<'select-item' | 'enter-months' | 'confirm-conflicts' | 'review'>('select-item');
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [searchQuery, setSearchQuery] = useState('');
  const [monthValues, setMonthValues] = useState<Map<string, number>>(new Map());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [allEntries, setAllEntries] = useState<HistoricalEntry[]>([]);
  const allEntriesRef = useRef<HistoricalEntry[]>([]);
  const [pasteValue, setPasteValue] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [conflictEntries, setConflictEntries] = useState<ConflictEntry[]>([]);
  const [pendingEntriesToSave, setPendingEntriesToSave] = useState<HistoricalEntry[]>([]);
  
  // Date range selection
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');
  
  const inputRefs = useRef<Map<string, CurrencyInputRef | null>>(new Map());

  const allMonthOptions = useMemo(() => generateMonthOptions(24), []);

  // Initialize default range (last 6 months)
  useEffect(() => {
    if (open && !startMonth && !endMonth) {
      setStartMonth(allMonthOptions[5]?.value || '');
      setEndMonth(allMonthOptions[0]?.value || '');
    }
  }, [open, allMonthOptions]);

  // Filtered months based on range
  const monthOptions = useMemo(() => {
    if (!startMonth || !endMonth) return allMonthOptions.slice(0, 6);
    
    const startIndex = allMonthOptions.findIndex(m => m.value === startMonth);
    const endIndex = allMonthOptions.findIndex(m => m.value === endMonth);
    
    if (startIndex === -1 || endIndex === -1) return allMonthOptions.slice(0, 6);
    
    // startMonth is older (higher index), endMonth is newer (lower index)
    const fromIndex = Math.min(startIndex, endIndex);
    const toIndex = Math.max(startIndex, endIndex);
    
    return allMonthOptions.slice(fromIndex, toIndex + 1);
  }, [allMonthOptions, startMonth, endMonth]);

  const enabledIncomes = useMemo(() => 
    config.incomeItems.filter(i => i.enabled),
    [config.incomeItems]
  );

  const enabledExpenses = useMemo(() => 
    config.expenseItems.filter(e => e.enabled),
    [config.expenseItems]
  );

  const expensesByCategory = useMemo(() => {
    const groups: Record<string, typeof enabledExpenses> = {};
    enabledExpenses.forEach(expense => {
      const category = expense.category || 'Outros';
      if (!groups[category]) groups[category] = [];
      groups[category].push(expense);
    });
    return groups;
  }, [enabledExpenses]);

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

  // Get all items as flat list for navigation
  const allItemsList = useMemo(() => {
    const items: SelectedItem[] = [];
    
    // Add all expenses by category
    Object.entries(expensesByCategory).forEach(([category, categoryItems]) => {
      categoryItems.forEach(item => {
        items.push({
          id: item.id,
          name: item.name,
          type: 'expense',
          category: item.category,
        });
      });
    });
    
    // Add all incomes
    enabledIncomes.forEach(item => {
      items.push({
        id: item.id,
        name: item.name,
        type: 'income',
      });
    });
    
    return items;
  }, [expensesByCategory, enabledIncomes]);

  // Get navigation for current item
  const itemNavigation = useMemo((): ItemNavigation => {
    if (!selectedItem) return { prev: null, next: null };
    
    const currentIndex = allItemsList.findIndex(item => item.id === selectedItem.id);
    
    return {
      prev: currentIndex > 0 ? allItemsList[currentIndex - 1] : null,
      next: currentIndex < allItemsList.length - 1 ? allItemsList[currentIndex + 1] : null,
    };
  }, [selectedItem, allItemsList]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedCategories(new Set(Object.keys(filteredExpenses)));
    }
  }, [searchQuery, filteredExpenses]);

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const parseNumber = (str: string): number => {
    let cleaned = str.trim();
    cleaned = cleaned.replace(/[R$\s]/g, '');
    
    if (cleaned.includes(',')) {
      if (cleaned.indexOf(',') > cleaned.lastIndexOf('.')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        cleaned = cleaned.replace(/,/g, '');
      }
    }
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.abs(num);
  };

  const handlePasteData = () => {
    if (!pasteValue.trim()) {
      toast.error('Cole os dados da planilha primeiro');
      return;
    }

    // Preserve empty cells to keep month alignment (Excel often has blanks/zeros)
    const rows = pasteValue.trimEnd().split(/\r?\n/);
    const flatCells = rows.flatMap(r => r.split('\t'));

    // Map in chronological order: oldest -> newest
    const monthsForPaste = [...monthOptions].reverse();

    const newMonthValues = new Map<string, number>();
    let hasAnyValue = false;

    flatCells.forEach((cell, index) => {
      if (index >= monthsForPaste.length) return;
      const value = parseNumber(cell);
      if (value > 0) {
        hasAnyValue = true;
        newMonthValues.set(monthsForPaste[index].value, value);
      }
    });

    if (!hasAnyValue) {
      toast.error('Nenhum valor válido encontrado');
      return;
    }

    setMonthValues(newMonthValues);
    setShowPasteArea(false);
    setPasteValue('');
    toast.success(`${newMonthValues.size} valor(es) importado(s)`);
  };

  const saveCurrentItemEntries = () => {
    if (!selectedItem) return;

    const newEntries: HistoricalEntry[] = [];
    monthValues.forEach((value, month) => {
      if (value > 0) {
        newEntries.push({
          itemId: selectedItem.id,
          name: selectedItem.name,
          value,
          type: selectedItem.type,
          category: selectedItem.category,
          month,
        });
      }
    });

    const base = allEntriesRef.current;
    const filtered = base.filter(e => e.itemId !== selectedItem.id);
    const next = [...filtered, ...newEntries];

    allEntriesRef.current = next;
    setAllEntries(next);

    toast.success(`Valores de "${selectedItem.name}" salvos`);
  };

  const handleSelectItem = (item: SelectedItem) => {
    // Save current item before switching
    if (selectedItem) {
      saveCurrentItemEntries();
    }

    setSelectedItem(item);
    setActiveTab(item.type);

    // Load existing entries for this item (use ref to avoid missing recent saves)
    const existingEntries = allEntriesRef.current.filter(e => e.itemId === item.id);
    const newMap = new Map<string, number>();
    existingEntries.forEach(entry => {
      newMap.set(entry.month, entry.value);
    });
    setMonthValues(newMap);

    setShowPasteArea(false);
    setPasteValue('');
    setStep('enter-months');
  };

  const navigateToItem = (item: SelectedItem) => {
    handleSelectItem(item);
  };

  const handleMonthValueChange = (month: string, value: number) => {
    setMonthValues(prev => {
      const newMap = new Map(prev);
      if (value > 0) {
        newMap.set(month, value);
      } else {
        newMap.delete(month);
      }
      return newMap;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentMonth: string) => {
    const currentIndex = monthOptions.findIndex(m => m.value === currentMonth);
    
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const nextIndex = currentIndex + 1;
      if (nextIndex < monthOptions.length) {
        const nextMonth = monthOptions[nextIndex].value;
        inputRefs.current.get(nextMonth)?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex + 1;
      if (nextIndex < monthOptions.length) {
        const nextMonth = monthOptions[nextIndex].value;
        inputRefs.current.get(nextMonth)?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        const prevMonth = monthOptions[prevIndex].value;
        inputRefs.current.get(prevMonth)?.focus();
      }
    }
  };

  const copyValueToAll = () => {
    const firstValue = monthValues.values().next().value;
    if (firstValue && firstValue > 0) {
      const newMap = new Map<string, number>();
      monthOptions.forEach(month => {
        newMap.set(month.value, firstValue);
      });
      setMonthValues(newMap);
      toast.success('Valor copiado para todos os meses');
    } else {
      toast.info('Insira um valor primeiro');
    }
  };

  const checkForConflicts = (entries: HistoricalEntry[]): ConflictEntry[] => {
    const conflicts: ConflictEntry[] = [];
    
    entries.forEach(entry => {
      const existingValue = getMonthlyEntry(entry.month, entry.itemId, entry.type);
      if (existingValue > 0 && existingValue !== entry.value) {
        conflicts.push({
          ...entry,
          existingValue,
        });
      }
    });
    
    return conflicts;
  };

  const handleSaveAndClose = () => {
    // Save current item first (keeps ref up-to-date)
    if (selectedItem) {
      saveCurrentItemEntries();
    }

    // Always use ref (state updates may not be flushed yet)
    const finalEntries = [...allEntriesRef.current];

    if (finalEntries.length === 0) {
      toast.error('Adicione pelo menos um lançamento');
      return;
    }

    // Check for conflicts
    const conflicts = checkForConflicts(finalEntries);

    if (conflicts.length > 0) {
      setConflictEntries(conflicts);
      setPendingEntriesToSave(finalEntries);
      setStep('confirm-conflicts');
    } else {
      onEntriesAdded(finalEntries);
      handleClose();
    }
  };

  const confirmSaveWithConflicts = () => {
    onEntriesAdded(pendingEntriesToSave);
    handleClose();
  };

  const hasUnsavedChanges = () => {
    return allEntriesRef.current.length > 0 || monthValues.size > 0;
  };

  const handleAttemptClose = () => {
    if (hasUnsavedChanges()) {
      setShowDiscardDialog(true);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setStep('select-item');
    setSelectedItem(null);
    setMonthValues(new Map());
    setSearchQuery('');
    setExpandedCategories(new Set());
    setAllEntries([]);
    allEntriesRef.current = [];
    setShowPasteArea(false);
    setPasteValue('');
    setShowDiscardDialog(false);
    setConflictEntries([]);
    setPendingEntriesToSave([]);
    setStartMonth('');
    setEndMonth('');
    onOpenChange(false);
  };

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

  const getCategoryIcon = (categoryName: string) => {
    const category = expenseCategories.find(c => c.name === categoryName);
    if (category?.reference.includes('Necessidades')) {
      return <div className="w-2 h-2 rounded-full bg-orange-500" />;
    } else if (category?.reference.includes('Desejos')) {
      return <div className="w-2 h-2 rounded-full bg-purple-500" />;
    }
    return <div className="w-2 h-2 rounded-full bg-muted-foreground" />;
  };

  const getItemEntriesCount = (itemId: string) => {
    return allEntries.filter(e => e.itemId === itemId).length;
  };

  const currentMonthTotal = useMemo(() => {
    let total = 0;
    monthValues.forEach(value => { total += value; });
    return total;
  }, [monthValues]);

  const grandTotals = useMemo(() => {
    let income = 0, expense = 0;
    allEntries.forEach(entry => {
      if (entry.type === 'income') {
        income += entry.value;
      } else {
        expense += entry.value;
      }
    });
    return { income, expense, count: allEntries.length };
  }, [allEntries]);

  const removeEntry = (index: number) => {
    setAllEntries(prev => prev.filter((_, i) => i !== index));
  };

  const goBackToItemList = () => {
    if (selectedItem && monthValues.size > 0) {
      saveCurrentItemEntries();
    }
    setSelectedItem(null);
    setMonthValues(new Map());
    setShowPasteArea(false);
    setPasteValue('');
    setStep('select-item');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleAttemptClose}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="p-6 pb-4 border-b shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Lançamento Histórico
              </DialogTitle>
              <DialogDescription>
                {step === 'select-item' && 'Selecione um item para inserir valores em múltiplos meses.'}
                {step === 'enter-months' && `Insira os valores mensais para "${selectedItem?.name}"`}
                {step === 'confirm-conflicts' && 'Confirme a atualização dos dados existentes.'}
                {step === 'review' && 'Revise todos os lançamentos antes de finalizar.'}
              </DialogDescription>
            </DialogHeader>

            {/* Accumulated entries badge */}
            {allEntries.length > 0 && step !== 'review' && step !== 'confirm-conflicts' && (
              <div className="flex items-center gap-2 mt-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <Package className="h-3 w-3 mr-1" />
                  {allEntries.length} lançamento(s) pendente(s)
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    if (selectedItem && monthValues.size > 0) {
                      saveCurrentItemEntries();
                    }
                    setStep('review');
                  }}
                  className="text-xs"
                >
                  Revisar
                </Button>
              </div>
            )}
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            {/* Step 1: Select Item */}
            {step === 'select-item' && (
              <div className="p-4 space-y-4">
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'expense' | 'income')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="expense" className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Despesas
                    </TabsTrigger>
                    <TabsTrigger value="income" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Receitas
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Items List */}
                {activeTab === 'expense' ? (
                  <div className="space-y-2">
                    {Object.entries(filteredExpenses).map(([category, items]) => {
                      const isExpanded = expandedCategories.has(category) || searchQuery.trim();

                      return (
                        <div key={category} className="rounded-lg border bg-card overflow-hidden">
                          <button
                            onClick={() => toggleCategory(category)}
                            className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
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
                          </button>

                          {isExpanded && (
                            <div className="border-t divide-y">
                              {items.map((item) => {
                                const entriesCount = getItemEntriesCount(item.id);

                                return (
                                  <button
                                    key={item.id}
                                    onClick={() => handleSelectItem({
                                      id: item.id,
                                      name: item.name,
                                      type: 'expense',
                                      category: item.category,
                                    })}
                                    className={cn(
                                      "w-full flex items-center justify-between gap-3 p-3 pl-10 hover:bg-accent/50 transition-colors text-left",
                                      entriesCount > 0 && "bg-expense/5"
                                    )}
                                  >
                                    <span className="text-sm">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                      {entriesCount > 0 && (
                                        <Badge variant="secondary" className="text-xs bg-expense/10 text-expense">
                                          {entriesCount} mês(es)
                                        </Badge>
                                      )}
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredIncomes.map((item) => {
                      const entriesCount = getItemEntriesCount(item.id);

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectItem({
                            id: item.id,
                            name: item.name,
                            type: 'income',
                          })}
                          className={cn(
                            "w-full flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left",
                            entriesCount > 0 && "bg-income/5 border-income/20"
                          )}
                        >
                          <span className="text-sm">{item.name}</span>
                          <div className="flex items-center gap-2">
                            {entriesCount > 0 && (
                              <Badge variant="secondary" className="text-xs bg-income/10 text-income">
                                {entriesCount} mês(es)
                              </Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Enter Month Values */}
            {step === 'enter-months' && selectedItem && (
              <div className="p-4 space-y-4">
                {/* Item Navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => itemNavigation.prev && navigateToItem(itemNavigation.prev)}
                    disabled={!itemNavigation.prev}
                    className="flex-1"
                  >
                    <ArrowUp className="h-4 w-4 mr-1" />
                    {itemNavigation.prev?.name ? (
                      <span className="truncate max-w-[100px]">{itemNavigation.prev.name}</span>
                    ) : 'Anterior'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => itemNavigation.next && navigateToItem(itemNavigation.next)}
                    disabled={!itemNavigation.next}
                    className="flex-1"
                  >
                    {itemNavigation.next?.name ? (
                      <span className="truncate max-w-[100px]">{itemNavigation.next.name}</span>
                    ) : 'Próximo'}
                    <ArrowDown className="h-4 w-4 ml-1" />
                  </Button>
                </div>

                {/* Selected Item Header */}
                <div className={cn(
                  "rounded-lg p-4 border-2",
                  selectedItem.type === 'income' 
                    ? "bg-income/5 border-income/30" 
                    : "bg-expense/5 border-expense/30"
                )}>
                  <div className="flex items-center gap-3">
                    {selectedItem.type === 'income' ? (
                      <TrendingUp className="h-5 w-5 text-income" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-expense" />
                    )}
                    <div>
                      <p className="font-semibold">{selectedItem.name}</p>
                      {selectedItem.category && (
                        <p className="text-xs text-muted-foreground">{selectedItem.category}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Date Range Selector */}
                <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    Intervalo de meses
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={startMonth} onValueChange={setStartMonth}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="De" />
                      </SelectTrigger>
                      <SelectContent>
                        {allMonthOptions.map(month => (
                          <SelectItem key={month.value} value={month.value}>
                            <span className="capitalize">{month.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">até</span>
                    <Select value={endMonth} onValueChange={setEndMonth}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Até" />
                      </SelectTrigger>
                      <SelectContent>
                        {allMonthOptions.map(month => (
                          <SelectItem key={month.value} value={month.value}>
                            <span className="capitalize">{month.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {monthOptions.length} mês(es) selecionado(s)
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copyValueToAll}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar para todos
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowPasteArea(!showPasteArea)}
                    className={cn("flex-1", showPasteArea && "bg-accent")}
                  >
                    <ClipboardPaste className="h-4 w-4 mr-2" />
                    Colar do Excel
                  </Button>
                </div>

                {/* Paste Area */}
                {showPasteArea && (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Copie uma coluna de valores do Excel ou Google Sheets e cole abaixo. 
                        Os valores serão distribuídos nos meses na ordem exibida (do mais recente ao mais antigo).
                      </p>
                    </div>
                    <Textarea
                      placeholder="Cole os valores aqui (um por linha ou separados por tab)..."
                      value={pasteValue}
                      onChange={(e) => setPasteValue(e.target.value)}
                      className="min-h-[100px] font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={handlePasteData}
                        disabled={!pasteValue.trim()}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Aplicar valores
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setShowPasteArea(false);
                          setPasteValue('');
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Month List */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Insira os valores para cada mês. Use Tab ou Enter para navegar.
                  </p>
                  
                  {monthOptions.map((month, index) => {
                    const value = monthValues.get(month.value) || 0;
                    const hasValue = value > 0;
                    const existingValue = getMonthlyEntry(month.value, selectedItem.id, selectedItem.type);
                    const hasConflict = existingValue > 0 && hasValue && existingValue !== value;

                    return (
                      <div
                        key={month.value}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          hasConflict && "border-yellow-500/50 bg-yellow-500/5",
                          !hasConflict && hasValue && (selectedItem.type === 'income' 
                            ? "bg-income/5 border-income/20" 
                            : "bg-expense/5 border-expense/20")
                        )}
                      >
                        <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                          <Calendar className="h-4 w-4" />
                          <span className="text-xs w-5 text-center">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            "text-sm capitalize block truncate",
                            hasValue && "font-medium"
                          )}>
                            {month.label}
                          </span>
                          {existingValue > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Atual: {formatCurrency(existingValue)}
                              {hasConflict && (
                                <AlertTriangle className="h-3 w-3 inline ml-1 text-yellow-500" />
                              )}
                            </span>
                          )}
                        </div>
                        <div className="w-32 shrink-0">
                          <CurrencyInput
                            ref={(el) => inputRefs.current.set(month.value, el)}
                            value={value}
                            onChange={(v) => handleMonthValueChange(month.value, v)}
                            onKeyDown={(e) => handleKeyDown(e, month.value)}
                            placeholder="0,00"
                            compact
                            className="text-right"
                          />
                        </div>
                        {hasValue && (
                          <button
                            onClick={() => handleMonthValueChange(month.value, 0)}
                            className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Conflict Confirmation */}
            {step === 'confirm-conflicts' && conflictEntries.length > 0 && (
              <div className="p-6 space-y-6">
                <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-600">Dados existentes encontrados</p>
                    <p className="text-muted-foreground mt-1">
                      Os seguintes lançamentos já possuem valores cadastrados. Confirme para substituí-los pelos novos valores.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-auto">
                  {conflictEntries.map((entry, index) => (
                    <div 
                      key={index}
                      className="p-4 border rounded-lg bg-card"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {entry.type === 'income' ? (
                            <TrendingUp className="h-4 w-4 text-income" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-expense" />
                          )}
                          <span className="font-medium text-sm">{entry.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">
                          {allMonthOptions.find(m => m.value === entry.month)?.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Atual:</span>
                          <span className="line-through">{formatCurrency(entry.existingValue)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Novo:</span>
                          <span className={cn(
                            "font-medium",
                            entry.type === 'income' ? "text-income" : "text-expense"
                          )}>
                            {formatCurrency(entry.value)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Total de {pendingEntriesToSave.length} lançamento(s), sendo {conflictEntries.length} com conflito.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 'review' && (
              <div className="p-6 space-y-6">
                {allEntries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum lançamento adicionado ainda.</p>
                    <Button 
                      variant="outline" 
                      onClick={() => setStep('select-item')}
                      className="mt-4"
                    >
                      Adicionar lançamentos
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold">{grandTotals.count}</p>
                        <p className="text-xs text-muted-foreground">Lançamentos</p>
                      </div>
                      <div className="bg-income/10 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-income">{formatCurrency(grandTotals.income)}</p>
                        <p className="text-xs text-muted-foreground">Total Receitas</p>
                      </div>
                      <div className="bg-expense/10 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-expense">{formatCurrency(grandTotals.expense)}</p>
                        <p className="text-xs text-muted-foreground">Total Despesas</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {allEntries.map((entry, index) => (
                        <div 
                          key={index}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border",
                            entry.type === 'income' ? "bg-income/5 border-income/20" : "bg-expense/5 border-expense/20"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {entry.type === 'income' ? (
                              <TrendingUp className="h-4 w-4 text-income shrink-0" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-expense shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{entry.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {allMonthOptions.find(m => m.value === entry.month)?.label}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={cn(
                              "font-medium",
                              entry.type === 'income' ? "text-income" : "text-expense"
                            )}>
                              {formatCurrency(entry.value)}
                            </span>
                            <button
                              onClick={() => removeEntry(index)}
                              className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button 
                      variant="outline" 
                      onClick={() => setStep('select-item')}
                      className="w-full"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Adicionar mais itens
                    </Button>
                  </>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t bg-muted/30 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-sm">
                {step === 'enter-months' && currentMonthTotal > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Total:</span>
                    <span className={cn(
                      "font-medium",
                      selectedItem?.type === 'income' ? "text-income" : "text-expense"
                    )}>
                      {formatCurrency(currentMonthTotal)}
                    </span>
                    <span className="text-muted-foreground">
                      ({monthValues.size} mês{monthValues.size !== 1 ? 'es' : ''})
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {step === 'select-item' && (
                  <>
                    <Button variant="outline" onClick={handleAttemptClose}>
                      Fechar
                    </Button>
                    {allEntries.length > 0 && (
                      <Button onClick={handleSaveAndClose}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar e Fechar
                      </Button>
                    )}
                  </>
                )}
                {step === 'enter-months' && (
                  <>
                    <Button variant="outline" onClick={goBackToItemList}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Voltar
                    </Button>
                    <Button onClick={handleSaveAndClose}>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar e Fechar
                    </Button>
                  </>
                )}
                {step === 'confirm-conflicts' && (
                  <>
                    <Button variant="outline" onClick={() => setStep('enter-months')}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Voltar
                    </Button>
                    <Button onClick={confirmSaveWithConflicts}>
                      <Check className="h-4 w-4 mr-2" />
                      Confirmar Atualização
                    </Button>
                  </>
                )}
                {step === 'review' && (
                  <>
                    <Button variant="outline" onClick={() => setStep('select-item')}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Adicionar mais
                    </Button>
                    <Button 
                      onClick={handleSaveAndClose}
                      disabled={allEntries.length === 0}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salvar e Fechar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discard Confirmation Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem {allEntries.length + (monthValues.size > 0 ? monthValues.size : 0)} lançamento(s) não salvos. 
              Deseja descartar todas as alterações ou salvar antes de fechar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={handleClose}>
              Descartar
            </Button>
            <Button onClick={() => {
              setShowDiscardDialog(false);
              handleSaveAndClose();
            }}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
