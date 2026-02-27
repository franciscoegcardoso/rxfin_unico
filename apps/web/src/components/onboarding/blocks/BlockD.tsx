import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Crown, Target, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ConquestCard } from '../ConquestCard';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface BlockDProps {
  step: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSaveDraft: (key: string, data: any) => void;
}

const GOAL_OPTIONS = [
  { id: 'reserva', label: 'Montar reserva de emergência', icon: '🛡️' },
  { id: 'divida', label: 'Quitar uma dívida', icon: '💳' },
  { id: 'investir', label: 'Investir mais', icon: '📈' },
  { id: 'compra', label: 'Comprar algo importante', icon: '🏠' },
];

const formatBRL = (v: number) => v > 0 ? `R$ ${v.toLocaleString('pt-BR')}` : 'R$ 0';

export const BlockD: React.FC<BlockDProps> = ({ step, onStepChange, onComplete, onSaveDraft }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [milestoneData, setMilestoneData] = useState<any>(null);
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [customGoal, setCustomGoal] = useState('');
  const [goalValue, setGoalValue] = useState('');

  useEffect(() => {
    if (step === 3 && user?.id) {
      supabase.rpc('calculate_milestone_mastery', { p_user_id: user.id })
        .then(({ data }) => setMilestoneData(data));
    }
  }, [step, user?.id]);

  // ─── Step 0: Context ──────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="max-w-2xl mx-auto py-8 animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-amber-50 dark:from-violet-900/30 dark:to-amber-900/20 mb-4">
            <Crown className="h-8 w-8 text-violet-500" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            👑 Nível 4: Domínio Total
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Agora vem o melhor: seu diagnóstico completo e projeção de futuro.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 mb-6 text-center">
          <p className="text-foreground leading-relaxed">
            Nos próximos 3 minutos, vamos consolidar tudo que você mapeou e criar sua projeção financeira de 30 anos.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>⏱️ ~3 min</span>
            <span>📊 Resultado: Raio-X + Projeção 30 anos</span>
          </div>
        </div>

        <Button variant="hero" size="lg" className="w-full" onClick={() => onStepChange(1)}>
          Vamos lá! <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Step 1: Raio-X Financeiro (Consolidation) ────────────────
  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => onStepChange(0)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground mb-2">Seu Raio-X Financeiro</h2>
          <p className="text-sm text-muted-foreground">Este é o panorama completo dos seus dados.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: '💼 Receitas', desc: 'Bloco A — Identidade', color: 'border-primary/30' },
            { label: '💳 Despesas', desc: 'Bloco A — Identidade', color: 'border-primary/30' },
            { label: '🏦 Patrimônio', desc: 'Bloco B — Ativos & Dívidas', color: 'border-primary/30' },
            { label: '📊 Fluxo de Caixa', desc: 'Bloco C — Planejamento', color: 'border-primary/30' },
          ].map((item) => (
            <Card key={item.label} className={cn("border", item.color)}>
              <CardContent className="p-4 text-center">
                <p className="text-lg mb-1">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
                <p className="text-xs text-primary mt-1">✓ Mapeado</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-sm text-muted-foreground text-center mb-4">
          Revisou? Vamos definir suas metas!
        </p>

        <Button variant="hero" size="lg" className="w-full" onClick={() => onStepChange(2)}>
          Definir minha meta <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Step 2: Define annual goal ───────────────────────────────
  if (step === 2) {
    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => onStepChange(1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground mb-2">Qual seu principal objetivo?</h2>
          <p className="text-sm text-muted-foreground">Escolha o que mais importa para você este ano.</p>
        </div>

        <div className="space-y-2 mb-6">
          {GOAL_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedGoal(opt.id)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all",
                selectedGoal === opt.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className="text-xl">{opt.icon}</span>
              <span className="text-sm font-medium text-foreground">{opt.label}</span>
            </button>
          ))}
          <div className={cn(
            "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
            selectedGoal === 'outro' ? "border-primary bg-primary/5" : "border-border"
          )}>
            <span className="text-xl">✨</span>
            <Input
              placeholder="Outro objetivo..."
              value={customGoal}
              onFocus={() => setSelectedGoal('outro')}
              onChange={(e) => { setCustomGoal(e.target.value); setSelectedGoal('outro'); }}
              className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <label className="text-sm font-medium text-foreground block mb-2">
            <Target className="h-4 w-4 inline mr-1" />
            Valor da meta (R$)
          </label>
          <Input
            type="number"
            placeholder="Ex: 42000"
            value={goalValue}
            onChange={(e) => setGoalValue(e.target.value)}
            className="text-lg"
          />
        </div>

        <Button
          variant="hero"
          size="lg"
          className="w-full"
          disabled={!selectedGoal}
          onClick={() => {
            onSaveDraft('goal', { selectedGoal, customGoal, goalValue });
            onStepChange(3);
          }}
        >
          Ver minha projeção de 30 anos <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Step 3: GRAND FINALE ─────────────────────────────────────
  if (step === 3) {
    const md = milestoneData as any;

    const metrics = md
      ? [
          { label: 'Cenário A — Padrão Atual', value: formatBRL(md.scenario_a_30y) },
          { label: 'Cenário B — Seguindo Metas', value: formatBRL(md.scenario_b_30y) },
          { label: 'Diferença', value: formatBRL(md.difference) },
          { label: 'Extra mensal necessário', value: `${formatBRL(md.extra_monthly_needed)}/mês` },
        ]
      : [
          { label: 'Cenário A', value: 'Calculando...' },
          { label: 'Cenário B', value: 'Calculando...' },
          { label: 'Diferença', value: 'Calculando...' },
          { label: 'Extra/mês', value: 'Calculando...' },
        ];

    const insightText = md
      ? `A diferença de ${formatBRL(md.difference)} começa com ${formatBRL(md.extra_monthly_needed)}/mês a mais de investimento.`
      : 'Calculando sua projeção de 30 anos...';

    return (
      <div className="py-8">
        <ConquestCard
          level={4}
          badge="diamond"
          crown
          title="🏆 DOMÍNIO TOTAL!"
          metrics={metrics}
          insight={insightText}
          onContinue={onComplete}
          continueLabel="Ir para o Dashboard com Dados Reais →"
          softUpsell={{
            text: '💎 No Premium: projeção personalizada com IA, cenários ilimitados e alertas automáticos.',
            ctaText: 'Ver planos',
            ctaRoute: '/financeiro/planos',
          }}
        />
      </div>
    );
  }

  return null;
};
