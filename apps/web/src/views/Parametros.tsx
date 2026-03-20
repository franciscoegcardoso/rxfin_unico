import React, { useState } from 'react';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { useFinancial } from '@/contexts/FinancialContext';
import { Settings, TrendingUp, Wallet, Plus, ChevronDown, ChevronUp, Pencil, Trash2, AlertTriangle, Barcode, QrCode, CreditCard, Banknote, Building, User, Users, AlertCircle, Tag } from 'lucide-react';
import { RegrasCategoriaTab } from '@/components/parametros/RegrasCategoriaTab';

import { useIsMobile } from '@/hooks/use-mobile';
import { ExpenseListMobile } from '@/components/parametros/ExpenseListMobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentMethod, IncomeItem, ExpenseItem, ExpenseNature, RecurrenceType } from '@/types/financial';
import { paymentMethods, expenseCategories } from '@/data/defaultData';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { AdminDefaultIncomeInline, AdminDefaultExpenseInline } from '@/components/parametros/AdminDefaultsInline';

// Nature and recurrence labels for display
const natureLabels: Record<ExpenseNature, string> = {
  fixed: 'Fixa',
  semi_variable: 'Semi',
  variable: 'Var.',
};

const recurrenceLabels: Record<RecurrenceType, string> = {
  daily: 'Diária',
  weekly: 'Sem.',
  monthly: 'Mensal',
  quarterly: 'Trim.',
  semiannual: 'Sem.',
  annual: 'Anual',
};
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IncomeDetailSheet } from '@/components/parametros/IncomeDetailSheet';
import { ExpenseDetailSheet } from '@/components/parametros/ExpenseDetailSheet';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const Parametros: React.FC = () => {
  const {
    config,
    toggleIncomeItem,
    updateIncomeMethod,
    updateIncomeResponsible,
    updateIncomeItem,
    removeIncomeItem,
    hasIncomeItemDependencies,
    toggleExpenseItem,
    updateExpensePaymentMethod,
    updateExpenseResponsible,
    updateExpenseItem,
    removeExpenseItem,
    hasExpenseItemDependencies,
    addExpenseItem,
    addIncomeItem,
  } = useFinancial();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { isAdmin } = useIsAdmin();
  const defaultTab = searchParams.get('tab') === 'regras' ? 'regras' : searchParams.get('tab') === 'expenses' ? 'expenses' : 'income';

  const [expandedCategories, setExpandedCategories] = useState<string[]>(['home', 'food']);
  const [expenseGroupByPerson, setExpenseGroupByPerson] = useState(false);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [newIncomeName, setNewIncomeName] = useState('');
  const [newExpense, setNewExpense] = useState({
    name: '',
    categoryId: '',
    paymentMethod: 'credit_card' as PaymentMethod,
  });

  // Detail sheet states
  const [selectedIncome, setSelectedIncome] = useState<IncomeItem | null>(null);
  const [incomeSheetOpen, setIncomeSheetOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);

  // Delete dialog states
  const [incomeToDelete, setIncomeToDelete] = useState<IncomeItem | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expenseDeleteConfirmOpen, setExpenseDeleteConfirmOpen] = useState(false);
  const [dependencyBlockOpen, setDependencyBlockOpen] = useState(false);
  const [expenseDependencyBlockOpen, setExpenseDependencyBlockOpen] = useState(false);

  // Pending delete refs for undo functionality
  const pendingIncomeDeleteRef = React.useRef<{ timeoutId: number; item: IncomeItem } | null>(null);
  const pendingExpenseDeleteRef = React.useRef<{ timeoutId: number; item: ExpenseItem } | null>(null);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getItemsByCategory = (categoryId: string) => {
    return config.expenseItems.filter(item => item.categoryId === categoryId);
  };

  // Get default responsible person (first person in sharedWith or profile name)
  const getDefaultResponsible = () => {
    if (config.sharedWith.length > 0) {
      return config.sharedWith[0].id;
    }
    return undefined;
  };

  const handleAddIncome = () => {
    if (newIncomeName.trim()) {
      addIncomeItem({
        name: newIncomeName.trim(),
        enabled: true,
        method: 'net',
        responsiblePersonId: config.accountType === 'shared' ? getDefaultResponsible() : undefined,
      });
      setNewIncomeName('');
      setIncomeDialogOpen(false);
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
        responsiblePersonId: config.accountType === 'shared' ? getDefaultResponsible() : undefined,
      });
      setNewExpense({ name: '', categoryId: '', paymentMethod: 'credit_card' });
      setExpenseDialogOpen(false);
    }
  };

  const getPersonName = (personId: string | undefined) => {
    if (!personId) return null;
    return config.sharedWith.find(p => p.id === personId)?.name || null;
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'boleto': return Barcode;
      case 'pix': return QrCode;
      case 'credit_card': return CreditCard;
      case 'debit_card': return Building;
      case 'cash': return Banknote;
      default: return CreditCard;
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    const found = paymentMethods.find(m => m.value === method);
    return found?.label || method;
  };

  const openIncomeDetail = (item: IncomeItem) => {
    setSelectedIncome(item);
    setIncomeSheetOpen(true);
  };

  const openExpenseDetail = (item: ExpenseItem) => {
    setSelectedExpense(item);
    setExpenseSheetOpen(true);
  };

  // Execute income deletion with undo toast
  const executeIncomeDeleteWithUndo = (item: IncomeItem) => {
    // Clear any existing pending delete
    if (pendingIncomeDeleteRef.current) {
      clearTimeout(pendingIncomeDeleteRef.current.timeoutId);
    }

    // Set up pending delete with 5 second delay
    const timeoutId = window.setTimeout(() => {
      removeIncomeItem(item.id);
      pendingIncomeDeleteRef.current = null;
    }, 5000);

    pendingIncomeDeleteRef.current = { timeoutId, item };

    // Show toast with undo option
    toast(`Receita "${item.name}" excluída`, {
      description: 'Clique em Desfazer para cancelar a exclusão.',
      action: {
        label: 'Desfazer',
        onClick: () => {
          if (pendingIncomeDeleteRef.current) {
            clearTimeout(pendingIncomeDeleteRef.current.timeoutId);
            pendingIncomeDeleteRef.current = null;
            toast.success('Exclusão cancelada');
          }
        },
      },
      duration: 5000,
    });
  };

  // Handle delete income item (shows dialog for desktop, or direct delete for mobile)
  const handleDeleteIncomeClick = (item: IncomeItem, skipDialog = false) => {
    // Check for dependencies
    if (hasIncomeItemDependencies(item.id)) {
      setIncomeToDelete(item);
      setDependencyBlockOpen(true);
      return;
    }
    
    if (skipDialog) {
      // Mobile: direct delete with undo
      executeIncomeDeleteWithUndo(item);
    } else {
      // Desktop: show confirmation dialog
      setIncomeToDelete(item);
      setDeleteConfirmOpen(true);
    }
  };

  const confirmDeleteIncome = () => {
    if (incomeToDelete) {
      executeIncomeDeleteWithUndo(incomeToDelete);
      setIncomeToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  // Execute expense deletion with undo toast
  const executeExpenseDeleteWithUndo = (item: ExpenseItem) => {
    // Clear any existing pending delete
    if (pendingExpenseDeleteRef.current) {
      clearTimeout(pendingExpenseDeleteRef.current.timeoutId);
    }

    // Set up pending delete with 5 second delay
    const timeoutId = window.setTimeout(() => {
      removeExpenseItem(item.id);
      pendingExpenseDeleteRef.current = null;
    }, 5000);

    pendingExpenseDeleteRef.current = { timeoutId, item };

    // Show toast with undo option
    toast(`Despesa "${item.name}" excluída`, {
      description: 'Clique em Desfazer para cancelar a exclusão.',
      action: {
        label: 'Desfazer',
        onClick: () => {
          if (pendingExpenseDeleteRef.current) {
            clearTimeout(pendingExpenseDeleteRef.current.timeoutId);
            pendingExpenseDeleteRef.current = null;
            toast.success('Exclusão cancelada');
          }
        },
      },
      duration: 5000,
    });
  };

  // Handle delete expense item (shows dialog for desktop, or direct delete for mobile)
  const handleDeleteExpenseClick = (item: ExpenseItem, skipDialog = false) => {
    if (hasExpenseItemDependencies(item.id)) {
      setExpenseToDelete(item);
      setExpenseDependencyBlockOpen(true);
      return;
    }

    if (skipDialog) {
      // Mobile: direct delete with undo
      executeExpenseDeleteWithUndo(item);
    } else {
      // Desktop: show confirmation dialog
      setExpenseToDelete(item);
      setExpenseDeleteConfirmOpen(true);
    }
  };

  const confirmDeleteExpense = () => {
    if (expenseToDelete) {
      executeExpenseDeleteWithUndo(expenseToDelete);
      setExpenseToDelete(null);
      setExpenseDeleteConfirmOpen(false);
    }
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Parâmetros</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Configure suas receitas e despesas</p>
          </div>
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
            <Settings className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="income" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Receitas
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2">
              <Wallet className="h-4 w-4" />
              Despesas
            </TabsTrigger>
            <TabsTrigger value="regras" className="gap-2">
              <Tag className="h-4 w-4" />
              Regras
            </TabsTrigger>
          </TabsList>

          {/* Income Tab */}
          <TabsContent value="income">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg gradient-income flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-primary-foreground" />
                  </div>
                  Linhas de Receita
                </CardTitle>
                <Dialog open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Receita
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card">
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
                      <Button onClick={handleAddIncome} className="w-full">
                        Adicionar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Admin Default Income Items */}
                {isAdmin && <AdminDefaultIncomeInline />}

                {config.accountType === 'shared' ? (
                  // Grouped by responsible person
                  <>
                    {/* Items without responsible */}
                    {(() => {
                      const unassignedItems = config.incomeItems.filter(item => !item.responsiblePersonId);
                      if (unassignedItems.length === 0) return null;
                      
                      return (
                        <div className="border border-destructive/50 rounded-lg overflow-hidden bg-destructive/5">
                          <div className="bg-destructive/10 border-b border-destructive/30 px-3 py-2 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <span className="text-sm font-medium text-destructive">Sem responsável</span>
                            <span className="text-xs bg-destructive/20 px-1.5 py-0.5 rounded text-destructive ml-auto">
                              {unassignedItems.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-[40px,1fr,60px] gap-2 px-3 py-2 bg-muted/30 border-b border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            <span></span>
                            <span>Fonte de Receita</span>
                            <span className="text-center">Ações</span>
                          </div>
                          <div className="divide-y divide-border">
                            {unassignedItems.map((item) => (
                              <div
                                key={item.id}
                                className={cn(
                                  "grid grid-cols-[40px,1fr,60px] gap-2 px-3 py-2 items-center transition-colors hover:bg-accent/30",
                                  item.enabled ? "bg-income-light/20" : ""
                                )}
                              >
                                <div className="flex justify-center">
                                  <Switch
                                    checked={item.enabled}
                                    onCheckedChange={() => toggleIncomeItem(item.id)}
                                    className="scale-75"
                                  />
                                </div>
                                <span className={cn(
                                  "font-medium text-sm truncate",
                                  item.enabled ? "text-foreground" : "text-muted-foreground"
                                )}>
                                  {item.name}
                                </span>
                                <div className="flex justify-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => openIncomeDetail(item)}
                                    disabled={!item.enabled}
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                  {!isMobile && (
                                    item.isSystemDefault ? (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0 opacity-50 cursor-not-allowed"
                                              disabled
                                            >
                                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-[200px] text-center">
                                            <p className="text-xs">Itens padrão não podem ser excluídos</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteIncomeClick(item)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Items grouped by person */}
                    {config.sharedWith.map((person) => {
                      const personItems = config.incomeItems.filter(item => item.responsiblePersonId === person.id);
                      if (personItems.length === 0) return null;
                      
                      return (
                        <div key={person.id} className="border border-border rounded-lg overflow-hidden">
                          <div className="bg-primary/5 border-b border-border px-3 py-2 flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                              <User className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-foreground">{person.name}</span>
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-auto">
                              {personItems.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-[40px,1fr,60px] gap-2 px-3 py-2 bg-muted/30 border-b border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            <span></span>
                            <span>Fonte de Receita</span>
                            <span className="text-center">Ações</span>
                          </div>
                          <div className="divide-y divide-border">
                            {personItems.map((item) => (
                              <div
                                key={item.id}
                                className={cn(
                                  "grid grid-cols-[40px,1fr,60px] gap-2 px-3 py-2 items-center transition-colors hover:bg-accent/30",
                                  item.enabled ? "bg-income-light/20" : ""
                                )}
                              >
                                <div className="flex justify-center">
                                  <Switch
                                    checked={item.enabled}
                                    onCheckedChange={() => toggleIncomeItem(item.id)}
                                    className="scale-75"
                                  />
                                </div>
                                <span className={cn(
                                  "font-medium text-sm truncate",
                                  item.enabled ? "text-foreground" : "text-muted-foreground"
                                )}>
                                  {item.name}
                                </span>
                                <div className="flex justify-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => openIncomeDetail(item)}
                                    disabled={!item.enabled}
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                  {!isMobile && (
                                    item.isSystemDefault ? (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0 opacity-50 cursor-not-allowed"
                                              disabled
                                            >
                                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-[200px] text-center">
                                            <p className="text-xs">Itens padrão não podem ser excluídos</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteIncomeClick(item)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  // Single user - simple list
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[40px,1fr,60px] gap-2 px-3 py-2 bg-muted/50 border-b border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      <span></span>
                      <span>Fonte de Receita</span>
                      <span className="text-center">Ações</span>
                    </div>
                    <div className="divide-y divide-border">
                      {config.incomeItems.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "grid grid-cols-[40px,1fr,60px] gap-2 px-3 py-2 items-center transition-colors hover:bg-accent/30",
                            item.enabled ? "bg-income-light/20" : ""
                          )}
                        >
                          <div className="flex justify-center">
                            <Switch
                              checked={item.enabled}
                              onCheckedChange={() => toggleIncomeItem(item.id)}
                              className="scale-75"
                            />
                          </div>
                          <span className={cn(
                            "font-medium text-sm truncate",
                            item.enabled ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {item.name}
                          </span>
                          <div className="flex justify-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => openIncomeDetail(item)}
                              disabled={!item.enabled}
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            {!isMobile && (
                              item.isSystemDefault ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 opacity-50 cursor-not-allowed"
                                        disabled
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[200px] text-center">
                                      <p className="text-xs">Itens padrão não podem ser excluídos</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteIncomeClick(item)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg gradient-expense flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-primary-foreground" />
                    </div>
                    Linhas de Despesa
                  </CardTitle>
                  <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Despesa
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card">
                      <DialogHeader>
                        <DialogTitle>Nova Despesa</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Nome da Despesa</Label>
                          <Input
                            placeholder="Ex: Seguro do carro..."
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
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              {expenseCategories.map(cat => (
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
                            <SelectTrigger className="bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              {paymentMethods.map(method => (
                                <SelectItem key={method.value} value={method.value}>
                                  {method.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleAddExpense} className="w-full">
                          Adicionar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {config.accountType === 'shared' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpenseGroupByPerson(!expenseGroupByPerson)}
                    className="mt-3 gap-2 text-muted-foreground hover:text-foreground justify-start px-0"
                  >
                    <Users className="h-4 w-4" />
                    {expenseGroupByPerson 
                      ? "Mostrar lista completa desagrupada" 
                      : "Agrupar por responsável"}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Admin Default Expense Items */}
                {isAdmin && <AdminDefaultExpenseInline />}

                {expenseGroupByPerson && config.accountType === 'shared' ? (
                  // Grouped by responsible person
                  <>
                    {/* Items without responsible */}
                    {(() => {
                      const unassignedItems = config.expenseItems.filter(item => !item.responsiblePersonId);
                      if (unassignedItems.length === 0) return null;
                      const enabledCount = unassignedItems.filter(i => i.enabled).length;
                      
                      return (
                        <div className="border border-destructive/50 rounded-lg overflow-hidden bg-destructive/5">
                          <div className="bg-destructive/10 border-b border-destructive/30 px-3 py-2 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <span className="text-sm font-medium text-destructive">Sem responsável</span>
                            <span className="text-xs bg-destructive/20 px-1.5 py-0.5 rounded text-destructive ml-auto">
                              {enabledCount}/{unassignedItems.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-[40px,1fr,50px,50px] gap-2 px-3 py-2 bg-muted/30 border-b border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            <span></span>
                            <span>Item</span>
                            <span className="text-center">Pag.</span>
                            <span className="text-center">Ações</span>
                          </div>
                          <div className="divide-y divide-border">
                            {unassignedItems.map((item) => {
                              const PaymentIcon = getPaymentMethodIcon(item.paymentMethod);
                              return (
                                <div
                                  key={item.id}
                                  className={cn(
                                    "grid grid-cols-[40px,1fr,50px,50px] gap-2 px-3 py-2 items-center transition-colors hover:bg-accent/30",
                                    item.enabled ? "bg-expense-light/10" : ""
                                  )}
                                >
                                  <div className="flex justify-center">
                                    <Switch
                                      checked={item.enabled}
                                      onCheckedChange={() => toggleExpenseItem(item.id)}
                                      className="scale-75"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 min-w-0 flex-wrap">
                                    <span className={cn(
                                      "text-sm truncate",
                                      item.enabled ? "text-foreground" : "text-muted-foreground"
                                    )}>
                                      {item.name}
                                    </span>
                                    {item.expenseNature && (
                                      <span className={cn(
                                        "text-[9px] px-1 py-0.5 rounded font-medium shrink-0",
                                        item.expenseNature === 'fixed' 
                                          ? "bg-green-500/20 text-green-600 dark:text-green-400"
                                          : item.expenseNature === 'semi_variable'
                                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                          : "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                      )}>
                                        {natureLabels[item.expenseNature]}
                                      </span>
                                    )}
                                    {item.recurrenceType && item.recurrenceType !== 'monthly' && (
                                      <span className="text-[9px] bg-muted text-muted-foreground px-1 py-0.5 rounded font-medium shrink-0">
                                        {recurrenceLabels[item.recurrenceType]}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex justify-center">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className={cn(
                                            "flex items-center justify-center p-1.5 rounded-md",
                                            item.enabled ? "bg-accent" : "bg-muted opacity-50"
                                          )}>
                                            <PaymentIcon className="h-3.5 w-3.5" />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                          <p className="text-xs">{getPaymentMethodLabel(item.paymentMethod)}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <div className="flex justify-center gap-0.5">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => openExpenseDetail(item)}
                                      disabled={!item.enabled}
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                    {!isMobile && (
                                      item.isSystemDefault ? (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 opacity-50 cursor-not-allowed"
                                                disabled
                                              >
                                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-[200px] text-center">
                                              <p className="text-xs">Itens padrão não podem ser excluídos</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 hover:text-destructive hover:bg-destructive/10"
                                          onClick={() => handleDeleteExpenseClick(item)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Items grouped by person */}
                    {config.sharedWith.map((person) => {
                      const personItems = config.expenseItems.filter(item => item.responsiblePersonId === person.id);
                      if (personItems.length === 0) return null;
                      const enabledCount = personItems.filter(i => i.enabled).length;
                      
                      return (
                        <div key={person.id} className="border border-border rounded-lg overflow-hidden">
                          <div className="bg-primary/5 border-b border-border px-3 py-2 flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                              <User className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-foreground">{person.name}</span>
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-auto">
                              {enabledCount}/{personItems.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-[40px,1fr,50px,50px] gap-2 px-3 py-2 bg-muted/30 border-b border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            <span></span>
                            <span>Item</span>
                            <span className="text-center">Pag.</span>
                            <span className="text-center">Ações</span>
                          </div>
                          <div className="divide-y divide-border">
                            {personItems.map((item) => {
                              const PaymentIcon = getPaymentMethodIcon(item.paymentMethod);
                              return (
                                <div
                                  key={item.id}
                                  className={cn(
                                    "grid grid-cols-[40px,1fr,50px,50px] gap-2 px-3 py-2 items-center transition-colors hover:bg-accent/30",
                                    item.enabled ? "bg-expense-light/10" : ""
                                  )}
                                >
                                  <div className="flex justify-center">
                                    <Switch
                                      checked={item.enabled}
                                      onCheckedChange={() => toggleExpenseItem(item.id)}
                                      className="scale-75"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 min-w-0 flex-wrap">
                                    <span className={cn(
                                      "text-sm truncate",
                                      item.enabled ? "text-foreground" : "text-muted-foreground"
                                    )}>
                                      {item.name}
                                    </span>
                                    {item.expenseNature && (
                                      <span className={cn(
                                        "text-[9px] px-1 py-0.5 rounded font-medium shrink-0",
                                        item.expenseNature === 'fixed' 
                                          ? "bg-green-500/20 text-green-600 dark:text-green-400"
                                          : item.expenseNature === 'semi_variable'
                                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                          : "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                      )}>
                                        {natureLabels[item.expenseNature]}
                                      </span>
                                    )}
                                    {item.recurrenceType && item.recurrenceType !== 'monthly' && (
                                      <span className="text-[9px] bg-muted text-muted-foreground px-1 py-0.5 rounded font-medium shrink-0">
                                        {recurrenceLabels[item.recurrenceType]}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex justify-center">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className={cn(
                                            "flex items-center justify-center p-1.5 rounded-md",
                                            item.enabled ? "bg-accent" : "bg-muted opacity-50"
                                          )}>
                                            <PaymentIcon className="h-3.5 w-3.5" />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                          <p className="text-xs">{getPaymentMethodLabel(item.paymentMethod)}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <div className="flex justify-center gap-0.5">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => openExpenseDetail(item)}
                                      disabled={!item.enabled}
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                    {!isMobile && (
                                      item.isSystemDefault ? (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 opacity-50 cursor-not-allowed"
                                                disabled
                                              >
                                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-[200px] text-center">
                                              <p className="text-xs">Itens padrão não podem ser excluídos</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 hover:text-destructive hover:bg-destructive/10"
                                          onClick={() => handleDeleteExpenseClick(item)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  // Grouped by category (default)
                  expenseCategories.map(category => {
                    const items = getItemsByCategory(category.id);
                    if (items.length === 0) return null;
                    
                    const isExpanded = expandedCategories.includes(category.id);
                    const enabledCount = items.filter(i => i.enabled).length;

                    return (
                      <div
                        key={category.id}
                        className="border border-border rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-sm text-foreground">{category.name}</span>
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                              {enabledCount}/{items.length}
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border">
                            {/* Mobile View */}
                            {isMobile ? (
                              <ExpenseListMobile
                                items={items}
                                onToggle={toggleExpenseItem}
                                onUpdatePaymentMethod={updateExpensePaymentMethod}
                                onEdit={openExpenseDetail}
                                onDelete={handleDeleteExpenseClick}
                              />
                            ) : (
                              <>
                                {/* Desktop Header */}
                                <div className={cn(
                                  "grid gap-2 px-3 py-2 bg-muted/30 text-[10px] font-medium text-muted-foreground uppercase tracking-wider",
                                  config.accountType === 'shared'
                                    ? "grid-cols-[40px,1fr,50px,70px,50px]"
                                    : "grid-cols-[40px,1fr,50px,50px]"
                                )}>
                                  <span></span>
                                  <span>Item</span>
                                  <span className="text-center">Pag.</span>
                                  {config.accountType === 'shared' && (
                                    <span className="text-center">Resp.</span>
                                  )}
                                  <span className="text-center">Ações</span>
                                </div>
                                
                                {/* Desktop Rows */}
                                <div className="divide-y divide-border">
                                  {items.map(item => {
                                    const PaymentIcon = getPaymentMethodIcon(item.paymentMethod);
                                    const responsibleName = getPersonName(item.responsiblePersonId);
                                    
                                    return (
                                      <div
                                        key={item.id}
                                        className={cn(
                                          "grid gap-2 px-3 py-2 items-center transition-colors hover:bg-accent/30",
                                          config.accountType === 'shared'
                                            ? "grid-cols-[40px,1fr,50px,70px,50px]"
                                            : "grid-cols-[40px,1fr,50px,50px]",
                                          item.enabled ? "bg-expense-light/10" : ""
                                        )}
                                      >
                                        <div className="flex justify-center">
                                          <Switch
                                            checked={item.enabled}
                                            onCheckedChange={() => toggleExpenseItem(item.id)}
                                            className="scale-75"
                                          />
                                        </div>

                                        <div className="flex items-center gap-1 min-w-0 flex-wrap">
                                          <span className={cn(
                                            "text-sm truncate",
                                            item.enabled ? "text-foreground" : "text-muted-foreground"
                                          )}>
                                            {item.name}
                                          </span>
                                          {item.expenseNature && (
                                            <span className={cn(
                                              "text-[9px] px-1 py-0.5 rounded font-medium shrink-0",
                                              item.expenseNature === 'fixed' 
                                                ? "bg-green-500/20 text-green-600 dark:text-green-400"
                                                : item.expenseNature === 'semi_variable'
                                                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                                : "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                            )}>
                                              {natureLabels[item.expenseNature]}
                                            </span>
                                          )}
                                          {item.recurrenceType && item.recurrenceType !== 'monthly' && (
                                            <span className="text-[9px] bg-muted text-muted-foreground px-1 py-0.5 rounded font-medium shrink-0">
                                              {recurrenceLabels[item.recurrenceType]}
                                            </span>
                                          )}
                                        </div>

                                        {/* Payment Method Column */}
                                        <div className="flex justify-center">
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div className={cn(
                                                  "flex items-center justify-center p-1.5 rounded-md",
                                                  item.enabled ? "bg-accent" : "bg-muted opacity-50"
                                                )}>
                                                  <PaymentIcon className="h-3.5 w-3.5" />
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent side="top">
                                                <p className="text-xs">{getPaymentMethodLabel(item.paymentMethod)}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </div>

                                        {/* Responsible Person Column */}
                                        {config.accountType === 'shared' && (
                                          <div className="flex justify-center">
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <div className={cn(
                                                    "flex items-center gap-1 text-[10px] px-1.5 py-1 rounded-md",
                                                    responsibleName 
                                                      ? "bg-primary/10 text-primary" 
                                                      : "bg-muted text-muted-foreground"
                                                  )}>
                                                    <User className="h-3 w-3 shrink-0" />
                                                    <span className="truncate max-w-[40px]">
                                                      {responsibleName || '-'}
                                                    </span>
                                                  </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                  <p className="text-xs">
                                                    {responsibleName 
                                                      ? `Responsável: ${responsibleName}` 
                                                      : 'Nenhum responsável definido'}
                                                  </p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          </div>
                                        )}

                                        <div className="flex justify-center gap-0.5">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            onClick={() => openExpenseDetail(item)}
                                            disabled={!item.enabled}
                                          >
                                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                          </Button>
                                          
                                          {!isMobile && (
                                            item.isSystemDefault ? (
                                              <TooltipProvider>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 w-7 p-0 opacity-50 cursor-not-allowed"
                                                      disabled
                                                    >
                                                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </Button>
                                                  </TooltipTrigger>
                                                  <TooltipContent side="top" className="max-w-[200px] text-center">
                                                    <p className="text-xs">Itens padrão não podem ser excluídos</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                            ) : (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDeleteExpenseClick(item)}
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </Button>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Regras Tab */}
          <TabsContent value="regras">
            <RegrasCategoriaTab />
          </TabsContent>
        </Tabs>

        {/* Detail Sheets */}
        <IncomeDetailSheet
          open={incomeSheetOpen}
          onOpenChange={setIncomeSheetOpen}
          item={selectedIncome}
          onUpdate={updateIncomeItem}
          onUpdateResponsible={updateIncomeResponsible}
          onDelete={handleDeleteIncomeClick}
          sharedWith={config.sharedWith}
          isSharedAccount={config.accountType === 'shared'}
          isMobile={isMobile}
        />
        <ExpenseDetailSheet
          open={expenseSheetOpen}
          onOpenChange={setExpenseSheetOpen}
          item={selectedExpense}
          onUpdate={updateExpenseItem}
          onUpdatePaymentMethod={updateExpensePaymentMethod}
          onUpdateResponsible={updateExpenseResponsible}
          onDelete={handleDeleteExpenseClick}
          sharedWith={config.sharedWith}
          isSharedAccount={config.accountType === 'shared'}
          isMobile={isMobile}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir permanentemente a receita <strong>"{incomeToDelete?.name}"</strong>? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIncomeToDelete(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteIncome}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dependency Block Dialog */}
        <Dialog open={dependencyBlockOpen} onOpenChange={setDependencyBlockOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <DialogTitle>Não é possível excluir esta receita</DialogTitle>
                </div>
              </div>
            </DialogHeader>
            <DialogDescription className="py-4">
              Identificamos que existem valores lançados no seu Planejamento Mensal vinculados a esta categoria. Para manter a integridade do seu histórico, você deve remover os lançamentos mensais antes de excluir a categoria.
            </DialogDescription>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setDependencyBlockOpen(false);
                  setIncomeToDelete(null);
                }}
              >
                Entendi
              </Button>
              <Button
                onClick={() => {
                  setDependencyBlockOpen(false);
                  setIncomeToDelete(null);
                  navigate('/planejamento-mensal');
                }}
              >
                Ir para Planejamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Expense Delete Confirmation Dialog */}
        <AlertDialog open={expenseDeleteConfirmOpen} onOpenChange={setExpenseDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir permanentemente a despesa <strong>"{expenseToDelete?.name}"</strong>? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteExpense}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Expense Dependency Block Dialog */}
        <Dialog open={expenseDependencyBlockOpen} onOpenChange={setExpenseDependencyBlockOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <DialogTitle>Não é possível excluir esta despesa</DialogTitle>
                </div>
              </div>
            </DialogHeader>
            <DialogDescription className="py-4">
              Identificamos que existem valores lançados no seu Planejamento Mensal vinculados a esta categoria. Para manter a integridade do seu histórico, você deve remover os lançamentos mensais antes de excluir a categoria.
            </DialogDescription>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setExpenseDependencyBlockOpen(false);
                  setExpenseToDelete(null);
                }}
              >
                Entendi
              </Button>
              <Button
                onClick={() => {
                  setExpenseDependencyBlockOpen(false);
                  setExpenseToDelete(null);
                  navigate('/planejamento-mensal');
                }}
              >
                Ir para Planejamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SettingsLayout>
  );
};

export default Parametros;
