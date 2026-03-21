import React, { useState, useMemo } from 'react';
import { useUserKV } from '@/hooks/useUserKV';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { useFinancial } from '@/contexts/FinancialContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { Target, Calendar, TrendingUp, Plus, Pencil, Trash2, Check, X, AlertTriangle, Building2 } from 'lucide-react';
import { cn, formatCompactCurrency } from '@/lib/utils';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePluggyInvestments } from '@/hooks/usePluggyInvestments';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeaderMetricCard } from '@/components/shared/HeaderMetricCard';
import { Progress } from '@/components/ui/progress';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { FinancialGoal } from '@/types/financial';

const availableIcons = [
  '🎯', '🚗', '🏠', '✈️', '💳', '💰', '🏖️', '📱', '💻', '🎓', 
  '👶', '💍', '🏋️', '🎸', '📚', '🏕️', '🎮', '🛍️', '🏥', '🐕',
  '🌴', '🎨', '🎭', '⛵', '🏔️', '🎪', '🎁', '🏆', '⭐', '🌟'
];

export const Sonhos: React.FC = () => {
  const { config, updateDream, addDream, removeDream } = useFinancial();
  const { isHidden, formatValue } = useVisibility();
  const isMobile = useIsMobile();

  // Pluggy consolidated data
  const { totalBalance: pluggyInvestmentsTotal } = usePluggyInvestments();
  const { data: pluggyAccounts = [] } = useQuery({
    queryKey: ['pluggy-accounts-balance-sonhos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pluggy_accounts')
        .select('balance, type')
        .in('type', ['BANK', 'SAVINGS'])
        .is('deleted_at', null);
      return data || [];
    },
  });
  const pluggyAccountsTotal = useMemo(() => {
    return pluggyAccounts.reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
  }, [pluggyAccounts]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const { value: goalIcons, setValue: setGoalIcons } = useUserKV<Record<string, string>>('goalIcons', {
    'g1': '🚗',
    'g2': '🏠',
    'g3': '✈️',
    'g4': '💳',
    'g5': '💰',
    'g6': '🏖️',
  });
  
  // New goal form state
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    deadline: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().split('T')[0],
    icon: '🎯',
  });

  // Edit form state
  const [editForm, setEditForm] = useState<{
    name: string;
    targetAmount: number;
    deadline: string;
  }>({ name: '', targetAmount: 0, deadline: '' });

  const saveGoalIcon = (goalId: string, icon: string) => {
    setGoalIcons(prev => ({ ...prev, [goalId]: icon }));
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const calculateMonthlyNeeded = (current: number, target: number, deadline: Date) => {
    const remaining = target - current;
    const monthsLeft = Math.max(
      (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30),
      1
    );
    return remaining / monthsLeft;
  };

  const formatCurrency = (value: number) => {
    return formatCompactCurrency(value, isHidden);
  };
  
  const formatCurrencyFull = (value: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  };

  const handleAddGoal = () => {
    if (!newGoal.name.trim() || newGoal.targetAmount <= 0) return;
    
    const goalId = `goal-${Date.now()}`;
    addDream({
      name: newGoal.name,
      targetAmount: newGoal.targetAmount,
      currentAmount: newGoal.currentAmount,
      deadline: new Date(newGoal.deadline),
    });
    
    saveGoalIcon(goalId, newGoal.icon);
    
    setNewGoal({
      name: '',
      targetAmount: 0,
      currentAmount: 0,
      deadline: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().split('T')[0],
      icon: '🎯',
    });
    setIsAddDialogOpen(false);
  };

  const startEditing = (goal: FinancialGoal) => {
    setEditingGoal(goal.id);
    setEditForm({
      name: goal.name,
      targetAmount: goal.targetAmount,
      deadline: new Date(goal.deadline).toISOString().split('T')[0],
    });
  };

  const saveEdit = (goalId: string) => {
    updateDream(goalId, {
      name: editForm.name,
      targetAmount: editForm.targetAmount,
      deadline: new Date(editForm.deadline),
    });
    setEditingGoal(null);
  };

  const cancelEdit = () => {
    setEditingGoal(null);
  };

  // Goals sorted by deadline for timeline
  const sortedGoals = [...config.dreams].sort((a, b) => 
    new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  );

  const formatShortDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  const formatCompactCurrencyLocal = (value: number) => {
    return formatCompactCurrency(value, isHidden);
  };

  return (
    
      <div className="space-y-6">
        <PageHeader
          icon={Target}
          title="Sonhos"
          subtitle="Acompanhe e personalize suas metas de longo prazo"
          actions={
            <>
              <VisibilityToggle />
              <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.sonhos} />
            </>
          }
        />

        {/* Add Dream Dialog (used by button below timeline) */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Sonho</DialogTitle>
              <DialogDescription>
                Defina uma nova meta financeira para alcançar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Icon Picker */}
              <div className="space-y-2">
                <Label>Ícone</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <span className="text-2xl">{newGoal.icon}</span>
                      <span className="text-muted-foreground">Escolher ícone</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-popover">
                    <div className="grid grid-cols-6 gap-2">
                      {availableIcons.map(icon => (
                        <Button
                          key={icon}
                          variant={newGoal.icon === icon ? "default" : "ghost"}
                          className="h-10 w-10 p-0 text-xl"
                          onClick={() => setNewGoal(prev => ({ ...prev, icon }))}
                        >
                          {icon}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label>Nome do Sonho <span className="text-muted-foreground text-xs">(máx. 20 caracteres)</span></Label>
                <Input
                  placeholder="Ex: Carro novo"
                  value={newGoal.name}
                  maxLength={20}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, name: e.target.value.slice(0, 20) }))}
                />
                <p className="text-xs text-muted-foreground text-right">{newGoal.name.length}/20</p>
              </div>

              {/* Target Amount */}
              <div className="space-y-2">
                <Label>Valor da Meta</Label>
                <CurrencyInput
                  value={newGoal.targetAmount}
                  onChange={(value) => setNewGoal(prev => ({ ...prev, targetAmount: value }))}
                />
              </div>

              {/* Current Amount */}
              <div className="space-y-2">
                <Label>Valor Já Acumulado</Label>
                <CurrencyInput
                  value={newGoal.currentAmount}
                  onChange={(value) => setNewGoal(prev => ({ ...prev, currentAmount: value }))}
                />
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label>Data Limite</Label>
                <Input
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddGoal} disabled={!newGoal.name.trim() || newGoal.targetAmount <= 0}>
                Adicionar Sonho
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Summary Cards */}
        {(() => {
          const totalAcumulado = config.dreams.reduce((acc, g) => acc + g.currentAmount, 0);
          const totalPatrimonio = config.assets.reduce((acc, a) => acc + a.value, 0) + pluggyInvestmentsTotal + pluggyAccountsTotal;
          const hasInconsistency = totalAcumulado > totalPatrimonio && totalPatrimonio > 0;
          
          return (
            <>
              {/* Warning Alert */}
              {hasInconsistency && (
                <Card className="bg-expense/10 border-expense/30">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-expense/20 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-expense" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-expense">Atenção: Inconsistência detectada</p>
                      <p className="text-sm text-muted-foreground">
                        O total acumulado nos sonhos ({formatCurrency(totalAcumulado)}) é maior que o patrimônio cadastrado em Investimentos ({formatCurrency(totalPatrimonio)}). 
                        Verifique se há bens não cadastrados.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <HeaderMetricCard label="Sonhos cadastrados" value={String(config.dreams.length)} variant="blue" icon={<Target className="h-4 w-4" />} />
                <HeaderMetricCard label="Total acumulado" value={formatCurrency(totalAcumulado)} variant={hasInconsistency ? 'negative' : 'neutral'} icon={<TrendingUp className="h-4 w-4" />} />
                <HeaderMetricCard label="Bens e Invest." value={formatCurrency(totalPatrimonio)} variant="blue" icon={<Building2 className="h-4 w-4" />} />
                <HeaderMetricCard label="Meta total" value={formatCurrency(config.dreams.reduce((acc, g) => acc + g.targetAmount, 0))} variant="amber" icon={<Calendar className="h-4 w-4" />} />
              </div>
            </>
          );
        })()}

        {/* Timeline Header */}
        {sortedGoals.length > 0 && (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Linha do Tempo</span>
              </div>
              
              {/* Mobile: Vertical Timeline */}
              {isMobile ? (
                <div className="relative pl-6">
                  {/* Vertical timeline line */}
                  <div className="absolute left-[5px] top-0 bottom-0 w-0.5 bg-border" />
                  
                  {/* Timeline items */}
                  <div className="space-y-4">
                    {sortedGoals.map((goal, index) => {
                      const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
                      const isPast = new Date(goal.deadline) < new Date();
                      const isComplete = progress >= 100;
                      const cumulativeSum = sortedGoals
                        .slice(0, index + 1)
                        .reduce((acc, g) => acc + g.targetAmount, 0);
                      
                      return (
                        <div key={goal.id} className="relative flex items-start gap-3">
                          {/* Dot */}
                          <div className={cn(
                            "absolute -left-6 top-1 w-3 h-3 rounded-full border-2 bg-background z-10",
                            isComplete ? "border-income bg-income" : 
                            isPast ? "border-expense bg-expense" : 
                            "border-primary bg-primary"
                          )} />
                          
                          {/* Content */}
                          <div className="flex-1 flex items-center gap-3 bg-background/50 rounded-lg p-2 border border-border/50">
                            <span className="text-xl">{goalIcons[goal.id] || '🎯'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {goal.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatShortDate(goal.deadline)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                "text-sm font-bold",
                                isComplete ? "text-income" : "text-foreground"
                              )}>
                                {formatCompactCurrencyLocal(goal.targetAmount)}
                              </p>
                              <p className="text-[10px] font-medium text-primary">
                                Σ {formatCompactCurrencyLocal(cumulativeSum)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Desktop: Horizontal Timeline */
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
                  
                  {/* Timeline items */}
                  <div className="relative flex justify-between pb-2">
                    {sortedGoals.map((goal, index) => {
                      const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
                      const isPast = new Date(goal.deadline) < new Date();
                      const isComplete = progress >= 100;
                      const cumulativeSum = sortedGoals
                        .slice(0, index + 1)
                        .reduce((acc, g) => acc + g.targetAmount, 0);
                      
                      return (
                        <div 
                          key={goal.id} 
                          className={cn(
                            "flex flex-col items-center flex-1 px-1",
                            index === 0 && "items-start",
                            index === sortedGoals.length - 1 && "items-end"
                          )}
                        >
                          {/* Dot */}
                          <div className={cn(
                            "w-3 h-3 rounded-full border-2 bg-background z-10",
                            isComplete ? "border-income bg-income" : 
                            isPast ? "border-expense bg-expense" : 
                            "border-primary bg-primary"
                          )} />
                          
                          {/* Content */}
                          <div className={cn(
                            "mt-2",
                            index === 0 && "text-left",
                            index === sortedGoals.length - 1 && "text-right",
                            index !== 0 && index !== sortedGoals.length - 1 && "text-center"
                          )}>
                            <span className="text-lg">{goalIcons[goal.id] || '🎯'}</span>
                            <p className="text-xs font-medium text-foreground whitespace-nowrap" title={goal.name}>
                              {goal.name}
                            </p>
                            <p className={cn(
                              "text-sm font-bold",
                              isComplete ? "text-income" : "text-foreground"
                            )}>
                              {formatCompactCurrencyLocal(goal.targetAmount)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatShortDate(goal.deadline)}
                            </p>
                            {/* Cumulative sum */}
                            <p className="text-[10px] font-medium text-primary mt-1 border-t border-border/50 pt-1">
                              Σ {formatCompactCurrencyLocal(cumulativeSum)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add Dream Button - Below Timeline */}
        <Button 
          className="w-full gap-2"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Adicionar Sonho
        </Button>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {config.dreams.map((goal) => {
            const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
            const monthlyNeeded = calculateMonthlyNeeded(goal.currentAmount, goal.targetAmount, goal.deadline);
            const isEditing = editingGoal === goal.id;

            return (
              <Card key={goal.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Icon Picker */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="h-12 w-12 p-0 text-3xl hover:bg-primary/10">
                            {goalIcons[goal.id] || '🎯'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 bg-popover">
                          <div className="grid grid-cols-6 gap-2">
                            {availableIcons.map(icon => (
                              <Button
                                key={icon}
                                variant={goalIcons[goal.id] === icon ? "default" : "ghost"}
                                className="h-10 w-10 p-0 text-xl"
                                onClick={() => saveGoalIcon(goal.id, icon)}
                              >
                                {icon}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      
                      <div className="flex-1">
                        {isEditing ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="font-semibold"
                          />
                        ) : (
                          <CardTitle className="text-lg">{goal.name}</CardTitle>
                        )}
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editForm.deadline}
                            onChange={(e) => setEditForm(prev => ({ ...prev, deadline: e.target.value }))}
                            className="mt-1 text-sm"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Meta: {formatDate(goal.deadline)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => saveEdit(goal.id)} aria-label="Salvar">
                            <Check className="h-4 w-4 text-income" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={cancelEdit} aria-label="Cancelar">
                            <X className="h-4 w-4 text-expense" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => startEditing(goal)} aria-label="Editar sonho">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" aria-label="Excluir sonho">
                                <Trash2 className="h-4 w-4 text-expense" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Sonho</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir "{goal.name}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeDream(goal.id)}
                                  className="bg-expense hover:bg-expense/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      <div className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium ml-2",
                        progress >= 100 ? "bg-income/20 text-income" :
                        progress >= 50 ? "bg-warning/20 text-warning" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {progress.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <Progress value={progress} className="h-3" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatCurrency(goal.currentAmount)}
                      </span>
                      {isEditing ? (
                        <CurrencyInput
                          value={editForm.targetAmount}
                          onChange={(value) => setEditForm(prev => ({ ...prev, targetAmount: value }))}
                          compact
                        />
                      ) : (
                        <span className="font-medium text-foreground">
                          {formatCurrency(goal.targetAmount)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Current Amount Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Valor atual acumulado
                    </label>
                    <CurrencyInput
                      value={goal.currentAmount}
                      onChange={(value) => updateDream(goal.id, { currentAmount: value })}
                    />
                  </div>

                  {/* Monthly Needed */}
                  {progress < 100 && (
                    <div className="bg-accent/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">
                        Para atingir sua meta, você precisa poupar:
                      </p>
                      <p className="text-lg font-bold text-primary mt-1">
                        {formatCurrency(monthlyNeeded)}/mês
                      </p>
                    </div>
                  )}

                  {progress >= 100 && (
                    <div className="bg-income/10 rounded-lg p-3 text-center">
                      <p className="text-income font-semibold">🎉 Meta alcançada!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Empty State / Add Card */}
          {config.dreams.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-0">
                <EmptyState
                  icon={<Target className="h-6 w-6 text-muted-foreground" />}
                  description="Você ainda não cadastrou nenhum sonho"
                  actionLabel="Adicionar primeiro sonho"
                  onAction={() => setIsAddDialogOpen(true)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    
  );
};

export default Sonhos;
