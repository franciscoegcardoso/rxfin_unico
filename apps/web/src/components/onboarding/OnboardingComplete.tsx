import React, { useState } from 'react';
import { ArrowLeft, PartyPopper, TrendingUp, Wallet, Target, Car, Users, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFinancial } from '@/contexts/FinancialContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { OnboardingProgress } from './OnboardingProgress';
import { OnboardingLayout } from './OnboardingLayout';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { persistOnboardingData } from '@/services/onboardingPersistence';
import { toast } from 'sonner';

export const OnboardingComplete: React.FC = () => {
  const { config, setCurrentStep, completeOnboarding } = useFinancial();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isSaving, setIsSaving] = useState(false);

  const enabledIncomes = config.incomeItems.filter(i => i.enabled);
  const enabledExpenses = config.expenseItems.filter(i => i.enabled);
  const vehicles = config.assets.filter(a => a.type === 'vehicle');
  const driversCount = config.drivers.length;

  const isSharedAccount = config.accountType === 'shared';
  const sharedPeople = config.sharedWith.filter(p => !p.isOwner);
  
  // Get owner name
  const ownerName = `${config.userProfile.firstName} ${config.userProfile.lastName}`.trim() || 'Proprietário';

  // Group incomes by responsible person
  const incomesByPerson = enabledIncomes.reduce((acc, income) => {
    const personId = income.responsiblePersonId;
    let personName = ownerName;
    
    if (personId) {
      const person = config.sharedWith.find(p => p.id === personId);
      if (person) personName = person.name;
    }
    
    if (!acc[personName]) acc[personName] = [];
    acc[personName].push(income.name);
    return acc;
  }, {} as Record<string, string[]>);

  // Group expenses by responsible person
  const expensesByPerson = enabledExpenses.reduce((acc, expense) => {
    const personId = expense.responsiblePersonId;
    let personName = ownerName;
    
    if (personId) {
      const person = config.sharedWith.find(p => p.id === personId);
      if (person) personName = person.name;
    }
    
    if (!acc[personName]) acc[personName] = [];
    acc[personName].push(expense.name);
    return acc;
  }, {} as Record<string, string[]>);

  // Get driver name by ID
  const getDriverName = (driverId?: string) => {
    if (!driverId) return 'Não atribuído';
    const driver = config.drivers.find(d => d.id === driverId);
    return driver?.name || 'Não atribuído';
  };

  const handleComplete = async () => {
    if (!user?.id) {
      toast.error('Usuário não autenticado. Por favor, faça login novamente.');
      return;
    }

    setIsSaving(true);

    try {
      const result = await persistOnboardingData(user.id, config);

      if (!result.success) {
        toast.error(`Erro ao salvar dados na tabela: ${result.failedTable}`, {
          description: result.error,
          duration: 5000,
        });
        setIsSaving(false);
        return;
      }

      // Mark as complete in local context after DB success
      completeOnboarding();
      toast.success('Configuração salva com sucesso!');
      navigate('/inicio');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Erro inesperado ao salvar configuração');
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    // Go back to goals
    if (isSharedAccount) {
      setCurrentStep(isMobile ? 9 : 8);
    } else {
      setCurrentStep(6);
    }
  };

  const getSteps = () => {
    const baseSteps = ['Setup', 'Dados'];
    if (isSharedAccount) {
      baseSteps.push('Pessoas');
    }
    baseSteps.push('Veículos', 'Motoristas', 'Receitas', 'Despesas', 'Sonhos', 'Concluir');
    return baseSteps;
  };

  const steps = getSteps();
  const currentStepIndex = steps.length - 1; // Last step

  const progressSteps = steps.map((label, index) => ({
    label,
    isComplete: index < currentStepIndex,
    isCurrent: index === currentStepIndex,
  }));

  return (
    <OnboardingLayout variant="form">
      <div className="max-w-2xl mx-auto animate-slide-up">
        {/* Progress */}
        <OnboardingProgress steps={progressSteps} />

        {/* Success Card */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          <div className="text-center mb-6">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
              <PartyPopper className="h-10 w-10 text-primary" />
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-4">
              Configuração Concluída!
            </h1>
            <p className="text-lg text-muted-foreground">
              Seu Raio-X Financeiro está pronto para uso
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-income-light rounded-xl p-4 text-center">
              <TrendingUp className="h-6 w-6 text-income mx-auto mb-2" />
              <p className="text-2xl font-bold text-income">{enabledIncomes.length}</p>
              <p className="text-sm text-muted-foreground">Receitas</p>
            </div>
            <div className="bg-expense-light rounded-xl p-4 text-center">
              <Wallet className="h-6 w-6 text-expense mx-auto mb-2" />
              <p className="text-2xl font-bold text-expense">{enabledExpenses.length}</p>
              <p className="text-sm text-muted-foreground">Despesas</p>
            </div>
            <div className="bg-accent rounded-xl p-4 text-center">
              <Target className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary">{config.goals.length}</p>
              <p className="text-sm text-muted-foreground">Sonhos</p>
            </div>
            <div className="bg-primary/10 rounded-xl p-4 text-center">
              <Car className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary">{vehicles.length}</p>
              <p className="text-sm text-muted-foreground">Veículos</p>
            </div>
          </div>

          {/* Account Type */}
          <div className="bg-muted rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground">
              Tipo de conta: <span className="font-medium text-foreground">
                {config.accountType === 'individual' ? 'Individual' : 'Compartilhada'}
              </span>
              {isSharedAccount && sharedPeople.length > 0 && (
                <span className="ml-2">
                  ({sharedPeople.length} pessoa{sharedPeople.length > 1 ? 's' : ''})
                </span>
              )}
            </p>
          </div>

          <Separator className="my-6" />

          {/* Detailed Summary */}
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-6">
              {/* Receitas por pessoa */}
              {Object.keys(incomesByPerson).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-income" />
                    Receitas Cadastradas
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(incomesByPerson).map(([person, incomes]) => (
                      <div key={person} className="bg-income-light/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-income" />
                          <span className="text-sm font-medium text-foreground">{person}</span>
                          <Badge variant="outline" className="text-xs ml-auto">
                            {incomes.length} {incomes.length === 1 ? 'receita' : 'receitas'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {incomes.map((income, idx) => (
                            <span key={idx} className="text-xs bg-background px-2 py-1 rounded">
                              {income}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Despesas por pessoa */}
              {Object.keys(expensesByPerson).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-expense" />
                    Despesas Cadastradas
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(expensesByPerson).map(([person, expenses]) => (
                      <div key={person} className="bg-expense-light/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-expense" />
                          <span className="text-sm font-medium text-foreground">{person}</span>
                          <Badge variant="outline" className="text-xs ml-auto">
                            {expenses.length} {expenses.length === 1 ? 'despesa' : 'despesas'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {expenses.slice(0, 10).map((expense, idx) => (
                            <span key={idx} className="text-xs bg-background px-2 py-1 rounded">
                              {expense}
                            </span>
                          ))}
                          {expenses.length > 10 && (
                            <span className="text-xs text-muted-foreground px-2 py-1">
                              +{expenses.length - 10} mais
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Veículos com condutor principal */}
              {vehicles.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Car className="h-4 w-4 text-primary" />
                    Veículos Cadastrados
                  </h3>
                  <div className="space-y-2">
                    {vehicles.map((vehicle) => (
                      <div key={vehicle.id} className="bg-primary/5 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Car className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{vehicle.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Condutor: {getDriverName(vehicle.mainDriverId)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Motoristas */}
              {driversCount > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Motoristas Cadastrados
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {config.drivers.map((driver) => (
                      <Badge key={driver.id} variant={driver.isOwner ? "default" : "secondary"} className="text-xs">
                        {driver.name} {driver.isOwner && '(Proprietário)'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sonhos */}
              {config.goals.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Sonhos Cadastrados
                  </h3>
                  <div className="space-y-2">
                    {config.goals.map((goal) => (
                      <div key={goal.id} className="bg-accent/50 rounded-lg p-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{goal.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.targetAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="mt-6">
            <Button 
              variant="hero" 
              size="xl" 
              className="w-full" 
              onClick={handleComplete}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Acessar Início'
              )}
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <Button variant="ghost" onClick={handleBack} disabled={isSaving}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar e Ajustar
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
};
