import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, ArrowLeft, Plus, Wallet, ChevronDown, ChevronUp, User, Barcode, QrCode, CreditCard, Banknote, Building, Loader2, AlertTriangle } from 'lucide-react';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useFinancial } from '@/contexts/FinancialContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { PaymentMethod, ExpenseCategory } from '@/types/financial';
import { paymentMethods } from '@/data/defaultData';
import { useOnboardingDefaults } from '@/hooks/useOnboardingDefaults';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OnboardingProgress } from './OnboardingProgress';
import { OnboardingLayout } from './OnboardingLayout';
import { toast } from 'sonner';

// Helper to normalize string for comparison
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim();
};

// Check similarity between two strings
const getSimilarity = (str1: string, str2: string): number => {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  
  if (s1 === s2) return 1;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  // Check if one contains the other
  if (longer.includes(shorter) || shorter.includes(longer)) {
    return 0.8;
  }
  
  // Simple word overlap check
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
  
  if (commonWords.length > 0) {
    return 0.6;
  }
  
  return 0;
};

// Payment method icon mapping
const getPaymentIcon = (method: PaymentMethod) => {
  switch (method) {
    case 'boleto':
      return <Barcode className="h-4 w-4" />;
    case 'pix':
      return <QrCode className="h-4 w-4" />;
    case 'credit_card':
      return <CreditCard className="h-4 w-4" />;
    case 'debit_card':
      return <Building className="h-4 w-4" />;
    case 'cash':
      return <Banknote className="h-4 w-4" />;
    default:
      return <CreditCard className="h-4 w-4" />;
  }
};

const getPaymentHelperText = (method: string): string => {
  switch (method) {
    case 'boleto':
      return 'Compensação em até 3 dias úteis';
    case 'pix':
      return 'Pagamento instantâneo';
    case 'credit_card':
      return 'Lançado na fatura do cartão';
    case 'debit_card':
      return 'Débito imediato no cartão';
    case 'cash':
      return 'Pagamento em dinheiro vivo';
    default:
      return '';
  }
};

export const OnboardingExpenses: React.FC = () => {
  const { config, toggleExpenseItem, updateExpensePaymentMethod, updateExpenseResponsible, addExpenseItem, setCurrentStep, initializeOnboardingDefaults } = useFinancial();
  const { incomeItems: defaultIncomeItems, expenseItems: defaultExpenseItems, categories: expenseCategories, isLoading } = useOnboardingDefaults();
  const isMobile = useIsMobile();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showSimilarWarning, setShowSimilarWarning] = useState(false);
  const [similarItemName, setSimilarItemName] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    categoryId: '',
    paymentMethod: 'credit_card' as PaymentMethod,
    responsiblePersonId: '',
  });

  // Initialize default responsible person when dialog opens
  useEffect(() => {
    if (dialogOpen && !newItem.responsiblePersonId) {
      const defaultResponsible = getDefaultResponsible();
      if (defaultResponsible) {
        setNewItem(prev => ({ ...prev, responsiblePersonId: defaultResponsible }));
      }
    }
  }, [dialogOpen]);

  const isSharedAccount = config.accountType === 'shared';

  // Get the user's first name for the title
  const userFirstName = config.userProfile.firstName || 'Usuário';

  // Initialize defaults from database when they load
  useEffect(() => {
    if (!isLoading && defaultExpenseItems.length > 0 && !hasInitialized) {
      initializeOnboardingDefaults(defaultIncomeItems, defaultExpenseItems);
      setHasInitialized(true);
      
      // Expand first 3 categories by default
      const defaultExpanded = expenseCategories.slice(0, 3).map(c => c.id);
      setExpandedCategories(defaultExpanded);
    }
  }, [isLoading, defaultIncomeItems, defaultExpenseItems, initializeOnboardingDefaults, hasInitialized, expenseCategories]);

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

  const getDefaultResponsible = () => {
    const owner = config.sharedWith.find(p => p.isOwner);
    return owner?.id;
  };

  // Get all expense item names for duplicate checking
  const allExpenseNames = useMemo(() => {
    return config.expenseItems.map(item => normalizeString(item.name));
  }, [config.expenseItems]);

  const checkDuplicate = (name: string): { isExact: boolean; isSimilar: boolean; similarTo?: string } => {
    const normalizedName = normalizeString(name);
    
    // Check for exact match
    if (allExpenseNames.includes(normalizedName)) {
      return { isExact: true, isSimilar: false };
    }
    
    // Check for similar items
    for (const item of config.expenseItems) {
      const similarity = getSimilarity(name, item.name);
      if (similarity >= 0.6) {
        return { isExact: false, isSimilar: true, similarTo: item.name };
      }
    }
    
    return { isExact: false, isSimilar: false };
  };

  const handleAddItem = () => {
    // Validate required fields
    if (!newItem.name.trim()) {
      toast.error('Campo obrigatório', {
        description: 'Por favor, informe o nome da despesa.',
      });
      return;
    }

    if (!newItem.categoryId) {
      toast.error('Campo obrigatório', {
        description: 'Por favor, selecione uma categoria.',
      });
      return;
    }

    if (!newItem.paymentMethod) {
      toast.error('Campo obrigatório', {
        description: 'Por favor, selecione uma forma de pagamento.',
      });
      return;
    }

    if (!newItem.responsiblePersonId) {
      toast.error('Campo obrigatório', {
        description: 'Por favor, selecione o responsável principal.',
      });
      return;
    }

    const { isExact, isSimilar, similarTo } = checkDuplicate(newItem.name);

    if (isExact) {
      toast.error('Despesa já existe', {
        description: 'Já existe uma despesa com esse nome. Por favor, escolha outro nome.',
      });
      return;
    }

    if (isSimilar && similarTo) {
      setSimilarItemName(similarTo);
      setShowSimilarWarning(true);
      return;
    }

    // No duplicates, add directly
    confirmAddItem();
  };

  const confirmAddItem = () => {
    const category = expenseCategories.find(c => c.id === newItem.categoryId);
    addExpenseItem({
      name: newItem.name.trim(),
      categoryId: newItem.categoryId,
      category: category?.name || '',
      expenseType: 'variable_non_essential',
      enabled: true,
      isRecurring: false,
      paymentMethod: newItem.paymentMethod,
      responsiblePersonId: newItem.responsiblePersonId,
    });
    // Reset form with default responsible
    const defaultResponsible = getDefaultResponsible();
    setNewItem({ 
      name: '', 
      categoryId: '', 
      paymentMethod: 'credit_card',
      responsiblePersonId: defaultResponsible || ''
    });
    setDialogOpen(false);
    setShowSimilarWarning(false);
    setSimilarItemName('');
    toast.success('Despesa adicionada com sucesso!');
  };

  const getPersonName = (personId: string | undefined) => {
    if (!personId) return null;
    return config.sharedWith.find(p => p.id === personId)?.name || null;
  };

  const getNextStep = () => {
    if (isSharedAccount) {
      // Mobile: goes to expense responsible step, Desktop: goes to goals
      return isMobile ? 8 : 8;
    }
    return 6; // Individual: go to Goals
  };

  const getPreviousStep = () => {
    if (isSharedAccount) {
      // Go back to last shared person's income or owner's income
      const sharedPeople = config.sharedWith.filter(p => !p.isOwner);
      if (sharedPeople.length > 0) {
        return 6; // Last shared person income
      }
      return 5; // Owner income
    }
    return 4; // Individual: back to Income
  };

  const getSteps = () => {
    const baseSteps = ['Setup', 'Dados'];
    if (isSharedAccount) {
      baseSteps.push('Pessoas');
    }
    baseSteps.push('Veículos', 'Motoristas', 'Receitas', 'Despesas', 'Sonhos', 'Concluir');
    return baseSteps;
  };

  const getCurrentStepIndex = () => {
    return isSharedAccount ? 6 : 5; // Despesas step
  };

  const steps = getSteps();
  const currentStepIndex = getCurrentStepIndex();

  const progressSteps = steps.map((label, index) => ({
    label,
    isComplete: index < currentStepIndex,
    isCurrent: index === currentStepIndex,
  }));

  // For desktop/tablet: show toggle + payment method + responsible in one row
  // For mobile: just toggle + payment method (responsible is in separate step)
  const showResponsibleColumn = !isMobile && isSharedAccount;

  // Show loading state while fetching defaults
  if (isLoading) {
    return (
      <OnboardingLayout variant="form">
        <RXFinLoadingSpinner height="min-h-[400px]" size={56} />
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout variant="form">
      <div className="max-w-4xl mx-auto animate-slide-up">
        {/* Progress */}
        <OnboardingProgress steps={progressSteps} />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl gradient-expense flex items-center justify-center shadow-lg">
              <Wallet className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configurar despesas de {userFirstName}</h1>
              <p className="text-muted-foreground">Selecione suas categorias de gastos e formas de pagamento</p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
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
                  <Label htmlFor="expense-name">
                    Nome da Despesa <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="expense-name"
                    placeholder="Ex: Seguro do carro..."
                    value={newItem.name}
                    onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Categoria <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={newItem.categoryId}
                    onValueChange={(value) => setNewItem(prev => ({ ...prev, categoryId: value }))}
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
                  <Label>
                    Forma de Pagamento <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={newItem.paymentMethod}
                    onValueChange={(value) => setNewItem(prev => ({ ...prev, paymentMethod: value as PaymentMethod }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {paymentMethods.map(method => (
                        <SelectItem key={method.value} value={method.value}>
                          <div className="flex items-center gap-2">
                            {getPaymentIcon(method.value as PaymentMethod)}
                            <span>{method.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    Responsável Principal <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={newItem.responsiblePersonId}
                    onValueChange={(value) => setNewItem(prev => ({ ...prev, responsiblePersonId: value }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {config.sharedWith.map(person => (
                        <SelectItem key={person.id} value={person.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {person.name}
                            {person.isOwner && (
                              <span className="text-xs text-muted-foreground">(Titular)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddItem} className="w-full">
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {expenseCategories.map(category => {
            const items = getItemsByCategory(category.id);
            if (items.length === 0) return null;
            
            const isExpanded = expandedCategories.includes(category.id);
            const enabledCount = items.filter(i => i.enabled).length;

            return (
              <div
                key={category.id}
                className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground">{category.name}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      {enabledCount}/{items.length} ativos
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Table Header */}
                    <div className={cn(
                      "grid gap-4 p-3 bg-muted/30 text-xs font-medium text-muted-foreground",
                      showResponsibleColumn 
                        ? "grid-cols-[40px,1fr,80px,120px]" 
                        : "grid-cols-[40px,1fr,80px]"
                    )}>
                      <span></span>
                      <span>Item</span>
                      <span className="text-center">Pag.</span>
                      {showResponsibleColumn && <span className="text-center">Responsável</span>}
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-border">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className={cn(
                            "grid gap-4 p-3 items-center transition-colors hover:bg-accent/30",
                            showResponsibleColumn 
                              ? "grid-cols-[40px,1fr,80px,120px]" 
                              : "grid-cols-[40px,1fr,80px]",
                            item.enabled ? "bg-expense-light/10" : ""
                          )}
                        >
                          {/* Toggle */}
                          <div className="flex justify-center">
                            <Switch
                              checked={item.enabled}
                              onCheckedChange={() => toggleExpenseItem(item.id)}
                              className="scale-75"
                            />
                          </div>

                          {/* Name + Badge */}
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn(
                              "text-sm truncate",
                              item.enabled ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {item.name}
                            </span>
                            {item.isRecurring && (
                              <span className="flex-shrink-0 text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded-full">
                                Rec.
                              </span>
                            )}
                          </div>

                          {/* Payment Method - Icon only, dropdown shows icon + name */}
                          <div className="flex justify-center">
                            <Select
                              value={item.paymentMethod}
                              onValueChange={(value) => updateExpensePaymentMethod(item.id, value as PaymentMethod)}
                              disabled={!item.enabled}
                            >
                              <SelectTrigger 
                                className={cn(
                                  "w-10 h-10 p-0 border-none bg-transparent hover:bg-accent/50 flex items-center justify-center",
                                  !item.enabled && "opacity-40"
                                )}
                              >
                                <span className={cn(
                                  "text-primary",
                                  !item.enabled && "text-muted-foreground"
                                )}>
                                  {getPaymentIcon(item.paymentMethod)}
                                </span>
                              </SelectTrigger>
                              <SelectContent className="bg-popover w-56" align="center">
                                {paymentMethods.map(method => (
                                  <SelectItem 
                                    key={method.value} 
                                    value={method.value}
                                    className="py-3 cursor-pointer"
                                  >
                                    <div className="flex items-start gap-3">
                                      <span className="text-primary mt-0.5">
                                        {getPaymentIcon(method.value as PaymentMethod)}
                                      </span>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium">{method.label}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {getPaymentHelperText(method.value)}
                                        </span>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Responsible - Desktop/Tablet only */}
                          {showResponsibleColumn && (
                            <div className="flex justify-center">
                              <Select
                                value={item.responsiblePersonId || getDefaultResponsible() || ''}
                                onValueChange={(value) => updateExpenseResponsible(item.id, value)}
                                disabled={!item.enabled}
                              >
                                <SelectTrigger 
                                  className={cn(
                                    "h-8 text-xs w-full bg-background",
                                    !item.enabled && "opacity-40"
                                  )}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover">
                                  {config.sharedWith.map(person => (
                                    <SelectItem key={person.id} value={person.id} className="text-xs">
                                      <div className="flex items-center gap-2">
                                        <User className="h-3 w-3" />
                                        {person.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => setCurrentStep(getPreviousStep())}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button variant="hero" onClick={() => setCurrentStep(getNextStep())}>
            Próximo: Finalizar
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Similar Item Warning Dialog */}
      <AlertDialog open={showSimilarWarning} onOpenChange={setShowSimilarWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Despesa Similar Encontrada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Já existe uma despesa parecida: <strong>"{similarItemName}"</strong>.
              <br /><br />
              Deseja adicionar <strong>"{newItem.name}"</strong> mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowSimilarWarning(false);
              setSimilarItemName('');
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmAddItem}>
              Adicionar Mesmo Assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OnboardingLayout>
  );
};
