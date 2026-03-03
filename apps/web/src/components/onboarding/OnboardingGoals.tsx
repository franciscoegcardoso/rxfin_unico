import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Plus, Target, Trash2, Calendar, CircleDollarSign, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFinancial } from '@/contexts/FinancialContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { OnboardingProgress } from './OnboardingProgress';
import { OnboardingLayout } from './OnboardingLayout';
import { toast } from 'sonner';

// Helper function to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const OnboardingGoals: React.FC = () => {
  const { config, addDream, removeDream, setCurrentStep } = useFinancial();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
  });

  const isSharedAccount = config.accountType === 'shared';
  const userFirstName = config.userProfile.firstName || 'Usuário';

  const handleAddGoal = () => {
    if (!newGoal.name.trim()) {
      toast.error('Campo obrigatório', {
        description: 'Por favor, informe o nome do sonho.',
      });
      return;
    }

    if (!newGoal.targetAmount || parseFloat(newGoal.targetAmount) <= 0) {
      toast.error('Campo obrigatório', {
        description: 'Por favor, informe o valor objetivo.',
      });
      return;
    }

    if (!newGoal.deadline) {
      toast.error('Campo obrigatório', {
        description: 'Por favor, informe a data limite.',
      });
      return;
    }

    addDream({
      name: newGoal.name.trim(),
      targetAmount: parseFloat(newGoal.targetAmount),
      currentAmount: parseFloat(newGoal.currentAmount) || 0,
      deadline: new Date(newGoal.deadline),
    });

    setNewGoal({
      name: '',
      targetAmount: '',
      currentAmount: '',
      deadline: '',
    });
    setDialogOpen(false);
    toast.success('Sonho adicionado com sucesso!');
  };

  const handleRemoveGoal = (id: string) => {
    removeDream(id);
    toast.success('Sonho removido');
  };

  const getNextStep = () => {
    if (isSharedAccount) {
      return isMobile ? 10 : 9; // Complete
    }
    return 7; // Individual: Complete
  };

  const getPreviousStep = () => {
    if (isSharedAccount) {
      return isMobile ? 8 : 7; // Expense Responsible (mobile) or Expenses (desktop)
    }
    return 5; // Individual: Expenses
  };

  const handleSkip = () => {
    setCurrentStep(getNextStep());
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
    // Sonhos step is before Complete
    return isSharedAccount ? 7 : 6;
  };

  const steps = getSteps();
  const currentStepIndex = getCurrentStepIndex();

  const progressSteps = steps.map((label, index) => ({
    label,
    isComplete: index < currentStepIndex,
    isCurrent: index === currentStepIndex,
  }));

  // Format deadline for display
  const formatDeadline = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculate monthly savings needed
  const calculateMonthlySavings = (goal: { currentAmount: number; targetAmount: number; deadline: Date }) => {
    const remaining = goal.targetAmount - goal.currentAmount;
    if (remaining <= 0) return 0;
    
    const now = new Date();
    const deadline = new Date(goal.deadline);
    const monthsDiff = (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth());
    
    if (monthsDiff <= 0) return remaining;
    return remaining / monthsDiff;
  };

  return (
    <OnboardingLayout variant="form">
      <div className="max-w-4xl mx-auto animate-slide-up">
        {/* Progress */}
        <OnboardingProgress steps={progressSteps} />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Target className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sonhos de {userFirstName}</h1>
              <p className="text-muted-foreground">Defina seus objetivos financeiros de longo prazo</p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Novo Sonho
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Novo Sonho</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-name">
                    Nome do Sonho <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="goal-name"
                    placeholder="Ex: Viagem dos sonhos..."
                    value={newGoal.name}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-target">
                    Valor Objetivo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="goal-target"
                    type="number"
                    placeholder="0,00"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, targetAmount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-current">
                    Valor Já Acumulado
                  </Label>
                  <Input
                    id="goal-current"
                    type="number"
                    placeholder="0,00"
                    value={newGoal.currentAmount}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, currentAmount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-deadline">
                    Data Limite <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="goal-deadline"
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>
                <Button onClick={handleAddGoal} className="w-full">
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Goals List */}
        {config.dreams.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum sonho cadastrado
            </h3>
            <p className="text-muted-foreground mb-4">
              Adicione seus objetivos financeiros para acompanhar seu progresso
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Sonho
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {config.dreams.map((goal) => {
              const progress = goal.targetAmount > 0 
                ? (goal.currentAmount / goal.targetAmount) * 100 
                : 0;
              const monthlySavings = calculateMonthlySavings(goal);
              
              return (
                <div
                  key={goal.id}
                  className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{goal.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDeadline(goal.deadline)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveGoal(goal.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">
                        {formatCurrency(goal.currentAmount)}
                      </span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Monthly savings */}
                  {monthlySavings > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                      <CircleDollarSign className="h-4 w-4" />
                      <span>
                        Economizar <span className="font-medium text-foreground">{formatCurrency(monthlySavings)}</span>/mês
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button variant="ghost" onClick={() => setCurrentStep(getPreviousStep())}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleSkip}>
              Quero fazer depois
            </Button>
            <Button variant="hero" onClick={() => setCurrentStep(getNextStep())}>
              Continuar
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
};
