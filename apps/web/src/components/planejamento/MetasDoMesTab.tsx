import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '@/contexts/FinancialContext';
import { useVisibility } from '@/contexts/VisibilityContext';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard,
  PiggyBank,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Save,
  RotateCcw,
  Info,
  Banknote,
  QrCode,
  Calculator,
  Sparkles,
  Barcode,
  Building,
  Pencil,
  CheckCircle2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { paymentMethods } from '@/data/defaultData';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PaymentMethod } from '@/types/financial';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Type assertions to resolve React/Radix JSX type mismatch (ReactNode vs FC return types)
type FCAny = React.ComponentType<Record<string, unknown>>;
const AlertDialogT = AlertDialog as FCAny;
const AlertDialogContentT = AlertDialogContent as FCAny;
const AlertDialogHeaderT = AlertDialogHeader as FCAny;
const AlertDialogTitleT = AlertDialogTitle as FCAny;
const AlertDialogDescriptionT = AlertDialogDescription as FCAny;
const AlertDialogFooterT = AlertDialogFooter as FCAny;
const AlertDialogCancelT = AlertDialogCancel as FCAny;
const AlertDialogActionT = AlertDialogAction as FCAny;
const TooltipT = Tooltip as FCAny;
const TooltipTriggerT = TooltipTrigger as FCAny;
const TooltipContentT = TooltipContent as FCAny;
const DropdownMenuT = DropdownMenu as FCAny;
const DropdownMenuTriggerT = DropdownMenuTrigger as FCAny;
const DropdownMenuContentT = DropdownMenuContent as FCAny;
const DropdownMenuItemT = DropdownMenuItem as FCAny;
const DialogT = Dialog as FCAny;
const DialogContentT = DialogContent as FCAny;
const DialogHeaderT = DialogHeader as FCAny;
const DialogTitleT = DialogTitle as FCAny;
const DialogDescriptionT = DialogDescription as FCAny;
import { CategoryPaymentMatrix } from '@/components/metas/CategoryPaymentMatrix';
import { useHistoricalAverages, getBaseByExpenseNature, natureBaseShortLabels } from '@/hooks/useHistoricalAverages';
import { HistoryBaseSelector } from '@/components/metas/HistoryBaseSelector';
import { useMonthlyGoals, CalculationBase, ItemGoal } from '@/hooks/useMonthlyGoals';
import { useGoalsProjectionIntegration } from '@/hooks/useGoalsProjectionIntegration';
import { GoalComparisonBadge } from '@/components/metas/GoalComparisonBadge';
import { ActualProgressBar } from '@/components/metas/ActualProgressBar';
import { formatCurrencyValue, formatMonthLabelFull, generateMonths, paymentMethodLabels } from '@/utils/planejamento';
import { MonthlyPlanChart } from '@/components/planejamento/DashboardChartsSection';
import { CategoryPieChart } from '@/components/planejamento/CategoryPieChart';

const getPaymentIcon = (method: PaymentMethod) => {
  switch (method) {
    case 'pix':
      return <QrCode className="h-4 w-4" />;
    case 'credit_card':
      return <CreditCard className="h-4 w-4" />;
    case 'debit_card':
      return <Building className="h-4 w-4" />;
    case 'auto_debit':
      return <Building className="h-4 w-4" />;
    case 'boleto':
      return <Barcode className="h-4 w-4" />;
    case 'cash':
      return <Banknote className="h-4 w-4" />;
    default:
      return <CreditCard className="h-4 w-4" />;
  }
};

interface MetasDoMesTabProps {
  initialMonth?: string;
}

export const MetasDoMesTab: React.FC<MetasDoMesTabProps> = ({ initialMonth }) => {
  const { config, getMonthlyEntry, updateExpensePaymentMethod } = useFinancial();
  
  const { 
    goals: savedGoals, 
    loading: goalsLoading, 
    getGoalByMonth, 
    saveGoal 
  } = useMonthlyGoals(initialMonth);
  
  const {
    getProjectedValue: getIntegratedProjectedValue,
    getActualValue,
    hasActualsForMonth,
    getMonthlyComparison,
    enabledIncomeItems: integrationIncomeItems,
    enabledExpenseItems: integrationExpenseItems,
  } = useGoalsProjectionIntegration();
  const { isHidden } = useVisibility();
  
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const allMonths = useMemo(() => generateMonths(2025, 24), []);
  
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(() => {
    if (initialMonth) {
      const idx = allMonths.indexOf(initialMonth);
      if (idx >= 0) return idx;
    }
    const idx = allMonths.indexOf(currentMonth);
    return idx >= 0 ? idx : 0;
  });
  const selectedMonth = allMonths[selectedMonthIndex];
  
  const canGoBack = selectedMonthIndex > 0;
  const canGoForward = selectedMonthIndex < allMonths.length - 1;
  
  const goToPreviousMonth = () => {
    if (canGoBack) setSelectedMonthIndex(prev => prev - 1);
  };
  
  const goToNextMonth = () => {
    if (canGoForward) setSelectedMonthIndex(prev => prev + 1);
  };
  
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expenseGoals, setExpenseGoals] = useState<Record<string, number>>({});
  const [incomeGoals, setIncomeGoals] = useState<Record<string, number>>({});
  const [incomeGoal, setIncomeGoal] = useState<number>(0);
  const [savingsGoal, setSavingsGoal] = useState<number>(0);
  const [paymentMethodGoals, setPaymentMethodGoals] = useState<Record<string, number>>({});
  const [calculationBase] = useState<CalculationBase>('auto_by_nature');
  const [fixedChallengePercent, setFixedChallengePercent] = useState<number>(0);
  const [semiVariableChallengePercent, setSemiVariableChallengePercent] = useState<number>(0);
  const [variableChallengePercent, setVariableChallengePercent] = useState<number>(0);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [goalsLoadedFromDb, setGoalsLoadedFromDb] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showAutoCalcDialog, setShowAutoCalcDialog] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
  
  const [itemBaseOverrides, setItemBaseOverrides] = useState<Record<string, CalculationBase>>({});
  
  const getItemBase = (itemId: string): CalculationBase => {
    return itemBaseOverrides[itemId] || calculationBase;
  };

  const setItemBase = (itemId: string, base: CalculationBase) => {
    setItemBaseOverrides(prev => ({ ...prev, [itemId]: base }));
    setHasUnsavedChanges(true);
  };
  
  const enabledIncomeItems = config.incomeItems.filter(item => item.enabled);
  const enabledExpenseItems = config.expenseItems.filter(item => item.enabled);

  const {
    loading: historicalLoading,
    getItemAverage,
    getItemData,
    getCategoryAverage,
    getGlobalTotalsByBase,
    categoryAverages,
    paymentMethodAverages,
  } = useHistoricalAverages(selectedMonth, enabledIncomeItems, enabledExpenseItems);
  
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
  
  const expensesByPaymentMethod = useMemo(() => {
    const grouped: Record<string, typeof enabledExpenseItems> = {};
    enabledExpenseItems.forEach(item => {
      const method = item.paymentMethod || 'other';
      if (!grouped[method]) {
        grouped[method] = [];
      }
      grouped[method].push(item);
    });
    return grouped;
  }, [enabledExpenseItems]);
  
  const getProjectedValue = (itemId: string, type: 'income' | 'expense') => {
    return getMonthlyEntry(selectedMonth, itemId, type);
  };
  
  const categoryProjectedTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.entries(expensesByCategory).forEach(([category, items]) => {
      totals[category] = items.reduce((sum, item) => 
        sum + getProjectedValue(item.id, 'expense'), 0);
    });
    return totals;
  }, [expensesByCategory, selectedMonth]);

  const getPreviousMonth = (month: string, offset: number) => {
    const [year, monthNum] = month.split('-').map(Number);
    const date = new Date(year, monthNum - 1 - offset, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const previousMonth1 = getPreviousMonth(selectedMonth, 1);
  const previousMonth2 = getPreviousMonth(selectedMonth, 2);

  const getCategoryHistoryTotal = (category: string, month: string) => {
    const items = expensesByCategory[category] || [];
    return items.reduce((sum, item) => sum + getMonthlyEntry(month, item.id, 'expense'), 0);
  };

  const categoryHistory = useMemo(() => {
    const history: Record<string, { month1: number; month2: number; current: number }> = {};
    Object.keys(expensesByCategory).forEach(category => {
      history[category] = {
        month2: getCategoryHistoryTotal(category, previousMonth2),
        month1: getCategoryHistoryTotal(category, previousMonth1),
        current: categoryProjectedTotals[category] || 0,
      };
    });
    return history;
  }, [expensesByCategory, previousMonth1, previousMonth2, categoryProjectedTotals]);
  
  const paymentMethodProjectedTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.entries(expensesByPaymentMethod).forEach(([method, items]) => {
      totals[method] = items.reduce((sum, item) => 
        sum + getProjectedValue(item.id, 'expense'), 0);
    });
    return totals;
  }, [expensesByPaymentMethod, selectedMonth]);
  
  const projectedIncomeTotal = useMemo(() => {
    return enabledIncomeItems.reduce((sum, item) => 
      sum + getProjectedValue(item.id, 'income'), 0);
  }, [enabledIncomeItems, selectedMonth]);
  
  const projectedExpenseTotal = useMemo(() => {
    return enabledExpenseItems.reduce((sum, item) => 
      sum + getProjectedValue(item.id, 'expense'), 0);
  }, [enabledExpenseItems, selectedMonth]);
  
  const projectedCreditCardTotal = paymentMethodProjectedTotals['credit_card'] || 0;

  const monthlyComparison = useMemo(() => 
    getMonthlyComparison(selectedMonth), 
    [selectedMonth, getMonthlyComparison]
  );

  const hasActuals = hasActualsForMonth(selectedMonth);

  const getItemActualValue = useCallback((itemId: string, itemName: string, type: 'income' | 'expense') => {
    return getActualValue(selectedMonth, itemId, itemName, type);
  }, [selectedMonth, getActualValue]);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const previousMonthRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (previousMonthRef.current === selectedMonth) return;
    if (enabledIncomeItems.length === 0 && enabledExpenseItems.length === 0) return;
    if (goalsLoading) return;
    
    const savedGoalForMonth = getGoalByMonth(selectedMonth);
    
    if (savedGoalForMonth) {
      const loadedIncomeGoals: Record<string, number> = {};
      const loadedExpenseGoals: Record<string, number> = {};
      
      Object.entries(savedGoalForMonth.item_goals || {}).forEach(([itemId, itemGoal]) => {
        const incomeItem = enabledIncomeItems.find(i => i.id === itemId);
        const expenseItem = enabledExpenseItems.find(i => i.id === itemId);
        
        if (incomeItem) {
          loadedIncomeGoals[itemId] = itemGoal.goal;
        } else if (expenseItem) {
          loadedExpenseGoals[itemId] = itemGoal.goal;
        }
      });
      
      enabledIncomeItems.forEach(item => {
        if (loadedIncomeGoals[item.id] === undefined) {
          loadedIncomeGoals[item.id] = Math.round(getIntegratedProjectedValue(item.id, 'income', selectedMonth));
        }
      });
      enabledExpenseItems.forEach(item => {
        if (loadedExpenseGoals[item.id] === undefined) {
          loadedExpenseGoals[item.id] = Math.round(getIntegratedProjectedValue(item.id, 'expense', selectedMonth));
        }
      });
      
      setIncomeGoals(loadedIncomeGoals);
      setExpenseGoals(loadedExpenseGoals);
      setIncomeGoal(savedGoalForMonth.income_goal);
      setSavingsGoal(savedGoalForMonth.savings_goal);
      setPaymentMethodGoals(savedGoalForMonth.payment_method_goals || {});
      setGoalsLoadedFromDb(true);
      
      previousMonthRef.current = selectedMonth;
      
      if (isInitialized) {
        toast.success(`Metas salvas carregadas para ${formatMonthLabelFull(selectedMonth)}`);
      } else {
        setIsInitialized(true);
      }
      
      setHasUnsavedChanges(false);
      return;
    }
    
    setGoalsLoadedFromDb(false);
    
    const newIncomeGoals: Record<string, number> = {};
    enabledIncomeItems.forEach(item => {
      const projected = getIntegratedProjectedValue(item.id, 'income', selectedMonth);
      newIncomeGoals[item.id] = Math.round(projected);
    });
    
    const newExpenseGoals: Record<string, number> = {};
    enabledExpenseItems.forEach(item => {
      const projected = getIntegratedProjectedValue(item.id, 'expense', selectedMonth);
      newExpenseGoals[item.id] = Math.round(projected);
    });
    
    const totalIncome = Object.values(newIncomeGoals).reduce((sum, val) => sum + val, 0);
    const totalExpense = Object.values(newExpenseGoals).reduce((sum, val) => sum + val, 0);
    
    setIncomeGoals(newIncomeGoals);
    setExpenseGoals(newExpenseGoals);
    setIncomeGoal(Math.round(projectedIncomeTotal));
    setSavingsGoal(Math.round(projectedIncomeTotal - projectedExpenseTotal));
    
    const newPaymentMethodGoals: Record<string, number> = {};
    Object.entries(paymentMethodProjectedTotals).forEach(([method, total]) => {
      newPaymentMethodGoals[method] = Math.round(total);
    });
    setPaymentMethodGoals(newPaymentMethodGoals);
    
    previousMonthRef.current = selectedMonth;
    
    if (isInitialized) {
      toast.info(`Metas inicializadas a partir da projeção de ${formatMonthLabelFull(selectedMonth)}`, {
        description: `Receita: ${formatCurrencyValue(totalIncome, false)} | Despesa: ${formatCurrencyValue(totalExpense, false)}`,
      });
    } else {
      setIsInitialized(true);
    }
    
    setHasUnsavedChanges(false);
  }, [selectedMonth, enabledIncomeItems, enabledExpenseItems, getIntegratedProjectedValue, projectedIncomeTotal, projectedExpenseTotal, paymentMethodProjectedTotals, isInitialized, goalsLoading, getGoalByMonth]);
  
  const totalExpenseGoal = useMemo(() => {
    return Object.values(expenseGoals).reduce((sum, val) => sum + (val || 0), 0);
  }, [expenseGoals]);
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };
  
  const handleExpenseGoalChange = (itemId: string, value: number) => {
    setExpenseGoals(prev => ({ ...prev, [itemId]: value }));
    setHasUnsavedChanges(true);
  };

  const handleIncomeGoalChange = (itemId: string, value: number) => {
    setIncomeGoals(prev => ({ ...prev, [itemId]: value }));
    setHasUnsavedChanges(true);
  };

  const totalIncomeGoal = useMemo(() => {
    return Object.values(incomeGoals).reduce((sum, val) => sum + (val || 0), 0);
  }, [incomeGoals]);
  
  const handleApplyHistorical = () => {
    const newGoals: Record<string, number> = {};
    const newOverrides: Record<string, CalculationBase> = {};
    
    enabledExpenseItems.forEach(item => {
      const itemBase = getBaseByExpenseNature(item.expenseNature);
      const avg = getItemAverage(item.id, itemBase);
      
      let challengeMultiplier = 1;
      if (item.expenseNature === 'variable') {
        challengeMultiplier = 1 - (variableChallengePercent / 100);
      } else if (item.expenseNature === 'semi_variable') {
        challengeMultiplier = 1 - (semiVariableChallengePercent / 100);
      } else if (item.expenseNature === 'fixed') {
        challengeMultiplier = 1 - (fixedChallengePercent / 100);
      }
      
      newGoals[item.id] = Math.round(avg * challengeMultiplier);
      newOverrides[item.id] = itemBase;
    });
    
    setExpenseGoals(newGoals);
    setItemBaseOverrides(newOverrides);
    setHasUnsavedChanges(true);
    
    const globals = getGlobalTotalsByBase('avg_3_months');
    setIncomeGoal(Math.round(globals.income));
    
    const totalExpenseWithChallenge = Object.values(newGoals).reduce((sum, val) => sum + val, 0);
    setSavingsGoal(Math.round(globals.income - totalExpenseWithChallenge));
    
    const fixedCount = enabledExpenseItems.filter(i => i.expenseNature === 'fixed').length;
    const semiCount = enabledExpenseItems.filter(i => i.expenseNature === 'semi_variable').length;
    const variableCount = enabledExpenseItems.filter(i => i.expenseNature === 'variable').length;
    const undefinedCount = enabledExpenseItems.filter(i => !i.expenseNature).length;
    
    const breakdown = [
      fixedCount > 0 ? `${fixedCount} fixas (M1${fixedChallengePercent > 0 ? `, -${fixedChallengePercent}%` : ''})` : '',
      semiCount > 0 ? `${semiCount} semi (M3${semiVariableChallengePercent > 0 ? `, -${semiVariableChallengePercent}%` : ''})` : '',
      variableCount > 0 ? `${variableCount} variáveis (M6${variableChallengePercent > 0 ? `, -${variableChallengePercent}%` : ''})` : '',
      undefinedCount > 0 ? `${undefinedCount} sem natureza (M3)` : '',
    ].filter(Boolean).join(' • ');
    
    toast.success(`Metas automáticas aplicadas: ${breakdown}`);
  };

  const handleApplyProjected = () => {
    const newGoals: Record<string, number> = {};
    enabledExpenseItems.forEach(item => {
      newGoals[item.id] = Math.round(getProjectedValue(item.id, 'expense'));
    });
    setExpenseGoals(newGoals);
    setIncomeGoal(Math.round(projectedIncomeTotal));
    setSavingsGoal(Math.round(projectedIncomeTotal - projectedExpenseTotal));
    setHasUnsavedChanges(true);
    toast.success('Metas baseadas na projeção aplicadas!');
  };

  const handleResetToProjection = () => {
    const newIncomeGoals: Record<string, number> = {};
    enabledIncomeItems.forEach(item => {
      const projected = getIntegratedProjectedValue(item.id, 'income', selectedMonth);
      newIncomeGoals[item.id] = Math.round(projected);
    });
    
    const newExpenseGoals: Record<string, number> = {};
    enabledExpenseItems.forEach(item => {
      const projected = getIntegratedProjectedValue(item.id, 'expense', selectedMonth);
      newExpenseGoals[item.id] = Math.round(projected);
    });
    
    const newPaymentMethodGoals: Record<string, number> = {};
    Object.entries(paymentMethodProjectedTotals).forEach(([method, total]) => {
      newPaymentMethodGoals[method] = Math.round(total);
    });
    
    setIncomeGoals(newIncomeGoals);
    setExpenseGoals(newExpenseGoals);
    setPaymentMethodGoals(newPaymentMethodGoals);
    setIncomeGoal(Math.round(projectedIncomeTotal));
    setSavingsGoal(Math.round(projectedIncomeTotal - projectedExpenseTotal));
    
    setFixedChallengePercent(0);
    setSemiVariableChallengePercent(0);
    setVariableChallengePercent(0);
    
    setGoalsLoadedFromDb(false);
    setHasUnsavedChanges(true);
    toast.success('Metas resetadas para os valores de projeção!');
  };
  
  const handleSaveGoals = async () => {
    const itemGoals: Record<string, ItemGoal> = {};
    
    enabledIncomeItems.forEach(item => {
      itemGoals[item.id] = {
        goal: incomeGoals[item.id] || 0,
        challenge: 0,
      };
    });
    
    enabledExpenseItems.forEach(item => {
      let challengePercent = 0;
      if (item.expenseNature === 'fixed') challengePercent = fixedChallengePercent;
      else if (item.expenseNature === 'semi_variable') challengePercent = semiVariableChallengePercent;
      else if (item.expenseNature === 'variable') challengePercent = variableChallengePercent;
      
      itemGoals[item.id] = {
        goal: expenseGoals[item.id] || 0,
        challenge: challengePercent,
      };
    });
    
    const success = await saveGoal({
      month: selectedMonth,
      income_goal: totalIncomeGoal,
      expense_goal: totalExpenseGoal,
      savings_goal: savingsGoal,
      credit_card_goal: paymentMethodGoals['credit_card'] || 0,
      calculation_base: calculationBase,
      challenge_percent: 0,
      item_goals: itemGoals,
      payment_method_goals: paymentMethodGoals,
    });
    
    if (success) {
      setHasUnsavedChanges(false);
      setGoalsLoadedFromDb(true);
    }
  };

  const historicalTotals = useMemo(() => {
    return getGlobalTotalsByBase(calculationBase);
  }, [calculationBase, getGlobalTotalsByBase]);
  
  const formatCurrency = (value: number) => formatCurrencyValue(value, isHidden);
  
  const getDiffBadge = (goal: number, projected: number) => {
    if (goal === 0 || projected === 0) return null;
    const diff = ((goal - projected) / projected) * 100;
    const isPositive = diff <= 0;
    
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs",
          isPositive ? "text-income border-income/30" : "text-expense border-expense/30"
        )}
      >
        {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
      </Badge>
    );
  };

  // Get actual value for income items
  const getIncomeItemActual = useCallback((itemId: string, itemName: string) => {
    return getActualValue(selectedMonth, itemId, itemName, 'income');
  }, [selectedMonth, getActualValue]);

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={goToPreviousMonth}
            disabled={!canGoBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-lg font-semibold min-w-[180px] text-center">
            {formatMonthLabelFull(selectedMonth)}
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={goToNextMonth}
            disabled={!canGoForward}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {goalsLoading ? (
          <Badge variant="outline" className="text-muted-foreground">
            Carregando...
          </Badge>
        ) : goalsLoadedFromDb ? (
          <Badge variant="outline" className="text-income border-income/30 bg-income/5">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Metas salvas carregadas
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Metas da projeção (não salvas)
          </Badge>
        )}
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="flex flex-col [&>*]:flex-1">
          <MonthlyPlanChart selectedMonth={selectedMonth} />
        </div>
        <div className="flex flex-col [&>*]:flex-1">
          <CategoryPieChart selectedMonth={selectedMonth} />
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialogT open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContentT>
          <AlertDialogHeaderT>
            <AlertDialogTitleT>Resetar metas para projeção?</AlertDialogTitleT>
            <AlertDialogDescriptionT>
              Esta ação irá substituir todas as metas personalizadas pelos valores originais da projeção do planejamento. Os desafios de redução também serão zerados.
            </AlertDialogDescriptionT>
          </AlertDialogHeaderT>
          <AlertDialogFooterT>
            <AlertDialogCancelT>Cancelar</AlertDialogCancelT>
            <AlertDialogActionT onClick={handleResetToProjection}>
              Confirmar Reset
            </AlertDialogActionT>
          </AlertDialogFooterT>
        </AlertDialogContentT>
      </AlertDialogT>
      
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Meta de Receita */}
        <Card className="border-income/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-income" />
              Meta de Receita
            </CardTitle>
            <CardDescription>
              Projeção: {formatCurrency(projectedIncomeTotal)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-income">
              {formatCurrency(totalIncomeGoal || incomeGoal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Soma das receitas abaixo
            </p>
            {totalIncomeGoal > 0 && projectedIncomeTotal > 0 && (
              <div className="mt-2">
                <GoalComparisonBadge
                  value={totalIncomeGoal}
                  base={projectedIncomeTotal}
                  type="income"
                  size="sm"
                  showIcon
                />
                <span className="text-[10px] text-muted-foreground ml-1">vs projeção</span>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Meta de Despesas Total */}
        <Card className="border-expense/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-expense" />
              Meta de Despesas
            </CardTitle>
            <CardDescription>
              Projeção: {formatCurrency(projectedExpenseTotal)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalExpenseGoal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Soma dos itens abaixo
            </p>
            {totalExpenseGoal > 0 && projectedExpenseTotal > 0 && (
              <div className="mt-2">
                <GoalComparisonBadge
                  value={totalExpenseGoal}
                  base={projectedExpenseTotal}
                  type="expense"
                  size="sm"
                  showIcon
                />
                <span className="text-[10px] text-muted-foreground ml-1">vs projeção</span>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Realizado */}
        <Card className={cn(
          "border-primary/30",
          hasActuals ? "bg-income/5" : "bg-muted/20"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className={cn(
                "h-5 w-5",
                hasActuals ? "text-income" : "text-muted-foreground"
              )} />
              Realizado
            </CardTitle>
            <CardDescription>
              {hasActuals ? (
                <>Receita: {formatCurrency(monthlyComparison.actualIncome)} | Despesa: {formatCurrency(monthlyComparison.actualExpense)}</>
              ) : (
                'Nenhum lançamento ainda'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasActuals ? (
              <>
                <div className={cn(
                  "text-2xl font-bold",
                  monthlyComparison.actualSavings >= 0 ? "text-income" : "text-expense"
                )}>
                  {formatCurrency(monthlyComparison.actualSavings)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Economia realizada
                </p>
                {(totalIncomeGoal || incomeGoal) > 0 && (
                  <div className="mt-2 space-y-1">
                    <ActualProgressBar
                      actual={monthlyComparison.actualIncome}
                      goal={totalIncomeGoal || incomeGoal}
                      type="income"
                      showLabel
                      showIcon={false}
                    />
                    <span className="text-[10px] text-muted-foreground">receita vs meta</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-lg text-muted-foreground">
                Aguardando lançamentos
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Meta de Economia */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-primary" />
              Meta de Economia
            </CardTitle>
            <CardDescription>
              Projeção: {formatCurrency(projectedIncomeTotal - projectedExpenseTotal)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency((totalIncomeGoal || incomeGoal) - totalExpenseGoal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receita − Despesas (automático)
            </p>
            {(totalIncomeGoal || incomeGoal) > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {((((totalIncomeGoal || incomeGoal) - totalExpenseGoal) / (totalIncomeGoal || incomeGoal)) * 100).toFixed(0)}% da receita
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento de Receitas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-income" />
              Metas por Fonte de Receita
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleApplyProjected}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Usar Projeção
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] min-w-[140px]">Fonte de Receita</TableHead>
                <TableHead className="text-[10px] hidden md:table-cell text-center">Projeção</TableHead>
                <TableHead className="text-[10px] text-center w-[140px] md:w-[150px]">Meta</TableHead>
                <TableHead className="text-[10px] w-[50px] text-center">Δ Proj.</TableHead>
                <TableHead className="text-[10px] hidden sm:table-cell text-center">Realizado</TableHead>
                <TableHead className="text-[10px] hidden sm:table-cell w-[60px] text-center">Δ Meta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enabledIncomeItems.map(item => {
                const projected = getProjectedValue(item.id, 'income');
                const goal = incomeGoals[item.id] || 0;
                const actual = getItemActualValue(item.id, item.name, 'income');
                
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="text-[13px]">{item.name}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center text-[13px] font-numeric text-muted-foreground">
                      {formatCurrency(projected)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <div className="relative w-[130px] md:w-[140px]">
                          <CurrencyInput
                            value={goal}
                            onChange={(val) => handleIncomeGoalChange(item.id, val)}
                            className="w-full text-sm text-center"
                            maxDigits={9}
                          />
                          <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {goal > 0 && projected > 0 && (
                        <GoalComparisonBadge
                          value={goal}
                          base={projected}
                          type="income"
                          size="sm"
                        />
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center">
                      {actual > 0 ? (
                        <span className="text-[13px] font-numeric font-medium text-income">
                          {formatCurrency(actual)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center">
                      {actual > 0 && goal > 0 && (
                        <GoalComparisonBadge
                          value={actual}
                          base={goal}
                          type="income"
                          size="sm"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      
      {/* Meta por Forma de Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Meta por Forma de Pagamento
          </CardTitle>
          <CardDescription>
            Defina metas por forma de pagamento. Por padrão, a meta é o consolidado do orçamento detalhado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['credit_card', 'pix', 'boleto', 'auto_debit'] as PaymentMethod[]).map((method) => {
              const consolidatedTotal = paymentMethodProjectedTotals[method] || 0;
              const goal = paymentMethodGoals[method] ?? consolidatedTotal;
              const diff = goal - consolidatedTotal;
              const hasDiff = paymentMethodGoals[method] !== undefined && diff !== 0;
              
              return (
                <div key={method} className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2">
                    {getPaymentIcon(method)}
                    <span className="text-sm font-medium">{paymentMethodLabels[method]}</span>
                  </div>
                  <div className="space-y-1">
                    <CurrencyInput
                      value={goal}
                      onChange={(val) => setPaymentMethodGoals(prev => ({ ...prev, [method]: val }))}
                      className="h-8 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Consolidado: {formatCurrency(consolidatedTotal)}
                    </p>
                    {hasDiff && (
                      <p className={cn(
                        "text-xs font-medium",
                        diff > 0 ? "text-expense" : "text-income"
                      )}>
                        {diff > 0 ? '+' : ''}{formatCurrency(diff)} {diff > 0 ? 'acima' : 'abaixo'} do orçamento
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Matriz Categoria × Pagamento */}
      <CategoryPaymentMatrix 
        expenseItems={enabledExpenseItems}
        getItemGoal={(itemId) => expenseGoals[itemId] || 0}
      />
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Metas por Grupo de Despesa
              </CardTitle>
              <TooltipT>
                <TooltipTriggerT asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => setShowAutoCalcDialog(true)}
                  >
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTriggerT>
                <TooltipContentT>
                  <p>Configurar cálculo automático de metas</p>
                </TooltipContentT>
              </TooltipT>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const newGoals: Record<string, number> = {};
                enabledExpenseItems.forEach(item => {
                  const itemBase = getItemBase(item.id);
                  let challengeMultiplier = 1;
                  if (item.expenseNature === 'variable') {
                    challengeMultiplier = 1 - (variableChallengePercent / 100);
                  } else if (item.expenseNature === 'semi_variable') {
                    challengeMultiplier = 1 - (semiVariableChallengePercent / 100);
                  } else if (item.expenseNature === 'fixed') {
                    challengeMultiplier = 1 - (fixedChallengePercent / 100);
                  }
                  newGoals[item.id] = Math.round(getItemAverage(item.id, itemBase) * challengeMultiplier);
                });
                setExpenseGoals(newGoals);
                toast.success('Metas de despesas baseadas no histórico aplicadas!');
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Aplicar Histórico
            </Button>
          </div>
          <CardDescription>
            Configure a base histórica por item. No desktop, veja os últimos 6 meses.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] min-w-[140px] max-w-[180px]">Item de Despesa</TableHead>
                <TableHead className="text-[10px] text-center w-[50px]">Base</TableHead>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <TableHead key={idx} className="text-[10px] hidden lg:table-cell text-center text-muted-foreground w-[45px] whitespace-nowrap">
                    M-{6 - idx}
                  </TableHead>
                ))}
                <TableHead className="text-[10px] text-center w-[65px] md:w-[75px]">Média</TableHead>
                <TableHead className="text-[10px] hidden md:table-cell text-center w-[75px]">Projeção</TableHead>
                <TableHead className="text-[10px] text-center w-[140px] md:w-[150px]">Meta</TableHead>
                <TableHead className="text-[10px] w-[50px] text-center">Δ Proj.</TableHead>
                <TableHead className="text-[10px] hidden sm:table-cell text-center w-[75px]">Realizado</TableHead>
                <TableHead className="text-[10px] hidden sm:table-cell w-[60px] text-center">Δ Meta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(expensesByCategory).map(([category, items]) => {
                const isExpanded = expandedCategories[category] ?? false;
                const categoryTotal = items.reduce((sum, item) => 
                  sum + (expenseGoals[item.id] || 0), 0);
                const categoryAvg = items.reduce((sum, item) => 
                  sum + getItemAverage(item.id, getItemBase(item.id)), 0);
                
                return (
                  <React.Fragment key={category}>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50 bg-muted/30"
                      onClick={() => toggleCategory(category)}
                    >
                      <TableCell className="font-semibold" colSpan={2}>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          {category}
                          <Badge variant="secondary" className="ml-1">{items.length}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell" colSpan={6}></TableCell>
                      <TableCell className="text-center text-[13px] font-numeric text-muted-foreground">
                        {formatCurrency(categoryAvg)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell"></TableCell>
                      <TableCell className="text-center text-[13px] font-numeric font-semibold">
                        {formatCurrency(categoryTotal)}
                      </TableCell>
                      <TableCell className="text-center">
                        {categoryTotal > 0 && categoryAvg > 0 && (
                          <GoalComparisonBadge
                            value={categoryTotal}
                            base={categoryAvg}
                            type="expense"
                            size="sm"
                          />
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell"></TableCell>
                      <TableCell className="hidden sm:table-cell"></TableCell>
                    </TableRow>
                    
                    {isExpanded && items.map(item => {
                      const itemBase = getItemBase(item.id);
                      const itemData = getItemData(item.id);
                      const historicalAvg = getItemAverage(item.id, itemBase);
                      const goal = expenseGoals[item.id] || 0;
                      const last12 = itemData?.last12Months || [];
                      const last6 = last12.slice(-6);
                      const projected = getProjectedValue(item.id, 'expense');
                      const actual = getItemActualValue(item.id, item.name, 'expense');
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="pl-8">
                            <div className="flex items-center gap-2">
                              <DropdownMenuT>
                                <DropdownMenuTriggerT asChild>
                                  <button className="p-1 rounded hover:bg-muted transition-colors cursor-pointer" title="Alterar forma de pagamento">
                                    {getPaymentIcon(item.paymentMethod)}
                                  </button>
                                </DropdownMenuTriggerT>
                                <DropdownMenuContentT align="start">
                                  {paymentMethods.map((method) => (
                                    <DropdownMenuItemT
                                      key={method.value}
                                      onClick={() => updateExpensePaymentMethod(item.id, method.value)}
                                      className={cn(
                                        "flex items-center gap-2",
                                        item.paymentMethod === method.value && "bg-muted"
                                      )}
                                    >
                                      {getPaymentIcon(method.value)}
                                      <span>{method.label}</span>
                                    </DropdownMenuItemT>
                                  ))}
                                </DropdownMenuContentT>
                              </DropdownMenuT>
                              <span className="text-sm truncate">{item.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <HistoryBaseSelector
                              value={itemBase}
                              onChange={(base) => setItemBase(item.id, base)}
                              variant="inline"
                            />
                          </TableCell>
                          {last6.map((m, idx) => (
                            <TableCell key={idx} className="hidden lg:table-cell text-center text-[13px] font-numeric text-muted-foreground">
                              {formatCurrency(m.value)}
                            </TableCell>
                          ))}
                          {Array.from({ length: 6 - last6.length }).map((_, idx) => (
                            <TableCell key={`empty-6-${idx}`} className="hidden lg:table-cell text-center text-sm text-muted-foreground">
                              -
                            </TableCell>
                          ))}
                          <TableCell className="text-center text-[13px] font-numeric font-medium">
                            {formatCurrency(historicalAvg)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-center text-[13px] font-numeric text-muted-foreground">
                            {formatCurrency(projected)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center">
                              <div className="relative w-[130px] md:w-[140px]">
                                <CurrencyInput
                                  value={goal}
                                  onChange={(val) => handleExpenseGoalChange(item.id, val)}
                                  className="w-full text-sm text-center"
                                  maxDigits={9}
                                />
                                <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {goal > 0 && projected > 0 && (
                              <GoalComparisonBadge
                                value={goal}
                                base={projected}
                                type="expense"
                                size="sm"
                              />
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-center">
                            {actual > 0 ? (
                              <span className="text-[13px] font-numeric font-medium text-expense">
                                {formatCurrency(actual)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-center">
                            {actual > 0 && goal > 0 && (
                              <GoalComparisonBadge
                                value={actual}
                                base={goal}
                                type="expense"
                                size="sm"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {/* Total Row */}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell></TableCell>
                <TableCell className="hidden lg:table-cell" colSpan={6}></TableCell>
                <TableCell className="text-center text-[13px] font-numeric">{formatCurrency(historicalTotals.expense)}</TableCell>
                <TableCell className="hidden md:table-cell text-center text-[13px] font-numeric">{formatCurrency(projectedExpenseTotal)}</TableCell>
                <TableCell className="text-center text-[13px] font-numeric text-expense">{formatCurrency(totalExpenseGoal)}</TableCell>
                <TableCell className="text-center">
                  {totalExpenseGoal > 0 && projectedExpenseTotal > 0 && (
                    <GoalComparisonBadge
                      value={totalExpenseGoal}
                      base={projectedExpenseTotal}
                      type="expense"
                      size="sm"
                    />
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-center">
                  {monthlyComparison.hasActuals && monthlyComparison.actualExpense > 0 ? (
                    <span className="text-[13px] font-numeric font-medium text-expense">
                      {formatCurrency(monthlyComparison.actualExpense)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-center">
                  {monthlyComparison.hasActuals && monthlyComparison.actualExpense > 0 && totalExpenseGoal > 0 && (
                    <GoalComparisonBadge
                      value={monthlyComparison.actualExpense}
                      base={totalExpenseGoal}
                      type="expense"
                      size="sm"
                    />
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Botão de Salvar */}
      <div className="flex justify-end gap-3">
        <Button onClick={handleSaveGoals}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Metas
        </Button>
      </div>

      {/* Dialog de Configuração de Cálculo Automático */}
      <DialogT open={showAutoCalcDialog} onOpenChange={setShowAutoCalcDialog}>
        <DialogContentT className="max-w-2xl">
          <DialogHeaderT>
            <DialogTitleT className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Base de Cálculo Automático
            </DialogTitleT>
            <DialogDescriptionT>
              Fixa: último mês • Semi-variável: média 3 meses • Variável: média 6 meses
            </DialogDescriptionT>
          </DialogHeaderT>
          
          <div className="flex flex-col gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Fixed Challenge */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Fixas
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="0" 
                    max="20" 
                    step="1"
                    value={fixedChallengePercent}
                    onChange={(e) => setFixedChallengePercent(Number(e.target.value))}
                    className="flex-1 accent-blue-500"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">-</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={fixedChallengePercent}
                      onChange={(e) => setFixedChallengePercent(Math.min(50, Math.max(0, Number(e.target.value))))}
                      className="w-12 h-7 text-center text-sm border rounded-md bg-background"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              {/* Semi-Variable Challenge */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Semi-variáveis
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="0" 
                    max="30" 
                    step="1"
                    value={semiVariableChallengePercent}
                    onChange={(e) => setSemiVariableChallengePercent(Number(e.target.value))}
                    className="flex-1 accent-amber-500"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">-</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={semiVariableChallengePercent}
                      onChange={(e) => setSemiVariableChallengePercent(Math.min(50, Math.max(0, Number(e.target.value))))}
                      className="w-12 h-7 text-center text-sm border rounded-md bg-background"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              {/* Variable Challenge */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-expense" />
                  Variáveis
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="0" 
                    max="50" 
                    step="1"
                    value={variableChallengePercent}
                    onChange={(e) => setVariableChallengePercent(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">-</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={variableChallengePercent}
                      onChange={(e) => setVariableChallengePercent(Math.min(50, Math.max(0, Number(e.target.value))))}
                      className="w-12 h-7 text-center text-sm border rounded-md bg-background"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            </div>

            {!historicalLoading && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm font-medium mb-2">Sugestão automática por natureza:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Receita:</span>
                    <span className="ml-2 font-medium text-income">{formatCurrency(historicalTotals.income)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Despesa:</span>
                    <span className="ml-2 font-medium text-expense">
                      {formatCurrency(historicalTotals.expense)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Economia:</span>
                    <span className="ml-2 font-medium text-primary">
                      {formatCurrency(historicalTotals.income - historicalTotals.expense)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cartão:</span>
                    <span className="ml-2 font-medium">
                      {formatCurrency(historicalTotals.creditCard)}
                    </span>
                  </div>
                </div>
                {(fixedChallengePercent > 0 || semiVariableChallengePercent > 0 || variableChallengePercent > 0) && (
                  <p className="text-xs text-income mt-2">
                    💰 Desafios: {[
                      fixedChallengePercent > 0 ? `Fixas -${fixedChallengePercent}%` : '',
                      semiVariableChallengePercent > 0 ? `Semi -${semiVariableChallengePercent}%` : '',
                      variableChallengePercent > 0 ? `Variáveis -${variableChallengePercent}%` : ''
                    ].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowResetDialog(true)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Resetar para Projeção
              </Button>
              <Button onClick={() => {
                handleApplyHistorical();
                setShowAutoCalcDialog(false);
              }} disabled={historicalLoading}>
                <Sparkles className="h-4 w-4 mr-2" />
                Aplicar Metas Automáticas
              </Button>
            </div>
          </div>
        </DialogContentT>
      </DialogT>
    </div>
  );
};

export default MetasDoMesTab;
