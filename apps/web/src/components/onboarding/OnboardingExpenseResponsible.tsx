import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Wallet, Check, User, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFinancial } from '@/contexts/FinancialContext';
import { cn } from '@/lib/utils';
import { expenseCategories } from '@/data/defaultData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OnboardingProgress } from './OnboardingProgress';
import { OnboardingLayout } from './OnboardingLayout';

export const OnboardingExpenseResponsible: React.FC = () => {
  const { config, updateExpenseResponsible, setCurrentStep } = useFinancial();
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['home', 'food']);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getItemsByCategory = (categoryId: string) => {
    return config.expenseItems.filter(item => item.categoryId === categoryId && item.enabled);
  };

  const getDefaultResponsible = () => {
    const owner = config.sharedWith.find(p => p.isOwner);
    return owner?.id;
  };

  const getSteps = () => {
    return ['Setup', 'Dados', 'Pessoas', 'Veículos', 'Motoristas', 'Receitas', 'Despesas', 'Responsáveis', 'Sonhos', 'Concluir'];
  };

  const steps = getSteps();
  const currentStepIndex = 7; // Responsáveis step (after Despesas)

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

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-14 w-14 rounded-2xl gradient-expense flex items-center justify-center shadow-lg">
            <User className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Responsáveis</h1>
            <p className="text-muted-foreground">Defina quem é responsável por cada despesa</p>
          </div>
        </div>

        {/* Categories with enabled expenses only */}
        <div className="space-y-4">
          {expenseCategories.map(category => {
            const items = getItemsByCategory(category.id);
            if (items.length === 0) return null;
            
            const isExpanded = expandedCategories.includes(category.id);

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
                      {items.length} itens
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
                    <div className="divide-y divide-border">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 gap-4"
                        >
                          <span className="text-sm text-foreground truncate flex-1">
                            {item.name}
                          </span>

                          <Select
                            value={item.responsiblePersonId || getDefaultResponsible() || ''}
                            onValueChange={(value) => updateExpenseResponsible(item.id, value)}
                          >
                            <SelectTrigger className="h-9 w-[140px] bg-background text-xs">
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
          <Button variant="outline" onClick={() => setCurrentStep(7)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button variant="hero" onClick={() => setCurrentStep(9)}>
            Próximo: Sonhos
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
};
