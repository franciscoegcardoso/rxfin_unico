import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Crown, Fingerprint, Shield, Activity, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConquestCard } from '../ConquestCard';
import { cn } from '@/lib/utils';
import { useFinancial } from '@/contexts/FinancialContext';
import { useOnboardingDefaults } from '@/hooks/useOnboardingDefaults';

interface BlockAProps {
  step: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSaveDraft: (key: string, data: any) => void;
}

/**
 * Block A: Financial Identity (Steps 0-3)
 * Step 0: Welcome + Journey preview
 * Step 1: Account type + Income
 * Step 2: Expenses
 * Step 3: Marco A - Conquest Card
 */
export const BlockA: React.FC<BlockAProps> = ({ step, onStepChange, onComplete, onSaveDraft }) => {
  const { config, setAccountType } = useFinancial();

  // ─── Step 0: Welcome with Journey Preview ────────────────────────────
  if (step === 0) {
    return (
      <div className="max-w-2xl mx-auto py-8 animate-slide-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Sua Jornada Financeira Começa Aqui
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Você viu dados fictícios na ferramenta. Agora vamos substituí-los pelos seus dados reais e construir seu Raio-X Financeiro.
          </p>
        </div>

        {/* Journey destination preview */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Ao final desta jornada você terá:
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Fingerprint, label: 'Identidade Financeira', desc: 'Receitas e despesas mapeadas' },
              { icon: Shield, label: 'Patrimônio Mapeado', desc: 'Bens, dívidas e proteções' },
              { icon: Activity, label: 'Fluxo de Caixa Real', desc: 'Cada real rastreado' },
              { icon: Crown, label: 'Domínio Total', desc: 'Projeção de 30 anos' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Account type quick selection */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Como você gerencia suas contas?
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setAccountType('individual')}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                config.accountType === 'individual'
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <User className={cn("h-6 w-6", config.accountType === 'individual' ? "text-primary" : "text-muted-foreground")} />
              <span className="text-sm font-medium">Individual</span>
            </button>
            <button
              onClick={() => setAccountType('shared')}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                config.accountType === 'shared'
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <Users className={cn("h-6 w-6", config.accountType === 'shared' ? "text-primary" : "text-muted-foreground")} />
              <span className="text-sm font-medium">Compartilhado</span>
            </button>
          </div>
        </div>

        <Button variant="hero" size="lg" className="w-full" onClick={() => onStepChange(1)}>
          Começar Nível 1: Identidade Financeira
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Step 1: Income (reuse existing component) ────────────────────────
  if (step === 1) {
    return (
      <div className="max-w-4xl mx-auto py-4">
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => onStepChange(0)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button variant="hero" size="sm" onClick={() => { onSaveDraft('income', config.incomeItems); onStepChange(2); }}>
            Próximo: Despesas <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {/* Embed income config inline — we reuse the UI but with our own navigation */}
        <EmbeddedIncomeConfig />
      </div>
    );
  }

  // ─── Step 2: Expenses ─────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="max-w-4xl mx-auto py-4">
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => onStepChange(1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button variant="hero" size="sm" onClick={() => { onSaveDraft('expenses', config.expenseItems); onStepChange(3); }}>
            Ver meu Raio-X <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <EmbeddedExpenseConfig />
      </div>
    );
  }

  // ─── Step 3: Marco A - Conquest Card ──────────────────────────────────
  if (step === 3) {
    const enabledIncomes = config.incomeItems.filter(i => i.enabled);
    const enabledExpenses = config.expenseItems.filter(e => e.enabled);

    // Simple projection: savings * 12 months * 5 years at 12% compound
    const totalIncome = enabledIncomes.length * 3000; // placeholder average
    const totalExpenses = enabledExpenses.length * 500; // placeholder average
    const savings = Math.max(totalIncome - totalExpenses, 0);
    const fiveYearProjection = savings > 0
      ? Math.round(savings * 12 * ((Math.pow(1.01, 60) - 1) / 0.01))
      : 0;

    return (
      <div className="py-8">
        <ConquestCard
          level={1}
          title="Identidade Financeira Mapeada!"
          metrics={[
            { label: 'Fontes de Receita', value: String(enabledIncomes.length) },
            { label: 'Categorias de Despesa', value: String(enabledExpenses.length) },
            { label: 'Capacidade de Poupança', value: savings > 0 ? `~R$ ${savings.toLocaleString('pt-BR')}/mês` : 'A calcular' },
            { label: 'Projeção 5 anos', value: fiveYearProjection > 0 ? `~R$ ${fiveYearProjection.toLocaleString('pt-BR')}` : 'A calcular' },
          ]}
          insight={savings > 0
            ? `Se poupar R$ ${savings.toLocaleString('pt-BR')}/mês a 12% a.a., em 5 anos terá aproximadamente R$ ${fiveYearProjection.toLocaleString('pt-BR')}.`
            : 'Complete com valores reais no dashboard para ver sua projeção personalizada.'
          }
          nextLevelPreview="Nível 2 — Patrimônio Mapeado: descubra tudo que você tem e deve."
          onContinue={onComplete}
          continueLabel="Concluir Nível 1 e Voltar ao Dashboard"
        />
      </div>
    );
  }

  return null;
};

// ─── Embedded Income/Expense configs (simplified wrappers) ──────────────

const EmbeddedIncomeConfig: React.FC = () => {
  const { config, toggleIncomeItem, updateIncomeMethod, addIncomeItem, initializeOnboardingDefaults } = useFinancial();
  const { incomeItems: defaultIncomeItems, expenseItems: defaultExpenseItems, isLoading } = useOnboardingDefaults();
  const [hasInit, setHasInit] = useState(false);

  React.useEffect(() => {
    if (!isLoading && defaultIncomeItems.length > 0 && !hasInit) {
      initializeOnboardingDefaults(defaultIncomeItems, defaultExpenseItems);
      setHasInit(true);
    }
  }, [isLoading, defaultIncomeItems, defaultExpenseItems, hasInit]);

  const items = config.incomeItems.filter(i => !i.responsiblePersonId);

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando receitas...</div>;
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="grid grid-cols-[40px,1fr,120px] gap-4 px-4 py-3 bg-muted/50 border-b border-border">
        <span />
        <span className="text-sm font-medium text-muted-foreground">Fonte de Receita</span>
        <span className="text-sm font-medium text-muted-foreground text-center">Método</span>
      </div>
      <div className="divide-y divide-border max-h-[50vh] overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-[40px,1fr,120px] gap-4 px-4 py-3 items-center hover:bg-accent/30">
            <div className="flex justify-center">
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={() => toggleIncomeItem(item.id)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>
            <span className={cn("text-sm truncate", item.enabled ? "text-foreground font-medium" : "text-muted-foreground")}>
              {item.name}
            </span>
            <div className="flex justify-center gap-0.5">
              {['gross', 'net'].map(m => (
                <button
                  key={m}
                  disabled={!item.enabled}
                  onClick={() => updateIncomeMethod(item.id, m as any)}
                  className={cn(
                    "px-2 py-1 text-xs rounded transition-all",
                    m === 'gross' ? 'rounded-l-md' : 'rounded-r-md',
                    item.method === m && item.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    !item.enabled && 'opacity-50'
                  )}
                >
                  {m === 'gross' ? 'Bruto' : 'Líq.'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const EmbeddedExpenseConfig: React.FC = () => {
  const { config, toggleExpenseItem } = useFinancial();
  const { categories: expenseCategories } = useOnboardingDefaults();
  const [expanded, setExpanded] = useState<string[]>(() => expenseCategories.slice(0, 3).map((c: any) => c.id));

  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
      {expenseCategories.map((cat: any) => {
        const items = config.expenseItems.filter(e => e.categoryId === cat.id);
        if (items.length === 0) return null;
        const isOpen = expanded.includes(cat.id);
        const enabledCount = items.filter(i => i.enabled).length;
        return (
          <div key={cat.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <button onClick={() => setExpanded(prev => isOpen ? prev.filter(id => id !== cat.id) : [...prev, cat.id])} className="w-full flex items-center justify-between p-3 hover:bg-accent/50">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">{cat.name}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{enabledCount}/{items.length}</span>
              </div>
              <span className="text-xs text-muted-foreground">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="border-t border-border divide-y divide-border">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30">
                    <input type="checkbox" checked={item.enabled} onChange={() => toggleExpenseItem(item.id)} className="h-4 w-4 rounded border-border text-primary" />
                    <span className={cn("text-sm flex-1", item.enabled ? "text-foreground" : "text-muted-foreground")}>{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
