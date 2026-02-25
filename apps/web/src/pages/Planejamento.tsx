import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useFinancial } from '@/contexts/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Button } from '@/components/ui/button';

import { 
  TrendingUp, 
  TrendingDown,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Plus,
  Target,
  History,
  CheckCircle2,
  Edit2,
  Save,
  X,
  CreditCard,
  Banknote,
  Wallet,
  QrCode,
  Check,
  Filter,
  AlertTriangle,
  Info,
  Calculator,
  RefreshCw,
  Pencil,
  Layers,
  Maximize2,
  Minimize2,
  ChevronsUpDown,
  LayoutDashboard,
  CircleDot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentMethod, IncomeItem, ExpenseItem } from '@/types/financial';
import { paymentMethods, expenseCategories } from '@/data/defaultData';
import { toast } from 'sonner';

import { useMonthNavigation } from '@/hooks/useMonthNavigation';
import { useLancamentosRealizados, LancamentoInput } from '@/hooks/useLancamentosRealizados';
import { MetasDoMesTab } from '@/components/planejamento/MetasDoMesTab';
import { ConsolidacaoMensalDialog } from '@/components/planejamento/ConsolidacaoMensalDialog';
import { HistoricoLancamentosDrawer } from '@/components/planejamento/HistoricoLancamentosDrawer';
import { ProjectionConfigPopover } from '@/components/planejamento/ProjectionConfigPopover';
import { ProjectionImpactDialog } from '@/components/planejamento/ProjectionImpactDialog';
import { ProjectionEditDialog, ProjectionEditAction } from '@/components/planejamento/ProjectionEditDialog';
import { FilterDialog } from '@/components/planejamento/FilterDialog';
import { GroupingDialog, GroupingVariable } from '@/components/planejamento/GroupingDialog';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProjectionCalculator } from '@/hooks/useProjectionCalculator';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MonthlyOverviewTable } from '@/components/planejamento/MonthlyOverviewTable';
import { DashboardChartsSection, MonthlyPlanChart } from '@/components/planejamento/DashboardChartsSection';
import { GoalsSummaryCard } from '@/components/planejamento/GoalsSummaryCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGoalsProjectionIntegration } from '@/hooks/useGoalsProjectionIntegration';

// ID do item de ajuste do cartão de crédito
const CREDIT_CARD_ADJUSTMENT_ITEM_ID = 'e_cc_adjust';

// Formato contábil: 1.234.567 (ponto como separador de milhar)
const formatAccounting = (value: number): string => {
  if (value === 0) return '-';
  const formatted = Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return value < 0 ? `(${formatted})` : formatted;
};

const formatCurrencyBase = (value: number) => {
  if (value === 0) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatMonthLabel = (month: string) => {
  const [year, monthNum] = month.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(monthNum) - 1]}/${year.slice(2)}`;
};

const generateMonths = (startYear: number, numMonths: number = 24): string[] => {
  const months: string[] = [];
  const startDate = new Date(startYear, 0, 1);
  
  for (let i = 0; i < numMonths; i++) {
    const date = new Date(startDate);
    date.setMonth(startDate.getMonth() + i);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push(month);
  }
  
  return months;
};

// Payment method icon helper
const getPaymentIcon = (method: PaymentMethod) => {
  switch (method) {
    case 'pix':
      return <QrCode className="h-3 w-3" />;
    case 'credit_card':
      return <CreditCard className="h-3 w-3" />;
    case 'debit_card':
      return <Wallet className="h-3 w-3" />;
    case 'boleto':
    case 'cash':
      return <Banknote className="h-3 w-3" />;
    default:
      return <CreditCard className="h-3 w-3" />;
  }
};

const VisaoMensalTab: React.FC = () => {
  const { 
    config, 
    updateMonthlyEntry, 
    updateMonthlyEntries,
    getMonthlyEntry, 
    isEntryManualOverride,
    addIncomeItem, 
    addExpenseItem, 
    updateIncomeItem, 
    updateExpenseItem 
  } = useFinancial();
  const { isHidden } = useVisibility();
  const isMobile = useIsMobile();
  const formatCurrency = (value: number) => {
    if (value === 0) return '-';
    if (isHidden) return '••••••';
    return formatCurrencyBase(value);
  };
  
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedPaymentMethods, setExpandedPaymentMethods] = useState<Record<string, boolean>>({});
  const [incomeExpanded, setIncomeExpanded] = useState(true);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, number>>(new Map());

  // Cell selection state
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; monthIndex: number; type: 'income' | 'expense' } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Row config popover state (for mobile/tablet: tap to reveal settings icon)
  const [activeConfigRowId, setActiveConfigRowId] = useState<string | null>(null);

  // Dialog states
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [newIncomeName, setNewIncomeName] = useState('');
  const [newExpense, setNewExpense] = useState({
    name: '',
    categoryId: '',
    paymentMethod: 'credit_card' as PaymentMethod,
  });

  // Consolidação states
  const [consolidacaoDialogOpen, setConsolidacaoDialogOpen] = useState(false);
  const [consolidacaoMes, setConsolidacaoMes] = useState<string>('');
  const [historicoDrawerOpen, setHistoricoDrawerOpen] = useState(false);

  // Date filter states
  const [filterStartMonth, setFilterStartMonth] = useState<string>('');
  const [filterEndMonth, setFilterEndMonth] = useState<string>('');
  const [filterResponsible, setFilterResponsible] = useState<string>('all');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  // Grouping configuration states
  const [groupLevel1, setGroupLevel1] = useState<GroupingVariable>('paymentMethod');
  const [groupLevel2, setGroupLevel2] = useState<GroupingVariable>('category');
  const [groupingDialogOpen, setGroupingDialogOpen] = useState(false);

  // Manual credit card total states
  const [manualCreditCardTotals, setManualCreditCardTotals] = useState<Record<string, number>>({});
  const [editingCreditCardMonth, setEditingCreditCardMonth] = useState<string | null>(null);

  // Projection states
  const [projectionDialogOpen, setProjectionDialogOpen] = useState(false);
  const [projectionScope, setProjectionScope] = useState<'all' | 'month' | 'cell'>('all');
  const [projectionTargetMonth, setProjectionTargetMonth] = useState<string | undefined>();
  const [projectionTargetItemId, setProjectionTargetItemId] = useState<string | undefined>();
  const [projectionTargetType, setProjectionTargetType] = useState<'income' | 'expense' | undefined>();
  
  // Projection edit dialog states
  const [projectionEditDialogOpen, setProjectionEditDialogOpen] = useState(false);
  const [projectionEditCells, setProjectionEditCells] = useState<Array<{ month: string; itemId: string; type: 'income' | 'expense'; value: number }>>([]);
  
  const { 
    lancamentos, 
    loading: lancamentosLoading,
    addMultipleLancamentos, 
    deleteLancamento,
    isMonthConsolidated 
  } = useLancamentosRealizados();

  // Goals projection integration
  const goalsIntegration = useGoalsProjectionIntegration();

  const handleAddIncome = () => {
    if (newIncomeName.trim()) {
      addIncomeItem({
        name: newIncomeName.trim(),
        enabled: true,
        method: 'net',
      });
      setNewIncomeName('');
      setIncomeDialogOpen(false);
      toast.success('Receita adicionada! Acesse Parâmetros para mais configurações.');
    }
  };

  const handleAddExpense = () => {
    if (newExpense.name.trim() && newExpense.categoryId) {
      const category = expenseCategories.find(c => c.id === newExpense.categoryId);
      addExpenseItem({
        name: newExpense.name.trim(),
        categoryId: newExpense.categoryId,
        category: category?.name || '',
        expenseType: 'variable_non_essential',
        enabled: true,
        isRecurring: false,
        paymentMethod: newExpense.paymentMethod,
      });
      setNewExpense({ name: '', categoryId: '', paymentMethod: 'credit_card' });
      setExpenseDialogOpen(false);
      toast.success('Despesa adicionada! Acesse Parâmetros para mais configurações.');
    }
  };
  
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const allMonths = useMemo(() => generateMonths(2025, 24), []);

  // Filtered months based on date filter
  const filteredMonths = useMemo(() => {
    let filtered = allMonths;
    const startMonth = filterStartMonth && filterStartMonth !== 'all' ? filterStartMonth : null;
    const endMonth = filterEndMonth && filterEndMonth !== 'all' ? filterEndMonth : null;
    
    if (startMonth) {
      filtered = filtered.filter(m => m >= startMonth);
    }
    if (endMonth) {
      filtered = filtered.filter(m => m <= endMonth);
    }
    return filtered;
  }, [allMonths, filterStartMonth, filterEndMonth]);
  
  // Hook de navegação com scroll
  const monthNav = useMonthNavigation({ allMonths: filteredMonths, currentMonth });
  
  const enabledIncomeItems = config.incomeItems.filter(item => item.enabled);
  const enabledExpenseItems = config.expenseItems.filter(item => item.enabled);

  // Filter expense items by responsible person
  const filteredExpenseItems = useMemo(() => {
    if (filterResponsible === 'all') return enabledExpenseItems;
    if (filterResponsible === 'unassigned') {
      return enabledExpenseItems.filter(item => !item.responsiblePersonId);
    }
    return enabledExpenseItems.filter(item => item.responsiblePersonId === filterResponsible);
  }, [enabledExpenseItems, filterResponsible]);

  // Helper to get person name by ID
  const getPersonName = useCallback((personId: string | undefined): string => {
    if (!personId) return 'Sem responsável';
    return config.sharedWith.find(p => p.id === personId)?.name || 'Desconhecido';
  }, [config.sharedWith]);

  // Dynamic grouping for expenses based on groupLevel1 and groupLevel2
  const groupedExpenses = useMemo(() => {
    const getLevel1Key = (item: ExpenseItem): string => {
      switch (groupLevel1) {
        case 'paymentMethod': return item.paymentMethod || 'other';
        case 'category': return item.category;
        case 'responsible': return item.responsiblePersonId || 'unassigned';
        default: return 'all';
      }
    };

    const getLevel2Key = (item: ExpenseItem): string => {
      switch (groupLevel2) {
        case 'paymentMethod': return item.paymentMethod || 'other';
        case 'category': return item.category;
        case 'responsible': return item.responsiblePersonId || 'unassigned';
        default: return 'all';
      }
    };

    const grouped: Record<string, Record<string, ExpenseItem[]>> = {};
    filteredExpenseItems.forEach(item => {
      const level1Key = getLevel1Key(item);
      const level2Key = getLevel2Key(item);

      if (!grouped[level1Key]) {
        grouped[level1Key] = {};
      }
      if (!grouped[level1Key][level2Key]) {
        grouped[level1Key][level2Key] = [];
      }
      grouped[level1Key][level2Key].push(item);
    });
    return grouped;
  }, [filteredExpenseItems, groupLevel1, groupLevel2]);

  // Labels for grouping levels
  const getGroupLabel = useCallback((variable: GroupingVariable, key: string): string => {
    switch (variable) {
      case 'paymentMethod':
        return paymentMethodLabels[key] || key;
      case 'category':
        return key;
      case 'responsible':
        return key === 'unassigned' ? 'Sem responsável' : getPersonName(key);
      default:
        return 'Todos';
    }
  }, [getPersonName]);

  // Expanded states for dynamic grouping
  const [expandedLevel1, setExpandedLevel1] = useState<Record<string, boolean>>({});
  const [expandedLevel2, setExpandedLevel2] = useState<Record<string, boolean>>({});

  const toggleLevel1 = (key: string) => {
    setExpandedLevel1(prev => ({ ...prev, [key]: prev[key] === false ? true : false }));
  };

  const toggleLevel2 = (key: string) => {
    setExpandedLevel2(prev => ({ ...prev, [key]: prev[key] === false ? true : false }));
  };

  // Expand/Collapse all functions
  const expandToLevel1 = useCallback(() => {
    // Expand level 1, collapse level 2
    const newLevel1: Record<string, boolean> = {};
    const newLevel2: Record<string, boolean> = {};
    Object.keys(groupedExpenses).forEach(key => {
      newLevel1[key] = true;
    });
    Object.keys(groupedExpenses).forEach(level1Key => {
      Object.keys(groupedExpenses[level1Key]).forEach(level2Key => {
        newLevel2[`${level1Key}-${level2Key}`] = false;
      });
    });
    setExpandedLevel1(newLevel1);
    setExpandedLevel2(newLevel2);
  }, [groupedExpenses]);

  const expandToLevel2 = useCallback(() => {
    // Expand both levels, but not items (items are always shown when level2 expanded)
    const newLevel1: Record<string, boolean> = {};
    const newLevel2: Record<string, boolean> = {};
    Object.keys(groupedExpenses).forEach(key => {
      newLevel1[key] = true;
    });
    Object.keys(groupedExpenses).forEach(level1Key => {
      Object.keys(groupedExpenses[level1Key]).forEach(level2Key => {
        newLevel2[`${level1Key}-${level2Key}`] = true;
      });
    });
    setExpandedLevel1(newLevel1);
    setExpandedLevel2(newLevel2);
  }, [groupedExpenses]);

  const expandAll = useCallback(() => {
    const newLevel1: Record<string, boolean> = {};
    const newLevel2: Record<string, boolean> = {};
    Object.keys(groupedExpenses).forEach(key => {
      newLevel1[key] = true;
    });
    Object.keys(groupedExpenses).forEach(level1Key => {
      Object.keys(groupedExpenses[level1Key]).forEach(level2Key => {
        newLevel2[`${level1Key}-${level2Key}`] = true;
      });
    });
    setExpandedLevel1(newLevel1);
    setExpandedLevel2(newLevel2);
  }, [groupedExpenses]);

  const collapseAll = useCallback(() => {
    const newLevel1: Record<string, boolean> = {};
    Object.keys(groupedExpenses).forEach(key => {
      newLevel1[key] = false;
    });
    setExpandedLevel1(newLevel1);
    setExpandedLevel2({});
  }, [groupedExpenses]);

  // Projection calculator hook
  const projectionCalculator = useProjectionCalculator({
    allMonths,
    currentMonth,
    monthlyEntries: config.monthlyEntries,
    incomeItems: enabledIncomeItems,
    expenseItems: enabledExpenseItems,
    projectionDefaults: config.projectionDefaults,
    getMonthlyEntry,
  });

  // Convert income value to net (applies discount if method is gross)
  const getNetIncomeValue = useCallback((item: typeof enabledIncomeItems[0], grossValue: number): number => {
    if (item.method === 'gross' && item.discountRate && item.discountRate > 0) {
      return grossValue * (1 - item.discountRate / 100);
    }
    return grossValue;
  }, []);

  // Get income entry value (always returns net value)
  const getIncomeEntryNet = useCallback((month: string, item: typeof enabledIncomeItems[0]): number => {
    const rawValue = getMonthlyEntry(month, item.id, 'income');
    return getNetIncomeValue(item, rawValue);
  }, [getMonthlyEntry, getNetIncomeValue]);

  // Group expenses by payment method, then by category (kept for totals calculation)
  const expensesByPaymentMethod = useMemo(() => {
    const grouped: Record<string, Record<string, typeof enabledExpenseItems>> = {};
    enabledExpenseItems.forEach(item => {
      const method = item.paymentMethod || 'other';
      if (!grouped[method]) {
        grouped[method] = {};
      }
      if (!grouped[method][item.category]) {
        grouped[method][item.category] = [];
      }
      grouped[method][item.category].push(item);
    });
    return grouped;
  }, [enabledExpenseItems]);

  // Group expenses by category (kept for backwards compatibility)
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, typeof enabledExpenseItems> = {};
    enabledExpenseItems.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }, [enabledExpenseItems]);

  // Payment method labels
  const paymentMethodLabels: Record<string, string> = {
    'credit_card': 'Cartão de Crédito',
    'debit_card': 'Cartão de Débito',
    'auto_debit': 'Débito Automático',
    'pix': 'PIX',
    'boleto': 'Boleto',
    'cash': 'Dinheiro em Espécie',
    'other': 'Outros',
  };

  // Build navigable cells list - updated for 3-level hierarchy
  const navigableCells = useMemo(() => {
    const cells: { rowId: string; type: 'income' | 'expense'; rowIndex: number }[] = [];
    
    // Income rows
    if (incomeExpanded) {
      enabledIncomeItems.forEach((item, idx) => {
        cells.push({ rowId: item.id, type: 'income', rowIndex: idx });
      });
    }
    
    // Expense rows - now grouped by payment method then category
    let expenseIdx = 0;
    Object.entries(expensesByPaymentMethod).forEach(([method, categories]) => {
      const isMethodExpanded = expandedPaymentMethods[method] !== false;
      if (isMethodExpanded) {
        Object.entries(categories).forEach(([category, items]) => {
          const categoryKey = `${method}-${category}`;
          const isCategoryExpanded = expandedCategories[categoryKey] !== false;
          if (isCategoryExpanded) {
            items.forEach(item => {
              cells.push({ rowId: item.id, type: 'expense', rowIndex: expenseIdx++ });
            });
          }
        });
      }
    });
    
    return cells;
  }, [incomeExpanded, enabledIncomeItems, expandedPaymentMethods, expandedCategories, expensesByPaymentMethod]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return;
      
      const currentCellIndex = navigableCells.findIndex(c => c.rowId === selectedCell.rowId && c.type === selectedCell.type);
      if (currentCellIndex === -1) return;
      
      let newRowIndex = currentCellIndex;
      let newMonthIndex = selectedCell.monthIndex;
      
      // TAB or Right Arrow - move right
      if ((e.key === 'Tab' && !e.altKey && !e.shiftKey) || e.key === 'ArrowRight') {
        e.preventDefault();
        newMonthIndex = Math.min(selectedCell.monthIndex + 1, filteredMonths.length - 1);
      }
      // ALT+TAB or Left Arrow - move left
      else if ((e.key === 'Tab' && e.altKey) || e.key === 'ArrowLeft') {
        e.preventDefault();
        newMonthIndex = Math.max(selectedCell.monthIndex - 1, 0);
      }
      // ENTER or Down Arrow - move down
      else if ((e.key === 'Enter' && !e.altKey) || e.key === 'ArrowDown') {
        e.preventDefault();
        newRowIndex = Math.min(currentCellIndex + 1, navigableCells.length - 1);
      }
      // ALT+ENTER or Up Arrow - move up
      else if ((e.key === 'Enter' && e.altKey) || e.key === 'ArrowUp') {
        e.preventDefault();
        newRowIndex = Math.max(currentCellIndex - 1, 0);
      }
      else {
        return;
      }
      
      const newCell = navigableCells[newRowIndex];
      if (newCell) {
        setSelectedCell({
          rowId: newCell.rowId,
          monthIndex: newMonthIndex,
          type: newCell.type
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, navigableCells, filteredMonths.length]);

  // Mapeia despesas vinculadas a ativos
  const linkedExpenseMap = useMemo(() => {
    const map: Record<string, { assetId: string; config: typeof config.assets[0]['linkedExpenses'][0] }> = {};
    config.assets.forEach(asset => {
      (asset.linkedExpenses || []).forEach(le => {
        map[le.expenseId] = { assetId: asset.id, config: le };
      });
    });
    return map;
  }, [config.assets]);

  // Função para obter valor com projeção automática de ativos
  const getExpenseValue = (month: string, itemId: string): number => {
    const manualEntry = getMonthlyEntry(month, itemId, 'expense');
    
    // Se há entrada manual, usa ela
    if (manualEntry > 0) return manualEntry;
    
    // Verifica se a despesa está vinculada a um ativo
    const linked = linkedExpenseMap[itemId];
    if (!linked) return 0;
    
    // Só aplica projeção para meses atuais e futuros
    if (month < currentMonth) return 0;
    
    const { config: linkedConfig } = linked;
    
    if (linkedConfig.frequency === 'monthly') {
      return linkedConfig.monthlyValue;
    }
    
    // Para despesas anuais, verifica se é um mês de pagamento
    const monthNum = parseInt(month.split('-')[1]);
    if (linkedConfig.annualMonths?.includes(monthNum)) {
      return linkedConfig.monthlyValue;
    }
    
    return 0;
  };


  // Inicializa payment methods e categorias como expandidas
  useMemo(() => {
    const initialMethods: Record<string, boolean> = {};
    const initialCategories: Record<string, boolean> = {};
    
    Object.entries(expensesByPaymentMethod).forEach(([method, categories]) => {
      if (expandedPaymentMethods[method] === undefined) {
        initialMethods[method] = true;
      }
      Object.keys(categories).forEach(cat => {
        const categoryKey = `${method}-${cat}`;
        if (expandedCategories[categoryKey] === undefined) {
          initialCategories[categoryKey] = true;
        }
      });
    });
    
    if (Object.keys(initialMethods).length > 0) {
      setExpandedPaymentMethods(prev => ({ ...prev, ...initialMethods }));
    }
    if (Object.keys(initialCategories).length > 0) {
      setExpandedCategories(prev => ({ ...prev, ...initialCategories }));
    }
  }, [expensesByPaymentMethod]);

  const togglePaymentMethod = (method: string) => {
    setExpandedPaymentMethods(prev => ({
      ...prev,
      [method]: !prev[method]
    }));
  };

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  // Get payment method total for a specific month (excluding adjustment item)
  const getPaymentMethodTotalBase = (method: string, month: string) => {
    const categories = expensesByPaymentMethod[method] || {};
    return Object.values(categories).flat()
      .filter(item => item.id !== CREDIT_CARD_ADJUSTMENT_ITEM_ID)
      .reduce((sum, item) => sum + getExpenseValue(month, item.id), 0);
  };

  // Get payment method total for a specific month (including adjustment)
  const getPaymentMethodTotal = (method: string, month: string) => {
    const categories = expensesByPaymentMethod[method] || {};
    return Object.values(categories).flat().reduce((sum, item) => sum + getExpenseValue(month, item.id), 0);
  };

  // Get credit card delta for a specific month
  const getCreditCardDelta = (month: string) => {
    const manualTotal = manualCreditCardTotals[month];
    if (manualTotal === undefined || manualTotal === 0) return 0;
    const calculatedTotal = getPaymentMethodTotalBase('credit_card', month);
    return manualTotal - calculatedTotal;
  };

  // Get credit card display total (manual if set, calculated otherwise)
  const getCreditCardDisplayTotal = (month: string) => {
    const manualTotal = manualCreditCardTotals[month];
    if (manualTotal !== undefined && manualTotal > 0) {
      return manualTotal;
    }
    return getPaymentMethodTotal('credit_card', month);
  };

  // Handle manual credit card total change
  const handleManualCreditCardTotal = useCallback((month: string, value: number) => {
    setManualCreditCardTotals(prev => ({
      ...prev,
      [month]: value
    }));
    
    // Calculate delta and update the adjustment item
    const calculatedTotal = getPaymentMethodTotalBase('credit_card', month);
    const delta = value - calculatedTotal;
    
    // Update the adjustment expense item with the delta
    updateMonthlyEntry({ 
      month, 
      itemId: CREDIT_CARD_ADJUSTMENT_ITEM_ID, 
      type: 'expense', 
      value: Math.max(0, delta) // Only positive deltas
    });
  }, [updateMonthlyEntry, getPaymentMethodTotalBase]);

  // Check if a month has credit card adjustment
  const hasCreditCardAdjustment = (month: string) => {
    const delta = getCreditCardDelta(month);
    return delta !== 0;
  };

  // Get payment method row total (all months)
  const getPaymentMethodRowTotal = (method: string) => {
    const categories = expensesByPaymentMethod[method] || {};
    return allMonths.reduce((sum, month) =>
      sum + Object.values(categories).flat().reduce((s, item) => s + getExpenseValue(month, item.id), 0),
      0
    );
  };

  // Get category total within a payment method
  const getCategoryTotalInMethod = (method: string, category: string, month: string) => {
    const items = expensesByPaymentMethod[method]?.[category] || [];
    return items.reduce((sum, item) => sum + getExpenseValue(month, item.id), 0);
  };

  // Get category row total within a payment method
  const getCategoryRowTotalInMethod = (method: string, category: string) => {
    const items = expensesByPaymentMethod[method]?.[category] || [];
    return allMonths.reduce((sum, month) =>
      sum + items.reduce((s, item) => s + getExpenseValue(month, item.id), 0),
      0
    );
  };

  const getCategoryTotal = (category: string, month: string) => {
    const items = expensesByCategory[category] || [];
    return items.reduce((sum, item) => sum + getExpenseValue(month, item.id), 0);
  };

  const getCategoryRowTotal = (category: string) => {
    const items = expensesByCategory[category] || [];
    return allMonths.reduce((sum, month) => 
      sum + items.reduce((s, item) => s + getExpenseValue(month, item.id), 0),
      0
    );
  };

  // Edit mode handlers
  const handleValueChange = useCallback((
    month: string, 
    itemId: string, 
    type: 'income' | 'expense', 
    value: number
  ) => {
    if (isEditMode) {
      const key = `${month}|${itemId}|${type}`;
      setPendingChanges(prev => new Map(prev).set(key, value));
    } else {
      updateMonthlyEntry({ month, itemId, type, value });
    }
  }, [isEditMode, updateMonthlyEntry]);

  const getDisplayValue = useCallback((month: string, itemId: string, type: 'income' | 'expense') => {
    const key = `${month}|${itemId}|${type}`;
    if (isEditMode && pendingChanges.has(key)) {
      return pendingChanges.get(key) || 0;
    }
    
    // Check for actual value first (from lancamentos)
    const displayInfo = goalsIntegration.getDisplayValueForPlanning(month, itemId, type);
    if (displayInfo.isActual && displayInfo.value > 0) {
      return displayInfo.value;
    }
    
    if (type === 'income') {
      // Always return net income value
      const item = enabledIncomeItems.find(i => i.id === itemId);
      if (item) {
        return getIncomeEntryNet(month, item);
      }
      return getMonthlyEntry(month, itemId, type);
    }
    return getExpenseValue(month, itemId);
  }, [isEditMode, pendingChanges, getMonthlyEntry, getExpenseValue, enabledIncomeItems, getIncomeEntryNet, goalsIntegration]);

  // Helper to check if a cell has actual value
  const getCellDisplayInfo = useCallback((month: string, itemId: string, type: 'income' | 'expense') => {
    return goalsIntegration.getDisplayValueForPlanning(month, itemId, type);
  }, [goalsIntegration]);

  const handleSaveChanges = () => {
    // Check if any edited cells are in projection range (M+1 onwards)
    const projectionCells: Array<{ month: string; itemId: string; type: 'income' | 'expense'; value: number }> = [];
    
    pendingChanges.forEach((value, key) => {
      const [month, itemId, type] = key.split('|');
      if (month > currentMonth) {
        projectionCells.push({ month, itemId, type: type as 'income' | 'expense', value });
      }
    });

    if (projectionCells.length > 0) {
      // Show dialog asking what to do with subsequent months
      setProjectionEditCells(projectionCells);
      setProjectionEditDialogOpen(true);
    } else {
      // No projection cells, save directly
      applyPendingChanges('keep_default');
    }
  };

  const applyPendingChanges = (action: ProjectionEditAction) => {
    const allEntries: Array<{ month: string; itemId: string; type: 'income' | 'expense'; value: number; isManualOverride: boolean }> = [];
    
    pendingChanges.forEach((value, key) => {
      const [month, itemId, type] = key.split('|');
      allEntries.push({ 
        month, 
        itemId, 
        type: type as 'income' | 'expense', 
        value,
        isManualOverride: month > currentMonth // Mark as manual if in projection range
      });
    });

    // If replicating, add entries for subsequent months
    if (action === 'replicate') {
      projectionEditCells.forEach(cell => {
        const cellMonthIndex = allMonths.indexOf(cell.month);
        // Apply to all months after the edited cell
        for (let i = cellMonthIndex + 1; i < allMonths.length; i++) {
          const futureMonth = allMonths[i];
          // Check if this cell wasn't already edited
          const checkKey = `${futureMonth}|${cell.itemId}|${cell.type}`;
          if (!pendingChanges.has(checkKey)) {
            allEntries.push({
              month: futureMonth,
              itemId: cell.itemId,
              type: cell.type,
              value: cell.value,
              isManualOverride: true
            });
          }
        }
      });
    }

    // Apply all changes
    allEntries.forEach(entry => {
      updateMonthlyEntry(entry);
    });

    setPendingChanges(new Map());
    setProjectionEditCells([]);
    setIsEditMode(false);
    toast.success('Alterações salvas com sucesso');
  };

  const handleProjectionEditConfirm = (action: ProjectionEditAction) => {
    setProjectionEditDialogOpen(false);
    applyPendingChanges(action);
  };

  const handleCancelEdit = () => {
    setPendingChanges(new Map());
    setIsEditMode(false);
  };

  const handleCellClick = (rowId: string, monthIndex: number, type: 'income' | 'expense') => {
    setSelectedCell({ rowId, monthIndex, type });
  };

  // Projection handlers
  const projectionImpact = useMemo(() => {
    if (!projectionDialogOpen) return null;
    return projectionCalculator.calculateProjectionImpact(
      projectionScope,
      projectionTargetMonth,
      projectionTargetItemId,
      projectionTargetType
    );
  }, [projectionDialogOpen, projectionScope, projectionTargetMonth, projectionTargetItemId, projectionTargetType, projectionCalculator]);

  const openProjectionDialog = useCallback((
    scope: 'all' | 'month' | 'cell',
    month?: string,
    itemId?: string,
    type?: 'income' | 'expense'
  ) => {
    setProjectionScope(scope);
    setProjectionTargetMonth(month);
    setProjectionTargetItemId(itemId);
    setProjectionTargetType(type);
    setProjectionDialogOpen(true);
  }, []);

  const applyProjections = useCallback(() => {
    if (!projectionImpact || projectionImpact.details.length === 0) {
      toast.info('Nenhuma alteração a aplicar');
      setProjectionDialogOpen(false);
      return;
    }

    const entries = projectionImpact.details.map(detail => ({
      month: detail.month,
      itemId: detail.itemId,
      type: detail.type,
      value: detail.projectedValue,
    }));

    updateMonthlyEntries(entries);
    toast.success(`Projeção aplicada: ${projectionImpact.itemsAffected} itens em ${projectionImpact.monthsAffected} meses`);
    setProjectionDialogOpen(false);
  }, [projectionImpact, updateMonthlyEntries]);

  const getMonthlyTotals = useCallback((month: string) => {
    // Check if month has actual values
    const comparison = goalsIntegration.getMonthlyComparison(month);
    
    if (comparison.hasActuals) {
      // Use actual totals when available
      return { 
        income: comparison.actualIncome, 
        expense: comparison.actualExpense, 
        balance: comparison.actualSavings 
      };
    }
    
    // Otherwise use projected/planned values
    const income = enabledIncomeItems.reduce(
      (sum, item) => sum + getIncomeEntryNet(month, item), 
      0
    );
    const expense = enabledExpenseItems.reduce(
      (sum, item) => sum + getExpenseValue(month, item.id), 
      0
    );
    return { income, expense, balance: income - expense };
  }, [enabledIncomeItems, enabledExpenseItems, getIncomeEntryNet, getExpenseValue, goalsIntegration]);

  const isProjection = (month: string) => month > currentMonth;

  // Responsive months for overview table - desktop: 9, tablet: 6, mobile: 3
  const summaryMonths = useMemo(() => {
    const currentIdx = allMonths.indexOf(currentMonth);
    const monthCount = isMobile ? 3 : (typeof window !== 'undefined' && window.innerWidth >= 1024) ? 9 : 6;
    const beforeCurrent = Math.floor(monthCount / 2);
    
    const startIdx = Math.max(0, currentIdx - beforeCurrent);
    const endIdx = Math.min(allMonths.length, startIdx + monthCount);
    const adjustedStartIdx = Math.max(0, endIdx - monthCount);
    
    return allMonths.slice(adjustedStartIdx, endIdx);
  }, [allMonths, currentMonth, isMobile]);

  // Mês anterior para consolidação
  const previousMonth = useMemo(() => {
    const idx = allMonths.indexOf(currentMonth);
    return idx > 0 ? allMonths[idx - 1] : null;
  }, [allMonths, currentMonth]);

  // Preparar dados para consolidação
  const getConsolidationData = (month: string) => {
    const receitas = enabledIncomeItems.map(item => ({
      id: item.id,
      name: item.name,
      value: getIncomeEntryNet(month, item),
    }));

    const despesas = enabledExpenseItems.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      value: getExpenseValue(month, item.id),
      paymentMethod: item.paymentMethod,
    }));

    return { receitas, despesas };
  };

  const handleOpenConsolidacao = (month: string) => {
    setConsolidacaoMes(month);
    setConsolidacaoDialogOpen(true);
  };

  const handleConsolidar = async (lancamentos: LancamentoInput[]) => {
    return await addMultipleLancamentos(lancamentos);
  };

  const consolidationData = useMemo(() => {
    if (!consolidacaoMes) return { receitas: [], despesas: [] };
    return getConsolidationData(consolidacaoMes);
  }, [consolidacaoMes, enabledIncomeItems, enabledExpenseItems]);

  // Check if a specific cell is consolidated
  const isCellConsolidated = useCallback((month: string, itemName: string, tipo: 'receita' | 'despesa') => {
    return lancamentos.some(l => 
      l.mes_referencia === month && 
      l.nome === itemName && 
      l.tipo === tipo
    );
  }, [lancamentos]);

  return (
      <div className="space-y-6">
          {/* Elegant Date Range Selector */}
          <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-9 px-4 gap-2 rounded-full border-border/60 bg-card shadow-sm hover:shadow-md transition-all"
              >
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">
                  {formatMonthLabel(filteredMonths[0] || allMonths[0])}
                </span>
                <span className="text-muted-foreground text-xs">—</span>
                <span className="text-xs font-medium">
                  {formatMonthLabel(filteredMonths[filteredMonths.length - 1] || allMonths[allMonths.length - 1])}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Período de visualização</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">De</Label>
                    <Select value={filterStartMonth || 'all'} onValueChange={v => setFilterStartMonth(v === 'all' ? '' : v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Início</SelectItem>
                        {allMonths.map(m => (
                          <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Até</Label>
                    <Select value={filterEndMonth || 'all'} onValueChange={v => setFilterEndMonth(v === 'all' ? '' : v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Final</SelectItem>
                        {allMonths.map(m => (
                          <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          </div>

          <div className="space-y-5">
            {/* Goals Summary Card */}
            <GoalsSummaryCard
              selectedMonth={currentMonth}
              formatCurrency={formatCurrency}
              isHidden={isHidden}
            />

            {/* Monthly Overview Table */}
            <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
              <MonthlyOverviewTable
                months={summaryMonths}
                currentMonth={currentMonth}
                getMonthlyTotals={getMonthlyTotals}
                formatCurrency={formatCurrency}
                isMonthConsolidated={isMonthConsolidated}
                isHidden={isHidden}
              />
            </div>

        {/* Main Grid */}
        <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Lançamentos Mensais
                  {isEditMode && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-700 px-2 py-0.5 rounded-full ml-2">
                      Modo Edição
                    </span>
                  )}
                </CardTitle>
                
                {/* First Row: Add Income and Add Expense */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Quick Add Buttons */}
                  <Dialog open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1 text-income border-income/30 hover:bg-income/10">
                        <Plus className="h-3 w-3" />
                        <TrendingUp className="h-3 w-3" />
                        <span className="hidden sm:inline">Receita</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nova Fonte de Receita</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Nome da Receita</Label>
                          <Input
                            placeholder="Ex: Freelance, Dividendos..."
                            value={newIncomeName}
                            onChange={(e) => setNewIncomeName(e.target.value)}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          A receita será adicionada aos Parâmetros e ficará disponível para lançamentos.
                        </p>
                        <Button onClick={handleAddIncome} className="w-full">
                          Adicionar Receita
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1 text-expense border-expense/30 hover:bg-expense/10">
                        <Plus className="h-3 w-3" />
                        <TrendingDown className="h-3 w-3" />
                        <span className="hidden sm:inline">Despesa</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nova Linha de Despesa</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Nome da Despesa</Label>
                          <Input
                            placeholder="Ex: Academia, Streaming..."
                            value={newExpense.name}
                            onChange={(e) => setNewExpense(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Categoria</Label>
                          <Select
                            value={newExpense.categoryId}
                            onValueChange={(value) => setNewExpense(prev => ({ ...prev, categoryId: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {expenseCategories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Forma de Pagamento</Label>
                          <Select
                            value={newExpense.paymentMethod}
                            onValueChange={(value) => setNewExpense(prev => ({ ...prev, paymentMethod: value as PaymentMethod }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentMethods.map((method) => (
                                <SelectItem key={method.value} value={method.value}>
                                  {method.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          A despesa será adicionada aos Parâmetros e ficará disponível para lançamentos.
                        </p>
                        <Button onClick={handleAddExpense} className="w-full bg-expense hover:bg-expense/90">
                          Adicionar Despesa
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Histórico button - same style as edit button (icon only, rounded) */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setHistoricoDrawerOpen(true)}
                    className="h-8 w-8 rounded-full"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </div>

                {/* Consolidar mês anterior - stays in first row */}
                {previousMonth && !isMonthConsolidated(previousMonth) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenConsolidacao(previousMonth)}
                    className="gap-1 text-primary border-primary/30 hover:bg-primary/10"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Consolidar</span>
                  </Button>
                )}
              </div>

              {/* Second Row: Editar, Centralizar, Projetar, Agrupar, Expandir/Recolher, Filtro */}
              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                {/* Edit Mode Controls */}
                {isEditMode ? (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveChanges}
                      className="gap-1"
                    >
                      <Save className="h-4 w-4" />
                      <span className="hidden sm:inline">Salvar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="gap-1"
                    >
                      <X className="h-4 w-4" />
                      <span className="hidden sm:inline">Cancelar</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditMode(true)}
                    className="gap-1"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                )}

                {/* Center on current month button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={monthNav.centerOnCurrentMonth}
                  className="gap-1"
                >
                  <Target className="h-4 w-4" />
                  <span className="hidden sm:inline">Mês Atual</span>
                </Button>

                {/* Projeções */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Calculator className="h-4 w-4" />
                      <span className="hidden sm:inline">Projeções</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openProjectionDialog('all')}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Atualizar Todas as Projeções
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => {
                        if (selectedCell) {
                          const month = filteredMonths[selectedCell.monthIndex];
                          openProjectionDialog('cell', month, selectedCell.rowId, selectedCell.type);
                        } else {
                          toast.info('Selecione uma célula primeiro');
                        }
                      }}
                      disabled={!selectedCell}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Atualizar Célula Selecionada
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Grouping Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGroupingDialogOpen(true)}
                  className="gap-2"
                >
                  <Layers className="h-4 w-4" />
                  <span className="hidden sm:inline">Agrupar</span>
                  {(groupLevel1 !== 'paymentMethod' || groupLevel2 !== 'category') && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                      Personalizado
                    </Badge>
                  )}
                </Button>

                {/* Expand/Collapse Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <ChevronsUpDown className="h-4 w-4" />
                      <span className="hidden sm:inline">Expandir</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={expandToLevel1}>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Expandir até 1º nível
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={expandToLevel2}>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Expandir até 2º nível
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={expandAll}>
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Expandir tudo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={collapseAll}>
                      <Minimize2 className="h-4 w-4 mr-2" />
                      Recolher tudo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Filter Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilterDialogOpen(true)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filtros</span>
                  {((filterStartMonth && filterStartMonth !== 'all') || 
                    (filterEndMonth && filterEndMonth !== 'all') || 
                    filterResponsible !== 'all') && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                      {[
                        filterStartMonth && filterStartMonth !== 'all',
                        filterEndMonth && filterEndMonth !== 'all',
                        filterResponsible !== 'all',
                      ].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {/* Credit Card Adjustment Alert */}
            {Object.entries(manualCreditCardTotals).some(([month, value]) => {
              if (!value) return false;
              const calculatedTotal = getPaymentMethodTotalBase('credit_card', month);
              return value !== calculatedTotal;
            }) && (
              <Alert className="mb-4 mx-4 sm:mx-0 border-warning/50 bg-warning/10">
                <Info className="h-4 w-4 text-warning" />
                <AlertDescription className="text-xs">
                  <span className="font-semibold">Ajuste manual do Cartão de Crédito ativo.</span>
                  <br />
                  Quando você informa o total da fatura do cartão diferente da soma dos itens cadastrados, 
                  a diferença (delta) é automaticamente alocada na categoria <strong>"Outros"</strong> como 
                  <strong> "Ajuste Fatura Cartão"</strong>. Isso permite rastrear gastos não categorizados 
                  ou ajustar discrepâncias entre o planejado e o valor real da fatura.
                </AlertDescription>
              </Alert>
            )}
            <TooltipProvider>
              <div className="flex" ref={gridRef}>
                {/* Coluna fixa esquerda - Item */}
                <div className={cn(
                  "flex-shrink-0 border-r border-border bg-card z-10",
                  monthNav.isMobile ? "w-32" : "w-52"
                )}>
                  {/* Header */}
                  <div className="px-2 py-2 font-medium text-muted-foreground text-xs border-b border-border/50 h-12 flex items-center">
                    Item
                  </div>
                  
                  {/* Income Section */}
                  <div 
                    className="bg-income/20 border-l-4 border-l-income px-3 py-1.5 font-bold text-income text-xs uppercase tracking-wide cursor-pointer hover:bg-income/30 h-8 flex items-center"
                    onClick={() => setIncomeExpanded(!incomeExpanded)}
                  >
                    <span className="flex items-center gap-1.5">
                      {incomeExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                      Receitas
                    </span>
                  </div>
                  {incomeExpanded && enabledIncomeItems.map(item => (
                    <div 
                      key={item.id} 
                      className={cn("px-2 py-1 text-xs border-b border-border/30 h-8 flex items-center gap-1 cursor-pointer", monthNav.isMobile ? "pl-1" : "pl-4")}
                      onClick={() => setActiveConfigRowId(prev => prev === item.id ? null : item.id)}
                    >
                      <div className={cn(
                        "shrink-0",
                        monthNav.isMobile ? (activeConfigRowId === item.id ? "block" : "hidden") : "block"
                      )}>
                        <ProjectionConfigPopover
                          item={item}
                          type="income"
                          allMonths={allMonths}
                          currentMonth={currentMonth}
                          onUpdateIncome={updateIncomeItem}
                          projectionDefaults={config.projectionDefaults}
                        />
                      </div>
                      <div className="truncate flex-1">
                        {item.name}
                        {!monthNav.isMobile && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({item.method === 'gross' ? 'Bruto' : 'Líquido'})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Expense Section Header with Subtotal */}
                  <div className="bg-expense/20 border-l-4 border-l-expense px-3 py-1.5 font-bold text-expense text-xs uppercase tracking-wide h-8 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      Despesas
                    </span>
                  </div>

                  {/* Expense by Dynamic Grouping */}
                  {Object.entries(groupedExpenses).map(([level1Key, level2Groups]) => {
                    const isLevel1Expanded = expandedLevel1[level1Key] !== false;
                    return (
                      <React.Fragment key={level1Key}>
                        {/* Level 1 Header */}
                        {groupLevel1 !== 'none' && (
                          <div 
                            className="bg-muted-foreground/15 border-l-4 border-l-muted-foreground/50 px-3 py-1.5 text-xs font-bold text-foreground cursor-pointer hover:bg-muted-foreground/25 h-8 flex items-center"
                            onClick={() => toggleLevel1(level1Key)}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              {isLevel1Expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                              {groupLevel1 === 'paymentMethod' && getPaymentIcon(level1Key as PaymentMethod)}
                              {getGroupLabel(groupLevel1, level1Key)}
                            </span>
                          </div>
                        )}
                        
                        {(groupLevel1 === 'none' || isLevel1Expanded) && Object.entries(level2Groups).map(([level2Key, items]) => {
                          const combinedKey = `${level1Key}-${level2Key}`;
                          const isLevel2Expanded = expandedLevel2[combinedKey] !== false;
                          return (
                            <React.Fragment key={combinedKey}>
                              {/* Level 2 Header */}
                              {groupLevel2 !== 'none' && (
                                <div 
                                  className={cn(
                                    "bg-muted/60 border-l-2 border-l-expense/50 px-3 py-1.5 text-xs font-bold text-foreground cursor-pointer hover:bg-muted/80 h-8 flex items-center",
                                    monthNav.isMobile ? "pl-1" : (groupLevel1 !== 'none' ? "pl-6" : "pl-3")
                                  )}
                                  onClick={() => toggleLevel2(combinedKey)}
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    {isLevel2Expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                                    {groupLevel2 === 'paymentMethod' && getPaymentIcon(level2Key as PaymentMethod)}
                                    {getGroupLabel(groupLevel2, level2Key)}
                                  </span>
                                </div>
                              )}
                              
                              {/* Level 3: Individual Items */}
                              {(groupLevel2 === 'none' || isLevel2Expanded) && items.map(item => (
                                <div 
                                  key={item.id} 
                                  className={cn(
                                    "px-2 py-1 text-xs text-muted-foreground border-b border-border/30 h-8 flex items-center gap-1 cursor-pointer",
                                    monthNav.isMobile ? "pl-1" : (groupLevel1 !== 'none' && groupLevel2 !== 'none' ? "pl-10" : groupLevel1 !== 'none' || groupLevel2 !== 'none' ? "pl-6" : "pl-4")
                                  )}
                                  onClick={() => setActiveConfigRowId(prev => prev === item.id ? null : item.id)}
                                >
                                  <div className={cn(
                                    "shrink-0",
                                    monthNav.isMobile ? (activeConfigRowId === item.id ? "block" : "hidden") : "block"
                                  )}>
                                    <ProjectionConfigPopover
                                      item={item}
                                      type="expense"
                                      allMonths={allMonths}
                                      currentMonth={currentMonth}
                                      onUpdateExpense={updateExpenseItem}
                                      projectionDefaults={config.projectionDefaults}
                                    />
                                  </div>
                                  <span className="truncate flex-1">{item.name}</span>
                                </div>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}


                  {/* Balance Row */}
                  <div className="bg-muted-foreground/30 border-l-4 border-l-muted-foreground px-3 py-2 text-xs font-bold uppercase h-10 flex items-center">
                    Saldo
                  </div>
                </div>

                {/* Área central com scroll - Meses */}
                <div 
                  ref={monthNav.scrollContainerRef}
                  className={cn(
                    "flex-1 overflow-x-auto cursor-grab select-none",
                    monthNav.isDragging && "cursor-grabbing"
                  )}
                  {...monthNav.handlers}
                >
                  <div style={{ minWidth: monthNav.isMobile ? `${filteredMonths.length * 70}px` : `${filteredMonths.length * 85}px` }}>
                    {/* Header */}
                    <div className="flex border-b border-border/50 h-12">
                      {filteredMonths.map(month => {
                        const isConsolidated = isMonthConsolidated(month);
                        return (
                          <div 
                            key={month} 
                            className={cn(
                              "flex-shrink-0 text-center px-1 py-2 font-medium text-xs flex flex-col justify-center relative",
                              monthNav.isMobile ? "w-[70px]" : "w-[85px]",
                              month === currentMonth && "bg-amber-200/50 font-bold",
                              isProjection(month) && month !== currentMonth
                                ? "text-muted-foreground bg-amber-100/30" 
                                : "text-muted-foreground"
                            )}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {formatMonthLabel(month)}
                              {isConsolidated && (
                                <Check className="h-3 w-3 text-green-500" />
                              )}
                            </div>
                            {month === currentMonth && (
                              <div className="text-[10px] font-normal text-muted-foreground">(Atual)</div>
                            )}
                            {isProjection(month) && month !== currentMonth && (
                              <div className="text-[10px] font-normal opacity-70">(Projeção)</div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Income Section */}
                    <div className="flex bg-income/20 h-8">
                      {filteredMonths.map(month => {
                        const total = enabledIncomeItems.reduce(
                          (sum, item) => sum + getIncomeEntryNet(month, item),
                          0
                        );
                        return (
                          <div 
                            key={month} 
                            className={cn(
                              "flex-shrink-0 px-2 py-1.5 text-right font-bold text-income text-xs flex items-center justify-end",
                              monthNav.isMobile ? "w-[70px]" : "w-[85px]",
                              month === currentMonth && "bg-amber-200/50",
                              isProjection(month) && month !== currentMonth && "bg-amber-100/30"
                            )}
                          >
                            {formatAccounting(total)}
                          </div>
                        );
                      })}
                    </div>
                    {incomeExpanded && enabledIncomeItems.map(item => (
                      <div key={item.id} className="flex border-b border-border/30 h-8">
                        {filteredMonths.map((month, monthIndex) => {
                          const isSelected = selectedCell?.rowId === item.id && selectedCell?.monthIndex === monthIndex && selectedCell?.type === 'income';
                          const isConsolidated = isCellConsolidated(month, item.name, 'receita');
                          const cellInfo = getCellDisplayInfo(month, item.id, 'income');
                          const displayValue = cellInfo.isActual ? cellInfo.value : getIncomeEntryNet(month, item);
                          return (
                            <div 
                              key={month} 
                              className={cn(
                                "flex-shrink-0 px-1 py-0.5 flex items-center relative",
                                monthNav.isMobile ? "w-[70px]" : "w-[85px]",
                                month === currentMonth && "bg-amber-200/50",
                                cellInfo.isProjection && month !== currentMonth && "bg-amber-100/30",
                                isSelected && "ring-2 ring-amber-500 ring-inset",
                                cellInfo.isActual && "bg-green-500/10",
                                isConsolidated && !cellInfo.isActual && "bg-green-500/5"
                              )}
                              onClick={() => handleCellClick(item.id, monthIndex, 'income')}
                            >
                              {isEditMode ? (
                                <CurrencyInput
                                  compact
                                  autoFocus={isSelected}
                                  className={cn("text-xs h-6 px-1 w-full", monthNav.isMobile && "h-5 px-0.5")}
                                  value={getDisplayValue(month, item.id, 'income')}
                                  onChange={(value) => handleValueChange(month, item.id, 'income', value)}
                                  placeholder="0"
                                />
                              ) : (
                              <div 
                                className={cn(
                                  "w-full text-xs text-right px-1 py-1 rounded cursor-pointer hover:bg-muted/50 h-6 flex items-center justify-end gap-0.5",
                                  (isConsolidated || cellInfo.isActual) && "font-medium"
                                )}
                                onDoubleClick={() => setIsEditMode(true)}
                              >
                                  {formatAccounting(displayValue)}
                                  {cellInfo.isActual && !monthNav.isMobile && (
                                    <CircleDot className="h-2 w-2 text-green-500 shrink-0" />
                                  )}
                                </div>
                              )}
                              {(isConsolidated || cellInfo.isActual) && (
                                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {/* Expense Section Header with Totals */}
                    <div className="flex bg-expense/20 h-8">
                      {filteredMonths.map(month => {
                        const total = enabledExpenseItems.reduce(
                          (sum, item) => sum + getExpenseValue(month, item.id),
                          0
                        );
                        return (
                          <div 
                            key={month} 
                            className={cn(
                              "flex-shrink-0 px-2 py-1.5 text-right font-bold text-expense text-xs flex items-center justify-end",
                              monthNav.isMobile ? "w-[70px]" : "w-[85px]",
                              month === currentMonth && "bg-amber-200/50",
                              isProjection(month) && month !== currentMonth && "bg-amber-100/30"
                            )}
                          >
                            {formatAccounting(total)}
                          </div>
                        );
                      })}
                    </div>

                    {/* Expense by Dynamic Grouping */}
                    {Object.entries(groupedExpenses).map(([level1Key, level2Groups]) => {
                      const isLevel1Expanded = expandedLevel1[level1Key] !== false;
                      // Calculate level1 total
                      const level1Total = Object.values(level2Groups).flat().reduce(
                        (sum, item) => sum + filteredMonths.reduce((s, month) => s + getExpenseValue(month, item.id), 0), 0
                      );
                      return (
                        <React.Fragment key={level1Key}>
                          {/* Level 1 Subtotals */}
                          {groupLevel1 !== 'none' && (
                            <div className="flex bg-muted-foreground/15 h-8">
                              {filteredMonths.map(month => {
                                const subtotal = Object.values(level2Groups).flat()
                                  .reduce((sum, item) => sum + getExpenseValue(month, item.id), 0);
                                return (
                                  <div 
                                    key={month} 
                                    className={cn(
                                      "flex-shrink-0 px-1 py-0.5 text-right font-bold text-xs text-foreground flex items-center justify-end",
                                      monthNav.isMobile ? "w-[70px]" : "w-[85px]",
                                      month === currentMonth && "bg-amber-200/50",
                                      isProjection(month) && month !== currentMonth && "bg-amber-100/30"
                                    )}
                                  >
                                    {formatAccounting(subtotal)}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {(groupLevel1 === 'none' || isLevel1Expanded) && Object.entries(level2Groups).map(([level2Key, items]) => {
                            const combinedKey = `${level1Key}-${level2Key}`;
                            const isLevel2Expanded = expandedLevel2[combinedKey] !== false;
                            return (
                              <React.Fragment key={combinedKey}>
                                {/* Level 2 Subtotals */}
                                {groupLevel2 !== 'none' && (
                                  <div className="flex bg-muted/60 h-8">
                                    {filteredMonths.map(month => {
                                      const subtotal = items.reduce((sum, item) => sum + getExpenseValue(month, item.id), 0);
                                      return (
                                        <div 
                                          key={month} 
                                          className={cn(
                                            "flex-shrink-0 px-2 py-1.5 text-right font-bold text-xs text-foreground flex items-center justify-end",
                                            monthNav.isMobile ? "w-[70px]" : "w-[85px]",
                                            month === currentMonth && "bg-amber-200/50",
                                            isProjection(month) && month !== currentMonth && "bg-amber-100/30"
                                          )}
                                        >
                                          {formatAccounting(subtotal)}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                
                                {/* Level 3: Individual items */}
                                {(groupLevel2 === 'none' || isLevel2Expanded) && items.map(item => {
                                  const isLinked = !!linkedExpenseMap[item.id];
                                  return (
                                    <div key={item.id} className="flex border-b border-border/30 h-8">
                                      {filteredMonths.map((month, monthIndex) => {
                                        const cellInfo = getCellDisplayInfo(month, item.id, 'expense');
                                        const expenseValue = cellInfo.isActual ? cellInfo.value : getExpenseValue(month, item.id);
                                        const isAutoProjected = isLinked && isProjection(month) && getMonthlyEntry(month, item.id, 'expense') === 0 && !cellInfo.isActual && expenseValue > 0;
                                        const isSelected = selectedCell?.rowId === item.id && selectedCell?.monthIndex === monthIndex && selectedCell?.type === 'expense';
                                        const isConsolidated = isCellConsolidated(month, item.name, 'despesa');
                                        return (
                                          <div 
                                            key={month} 
                                            className={cn(
                                              "flex-shrink-0 px-1 py-0.5 flex items-center relative",
                                              monthNav.isMobile ? "w-[70px]" : "w-[85px]",
                                              month === currentMonth && "bg-amber-200/50",
                                              cellInfo.isProjection && month !== currentMonth && !cellInfo.isActual && "bg-amber-100/30",
                                              isAutoProjected && "bg-warning/10",
                                              isSelected && "ring-2 ring-amber-500 ring-inset",
                                              cellInfo.isActual && "bg-green-500/10",
                                              isConsolidated && !cellInfo.isActual && "bg-green-500/5"
                                            )}
                                            onClick={() => handleCellClick(item.id, monthIndex, 'expense')}
                                          >
                                            {isEditMode ? (
                                              <CurrencyInput
                                                compact
                                                autoFocus={isSelected}
                                                className={cn(
                                                  "text-xs h-6 px-1 w-full", 
                                                  monthNav.isMobile && "h-5 px-0.5",
                                                  isAutoProjected && "bg-warning/20 border-warning/30"
                                                )}
                                                value={getDisplayValue(month, item.id, 'expense')}
                                                onChange={(value) => handleValueChange(month, item.id, 'expense', value)}
                                                placeholder="0"
                                              />
                                            ) : (
                                              <div 
                                                className={cn(
                                                  "w-full text-xs text-right px-1 py-1 rounded cursor-pointer hover:bg-muted/50 h-6 flex items-center justify-end gap-0.5",
                                                  isAutoProjected && "bg-warning/20 text-warning-foreground",
                                                  (isConsolidated || cellInfo.isActual) && "font-medium"
                                                )}
                                                onDoubleClick={() => setIsEditMode(true)}
                                              >
                                                {formatAccounting(expenseValue)}
                                                {cellInfo.isActual && !monthNav.isMobile && (
                                                  <CircleDot className="h-2 w-2 text-green-500 shrink-0" />
                                                )}
                                              </div>
                                            )}
                                            {isAutoProjected && !monthNav.isMobile && (
                                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-warning rounded-full" title="Projeção automática do bem" />
                                            )}
                                            {(isConsolidated || cellInfo.isActual) && (
                                              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}


                    {/* Balance Row */}
                    <div className="flex bg-muted-foreground/30 h-10">
                      {filteredMonths.map(month => {
                        const totals = getMonthlyTotals(month);
                        return (
                          <div 
                            key={month} 
                            className={cn(
                              "flex-shrink-0 px-2 py-2 text-right text-xs font-bold flex items-center justify-end",
                              monthNav.isMobile ? "w-[70px]" : "w-[85px]",
                              month === currentMonth && "bg-muted-foreground/40",
                              isProjection(month) && month !== currentMonth && "bg-muted-foreground/20",
                              totals.balance >= 0 ? "text-income" : "text-expense"
                            )}
                          >
                            {formatAccounting(totals.balance)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Coluna fixa direita - Total (hidden on mobile) */}
                {!monthNav.isMobile && (
                <div className="flex-shrink-0 border-l border-border bg-card z-10 w-20">
                  {/* Header */}
                  <div className="px-2 py-2 font-medium text-muted-foreground text-xs border-b border-border/50 h-12 flex items-center justify-center text-center">
                    Total
                  </div>

                  {/* Income Total */}
                  <div className="bg-income/20 px-2 py-1.5 text-right font-bold text-income text-xs h-8 flex items-center justify-end">
                    {formatAccounting(
                      allMonths.reduce((sum, month) => 
                        sum + enabledIncomeItems.reduce(
                          (s, item) => s + getIncomeEntryNet(month, item),
                          0
                        ),
                        0
                      )
                    )}
                  </div>
                  {incomeExpanded && enabledIncomeItems.map(item => {
                    const rowTotal = allMonths.reduce(
                      (sum, month) => sum + getIncomeEntryNet(month, item),
                      0
                    );
                    return (
                      <div key={item.id} className="px-2 py-1 text-right font-medium text-income text-xs border-b border-border/30 h-8 flex items-center justify-end">
                        {formatAccounting(rowTotal)}
                      </div>
                    );
                  })}

                  {/* Expense Section Header with Total */}
                  <div className="bg-expense/20 px-2 py-1.5 text-right font-bold text-expense text-xs h-8 flex items-center justify-end">
                    {formatAccounting(
                      allMonths.reduce((sum, month) => 
                        sum + enabledExpenseItems.reduce(
                          (s, item) => s + getExpenseValue(month, item.id),
                          0
                        ),
                        0
                      )
                    )}
                  </div>

                  {/* Expense by Dynamic Grouping Totals */}
                  {Object.entries(groupedExpenses).map(([level1Key, level2Groups]) => {
                    const isLevel1Expanded = expandedLevel1[level1Key] !== false;
                    const level1Total = Object.values(level2Groups).flat().reduce(
                      (sum, item) => sum + allMonths.reduce((s, month) => s + getExpenseValue(month, item.id), 0), 0
                    );
                    return (
                      <React.Fragment key={level1Key}>
                        {/* Level 1 Total */}
                        {groupLevel1 !== 'none' && (
                          <div className="bg-muted-foreground/15 px-2 py-1.5 text-right font-bold text-foreground text-xs h-8 flex items-center justify-end">
                            {formatAccounting(level1Total)}
                          </div>
                        )}
                        
                        {(groupLevel1 === 'none' || isLevel1Expanded) && Object.entries(level2Groups).map(([level2Key, items]) => {
                          const combinedKey = `${level1Key}-${level2Key}`;
                          const isLevel2Expanded = expandedLevel2[combinedKey] !== false;
                          const level2Total = items.reduce(
                            (sum, item) => sum + allMonths.reduce((s, month) => s + getExpenseValue(month, item.id), 0), 0
                          );
                          return (
                            <React.Fragment key={combinedKey}>
                              {/* Level 2 Total */}
                              {groupLevel2 !== 'none' && (
                                <div className="bg-muted/60 px-2 py-1.5 text-right font-bold text-expense text-xs h-8 flex items-center justify-end">
                                  {formatAccounting(level2Total)}
                                </div>
                              )}
                              
                              {/* Level 3: Item Totals */}
                              {(groupLevel2 === 'none' || isLevel2Expanded) && items.map(item => {
                                const rowTotal = allMonths.reduce(
                                  (sum, month) => sum + getExpenseValue(month, item.id),
                                  0
                                );
                                return (
                                  <div key={item.id} className="px-2 py-1 text-right font-medium text-expense text-xs border-b border-border/30 h-8 flex items-center justify-end">
                                    {formatAccounting(rowTotal)}
                                  </div>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}


                  {/* Balance Total */}
                  <div className="bg-muted-foreground/30 px-2 py-2 text-right text-xs font-bold h-10 flex items-center justify-end">
                    {(() => {
                      const total = allMonths.reduce((sum, month) => {
                        const totals = getMonthlyTotals(month);
                        return sum + totals.balance;
                      }, 0);
                      return (
                        <span className={total >= 0 ? "text-income" : "text-expense"}>
                          {formatAccounting(total)}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                )}
              </div>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground mt-2 text-center px-4">
              Arraste a área central para navegar pelos meses. Use TAB/Setas para navegar entre células.
            </p>
          </CardContent>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-card border"></div>
            <span>Dados Históricos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-200/50 border border-amber-400"></div>
            <span>Mês Atual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-100/30 border border-dashed border-amber-300/50"></div>
            <span>Projeção Futura</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-warning/20 border border-warning/50 relative">
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-warning rounded-full" />
            </div>
            <span>Projeção de Bem/Veículo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/10 border border-green-500/50 relative">
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
            </div>
            <span>Consolidado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">Clique nas categorias para expandir/recolher</span>
          </div>
        </div>
          </div>

      {/* Consolidação Dialog */}
      <ConsolidacaoMensalDialog
        open={consolidacaoDialogOpen}
        onOpenChange={setConsolidacaoDialogOpen}
        mesReferencia={consolidacaoMes}
        receitas={consolidationData.receitas}
        despesas={consolidationData.despesas}
        onConsolidar={handleConsolidar}
      />

      <HistoricoLancamentosDrawer
        open={historicoDrawerOpen}
        onOpenChange={setHistoricoDrawerOpen}
        lancamentos={lancamentos}
        onDelete={deleteLancamento}
        loading={lancamentosLoading}
      />

      <ProjectionImpactDialog
        open={projectionDialogOpen}
        onOpenChange={setProjectionDialogOpen}
        impact={projectionImpact}
        scope={projectionScope}
        targetMonth={projectionTargetMonth}
        onConfirm={applyProjections}
      />

      <ProjectionEditDialog
        open={projectionEditDialogOpen}
        onOpenChange={setProjectionEditDialogOpen}
        onConfirm={handleProjectionEditConfirm}
        editedCellsCount={projectionEditCells.length}
      />

      <FilterDialog
        open={filterDialogOpen}
        onOpenChange={setFilterDialogOpen}
        filterStartMonth={filterStartMonth}
        filterEndMonth={filterEndMonth}
        filterResponsible={filterResponsible}
        onFilterStartMonthChange={setFilterStartMonth}
        onFilterEndMonthChange={setFilterEndMonth}
        onFilterResponsibleChange={setFilterResponsible}
        allMonths={allMonths}
        sharedWith={config.sharedWith}
        isSharedAccount={config.accountType === 'shared'}
        formatMonthLabel={formatMonthLabel}
      />

      <GroupingDialog
        open={groupingDialogOpen}
        onOpenChange={setGroupingDialogOpen}
        groupLevel1={groupLevel1}
        groupLevel2={groupLevel2}
        onGroupLevel1Change={setGroupLevel1}
        onGroupLevel2Change={setGroupLevel2}
      />
      </div>
  );
};

export default VisaoMensalTab;
