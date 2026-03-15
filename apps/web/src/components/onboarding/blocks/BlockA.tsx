import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ConquestCard } from '../ConquestCard';
import { cn } from '@/lib/utils';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
interface BlockAProps {
  step: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSaveDraft: (key: string, data: any) => void;
  /** Valores controlados pelo wizard (lift-up) para persistência ao avançar. */
  incomeValues: Record<string, number>;
  expenseValues: Record<string, number>;
  onIncomeChange: (values: Record<string, number>) => void;
  onExpenseChange: (values: Record<string, number>) => void;
  /** Chamado ao clicar "Próximo: Despesas" — persiste receitas e avança para step 2. */
  onNextFromReceitas: () => Promise<void>;
  /** Chamado ao clicar "Ver meu Raio-X" — persiste receitas e despesas e avança para step 3. */
  onViewRaioX: () => Promise<void>;
  isSaving?: boolean;
}

interface CategoryItem {
  key: string;
  name: string;
  item_id: string;
  icon: string;
  category_id?: string;
}

const formatBRL = (v: number) =>
  v > 0 ? `R$ ${v.toLocaleString('pt-BR')}` : 'R$ 0';

/** Rótulos customizados na tela Suas Receitas (apenas exibição) */
const INCOME_LABEL_OVERRIDE: Record<string, string> = {
  Investimentos: 'Renda passiva com investimentos',
  investimentos: 'Renda passiva com investimentos',
  Outro: 'Outros',
  outro: 'Outros',
};

export const BlockA: React.FC<BlockAProps> = ({
  step,
  onStepChange,
  onComplete,
  onSaveDraft,
  incomeValues,
  expenseValues,
  onIncomeChange,
  onExpenseChange,
  onNextFromReceitas,
  onViewRaioX,
  isSaving = false,
}) => {
  const { config, setAccountType } = useFinancial();
  const { user } = useAuth();

  // Fetch categories from RPC
  const { data: categories, isLoading: catLoading } = useQuery({
    queryKey: ['onboarding-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_onboarding_categories');
      if (error) throw error;
      return data as any as { income: CategoryItem[]; expense: CategoryItem[] };
    },
    staleTime: 300_000,
  });

  const [milestoneData, setMilestoneData] = useState<any>(null);
  /** Step 0 tem dois sub-passos: 0 = welcome, 1 = escolha tipo de conta (individual/compartilhado). */
  const [welcomeSubStep, setWelcomeSubStep] = useState<0 | 1>(0);

  // Fetch milestone when reaching conquest step
  useEffect(() => {
    if (step === 3 && user?.id) {
      supabase.rpc('calculate_milestone_identity', { p_user_id: user.id })
        .then(({ data }) => setMilestoneData(data));
    }
  }, [step, user?.id]);

  // ─── Step 0: Welcome (subStep 0) ou Tipo de conta (subStep 1) ───
  if (step === 0) {
    // Sub-step 0: tela de boas-vindas enxuta + linha de 3 etapas + CTA único
    if (welcomeSubStep === 0) {
      const journeySteps = [
        { num: 1, label: 'Identidade Financeira', short: 'Receitas e despesas' },
        { num: 2, label: 'Patrimônio Mapeado', short: 'Bens, dívidas e proteções' },
        { num: 3, label: 'Fluxo e Projeção', short: 'Caixa e visão de 30 anos' },
      ];
      return (
        <div className="max-w-2xl mx-auto py-8 animate-slide-up">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-3">
              Construa seu Raio-X Financeiro
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Em poucos passos você substitui os dados fictícios pelos seus e passa a ter visão completa da sua saúde financeira.
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 text-center">
              O que você vai montar nesta jornada
            </h2>
            <div className="flex items-stretch gap-2">
              {journeySteps.map((s, i) => (
                <div key={s.num} className="flex-1 flex flex-col items-center text-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center mb-2">
                    {s.num}
                  </div>
                  <p className="text-xs font-medium text-foreground leading-tight">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.short}</p>
                  {i < journeySteps.length - 1 && (
                    <div className="hidden sm:block flex-1 min-h-[2px] w-full max-w-[20px] mx-auto mt-2 bg-border self-center" aria-hidden />
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mb-4">⏱️ Cerca de 8 minutos</p>

          <Button variant="hero" size="lg" className="w-full" onClick={() => setWelcomeSubStep(1)}>
            Começar
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      );
    }

    // Sub-step 1: apenas escolha do tipo de conta (individual / compartilhado)
    return (
      <div className="max-w-2xl mx-auto py-8 animate-slide-up">
        <Button variant="ghost" size="sm" className="mb-4 -ml-1" onClick={() => setWelcomeSubStep(0)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Como você gerencia suas contas?
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Escolha o perfil que melhor descreve sua situação.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setAccountType('individual')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                config.accountType === 'individual'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <User className={cn('h-6 w-6 shrink-0', config.accountType === 'individual' ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-sm font-medium">Individual</span>
              <span className="text-xs text-muted-foreground">Só minhas contas</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountType('shared')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                config.accountType === 'shared'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <Users className={cn('h-6 w-6 shrink-0', config.accountType === 'shared' ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-sm font-medium">Compartilhado</span>
              <span className="text-xs text-muted-foreground">Divido com outra(s) pessoa(s)</span>
            </button>
          </div>
          <Button variant="hero" size="lg" className="w-full" onClick={() => onStepChange(1)}>
            Continuar para receitas e despesas
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── Step 1: Income (from RPC categories) ────────────────────
  if (step === 1) {
    const incomeItems = categories?.income ?? [];

    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => onStepChange(0)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button variant="hero" size="sm" onClick={() => onNextFromReceitas()} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Próximo: Despesas'} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground mb-1">Suas Receitas</h2>
          <p className="text-sm text-muted-foreground">Quanto você recebe por mês? Preencha o que se aplica.</p>
        </div>

        {catLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando categorias...</div>
        ) : (
          <div className="space-y-3">
            {incomeItems.map((item) => (
              <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <span className="text-xl shrink-0">{item.icon}</span>
                <span className="text-sm font-medium text-foreground flex-1">
                  {INCOME_LABEL_OVERRIDE[item.name] ?? item.name}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">R$</span>
                  <CurrencyInput
                    compact
                    decimalPlaces={0}
                    placeholder="0"
                    className="w-28 h-8 text-sm"
                    value={incomeValues[item.key] ?? 0}
                    onChange={(val) => onIncomeChange({ ...incomeValues, [item.key]: val })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Step 2: Expenses (from RPC categories) ──────────────────
  if (step === 2) {
    const expenseItems = categories?.expense ?? [];

    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => onStepChange(1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button variant="hero" size="sm" onClick={() => onViewRaioX()} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Ver meu Raio-X'} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground mb-1">Suas Despesas</h2>
          <p className="text-sm text-muted-foreground">Quanto você gasta por mês em cada categoria?</p>
        </div>

        {catLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando categorias...</div>
        ) : (
          <div className="space-y-3">
            {expenseItems.map((item) => (
              <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <span className="text-xl shrink-0">{item.icon}</span>
                <span className="text-sm font-medium text-foreground flex-1">{item.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">R$</span>
                  <CurrencyInput
                    compact
                    decimalPlaces={0}
                    placeholder="0"
                    className="w-28 h-8 text-sm"
                    value={expenseValues[item.key] ?? 0}
                    onChange={(val) => onExpenseChange({ ...expenseValues, [item.key]: val })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Step 3: Conquest Card with real milestone data ──────────
  if (step === 3) {
    const md = milestoneData as any;

    const metrics = md
      ? [
          { label: 'Receita Mensal', value: formatBRL(md.total_income) },
          { label: 'Despesas Estimadas', value: formatBRL(md.total_expenses) },
          { label: 'Margem Mensal', value: `${formatBRL(md.monthly_margin)} (${md.margin_percentage?.toFixed(1) ?? 0}%)` },
          { label: 'Projeção 5 anos (12% a.a.)', value: formatBRL(md.projection_5y_12pct) },
        ]
      : [
          { label: 'Receita Mensal', value: 'Calculando...' },
          { label: 'Despesas', value: 'Calculando...' },
          { label: 'Margem', value: 'Calculando...' },
          { label: 'Projeção 5 anos', value: 'Calculando...' },
        ];

    const insightText = md?.monthly_margin > 0
      ? `Se investir R$ ${md.monthly_margin.toLocaleString('pt-BR')}/mês a 12% a.a., em 5 anos você terá R$ ${md.projection_5y_12pct?.toLocaleString('pt-BR')}.`
      : 'Complete com valores reais para ver sua projeção personalizada.';

    return (
      <div className="py-8">
        <ConquestCard
          level={1}
          badge="bronze"
          title="Identidade Financeira Mapeada!"
          metrics={metrics}
          insight={insightText}
          nextLevelPreview="Nível 2 — Patrimônio Mapeado: descubra tudo que você tem e deve."
          onContinue={onComplete}
          continueLabel="Avançar para Nível 2: Patrimônio"
        />
      </div>
    );
  }

  return null;
};
