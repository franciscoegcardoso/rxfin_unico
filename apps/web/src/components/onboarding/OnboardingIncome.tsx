import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, ArrowLeft, Plus, TrendingUp, User, Loader2, AlertTriangle } from 'lucide-react';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useFinancial } from '@/contexts/FinancialContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { IncomeMethod } from '@/types/financial';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OnboardingProgress } from './OnboardingProgress';
import { OnboardingLayout } from './OnboardingLayout';
import { toast } from 'sonner';

interface OnboardingIncomeProps {
  personId?: string; // If provided, show income for this shared person
  personName?: string;
}

// Helper to normalize string for comparison
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim();
};

// Check similarity between two strings (Levenshtein-based)
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

export const OnboardingIncome: React.FC<OnboardingIncomeProps> = ({ personId, personName }) => {
  const { config, toggleIncomeItem, updateIncomeMethod, addIncomeItem, setCurrentStep, initializeOnboardingDefaults } = useFinancial();
  const { incomeItems: defaultIncomeItems, expenseItems: defaultExpenseItems, isLoading } = useOnboardingDefaults();
  const isMobile = useIsMobile();
  const [newItemName, setNewItemName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showSimilarWarning, setShowSimilarWarning] = useState(false);
  const [similarItemName, setSimilarItemName] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);

  const isSharedAccount = config.accountType === 'shared';
  const isOwnerView = !personId;

  // Get the user's first name for the title
  const userFirstName = config.userProfile.firstName || 'Usuário';

  // Initialize defaults from database when they load (for owner)
  useEffect(() => {
    if (!isLoading && defaultIncomeItems.length > 0 && !hasInitialized && isOwnerView) {
      initializeOnboardingDefaults(defaultIncomeItems, defaultExpenseItems);
      setHasInitialized(true);
    }
  }, [isLoading, defaultIncomeItems, defaultExpenseItems, initializeOnboardingDefaults, hasInitialized, isOwnerView]);

  // Initialize defaults for shared person when they have no items
  useEffect(() => {
    if (!isLoading && defaultIncomeItems.length > 0 && !isOwnerView && personId) {
      // Check if this shared person already has income items
      const personItems = config.incomeItems.filter(item => item.responsiblePersonId === personId);
      
      if (personItems.length === 0) {
        // Add default income items for this shared person
        defaultIncomeItems.forEach(defaultItem => {
          addIncomeItem({
            name: defaultItem.name,
            enabled: defaultItem.enabled,
            method: defaultItem.method,
            responsiblePersonId: personId,
            isSystemDefault: true,
            isStockCompensation: defaultItem.isStockCompensation,
          });
        });
      }
    }
  }, [isLoading, defaultIncomeItems, isOwnerView, personId, config.incomeItems, addIncomeItem]);

  // Get items for current view
  const getVisibleItems = () => {
    if (isOwnerView) {
      // Owner: show items without responsiblePersonId or with owner's responsiblePersonId
      const ownerPerson = config.sharedWith.find(p => p.isOwner);
      return config.incomeItems.filter(item => 
        !item.responsiblePersonId || item.responsiblePersonId === ownerPerson?.id
      );
    } else {
      // Shared person: show items with their responsiblePersonId
      return config.incomeItems.filter(item => item.responsiblePersonId === personId);
    }
  };

  const visibleItems = getVisibleItems();

  // Get all income item names for duplicate checking
  const allIncomeNames = useMemo(() => {
    return config.incomeItems.map(item => normalizeString(item.name));
  }, [config.incomeItems]);

  const checkDuplicate = (name: string): { isExact: boolean; isSimilar: boolean; similarTo?: string } => {
    const normalizedName = normalizeString(name);
    
    // Check for exact match
    if (allIncomeNames.includes(normalizedName)) {
      return { isExact: true, isSimilar: false };
    }
    
    // Check for similar items
    for (const item of config.incomeItems) {
      const similarity = getSimilarity(name, item.name);
      if (similarity >= 0.6) {
        return { isExact: false, isSimilar: true, similarTo: item.name };
      }
    }
    
    return { isExact: false, isSimilar: false };
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;

    const { isExact, isSimilar, similarTo } = checkDuplicate(newItemName);

    if (isExact) {
      toast.error('Receita já existe', {
        description: 'Já existe uma receita com esse nome. Por favor, escolha outro nome.',
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
    addIncomeItem({
      name: newItemName.trim(),
      enabled: true,
      method: 'net',
      responsiblePersonId: personId,
    });
    setNewItemName('');
    setDialogOpen(false);
    setShowSimilarWarning(false);
    setSimilarItemName('');
    toast.success('Receita adicionada com sucesso!');
  };

  const getNextStep = () => {
    if (!isSharedAccount) {
      return 5; // Individual: go to Expenses
    }
    if (isOwnerView) {
      // Shared account owner: check if there are shared people
      const sharedPeople = config.sharedWith.filter(p => !p.isOwner);
      if (sharedPeople.length > 0) {
        return 6; // Go to first shared person's income
      }
      return 6; // No shared people, go to Expenses (same step for simplicity)
    }
    // Shared person view: always go to Expenses after configuring shared person income
    return 7;
  };

  const getPreviousStep = () => {
    if (!isSharedAccount) {
      return 3; // Individual: back to Drivers
    }
    if (isOwnerView) {
      return 4; // Shared account owner: back to Drivers
    }
    // Shared person view: back to owner's income
    return 5;
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
    if (isSharedAccount) {
      return 5; // Receitas step for shared account
    }
    return 4; // Individual: Receitas
  };

  const steps = getSteps();
  const currentStepIndex = getCurrentStepIndex();

  const progressSteps = steps.map((label, index) => ({
    label,
    isComplete: index < currentStepIndex,
    isCurrent: index === currentStepIndex,
  }));

  const title = isOwnerView 
    ? `Configurar receitas de ${userFirstName}` 
    : `Configurar receitas de ${personName}`;
  
  const subtitle = isOwnerView
    ? 'Selecione as fontes de renda que você possui'
    : `Selecione as fontes de renda de ${personName}`;

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
            <div className="h-14 w-14 rounded-2xl gradient-income flex items-center justify-center shadow-lg">
              <TrendingUp className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          {/* Person indicator for shared view */}
          {!isOwnerView && personName && (
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-full">
              <User className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">{personName}</span>
            </div>
          )}
        </div>

        {/* Income Items - Same layout as Parametros */}
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="grid grid-cols-[40px,1fr,150px] gap-4 px-4 py-3 bg-muted/50 border-b border-border">
            <span></span>
            <span className="text-sm font-medium text-muted-foreground">Fonte de Receita</span>
            <span className="text-sm font-medium text-muted-foreground text-center">Método</span>
          </div>

          {/* Items */}
          <div className="divide-y divide-border">
            {visibleItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "grid grid-cols-[40px,1fr,150px] gap-4 px-4 py-3 items-center transition-colors hover:bg-accent/30",
                  item.enabled ? "bg-income-light/20" : ""
                )}
              >
                {/* Toggle */}
                <div className="flex justify-center">
                  <Switch
                    checked={item.enabled}
                    onCheckedChange={() => toggleIncomeItem(item.id)}
                    className="scale-75"
                  />
                </div>

                {/* Name */}
                <span className={cn(
                  "font-medium text-sm truncate",
                  item.enabled ? "text-foreground" : "text-muted-foreground"
                )}>
                  {item.name}
                </span>

                {/* Method Toggle */}
                <div className="flex justify-center gap-1">
                  <button
                    onClick={() => updateIncomeMethod(item.id, 'gross')}
                    disabled={!item.enabled}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-l-md transition-all",
                      item.method === 'gross' && item.enabled
                        ? "bg-income text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                      !item.enabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    Bruto
                  </button>
                  <button
                    onClick={() => updateIncomeMethod(item.id, 'net')}
                    disabled={!item.enabled}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-r-md transition-all",
                      item.method === 'net' && item.enabled
                        ? "bg-income text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                      !item.enabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    Líquido
                  </button>
                </div>
              </div>
            ))}
          </div>

        {/* Add New Item */}
          <div className="p-4 border-t border-border">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Nova Receita
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card">
                <DialogHeader>
                  <DialogTitle>Nova Fonte de Receita</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="income-name">Nome da Receita</Label>
                    <Input
                      id="income-name"
                      placeholder="Ex: Freelance, Dividendos..."
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddItem();
                        }
                      }}
                    />
                  </div>
                  <Button onClick={handleAddItem} className="w-full">
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => setCurrentStep(getPreviousStep())}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button variant="hero" onClick={() => setCurrentStep(getNextStep())}>
            {isSharedAccount && !isOwnerView ? 'Próximo' : 'Próximo: Despesas'}
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
              Receita Similar Encontrada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Já existe uma receita parecida: <strong>"{similarItemName}"</strong>.
              <br /><br />
              Deseja adicionar <strong>"{newItemName}"</strong> mesmo assim?
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
