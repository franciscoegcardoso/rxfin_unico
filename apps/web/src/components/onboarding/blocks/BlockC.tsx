import React, { useState, useEffect } from 'react';
import {
  ArrowRight, ArrowLeft, Target, TrendingUp, Wallet,
  Plus, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ConquestCard } from '../ConquestCard';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface BlockCProps {
  step: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSaveDraft: (key: string, data: any) => void;
}

const GOAL_ICONS = [
  { value: 'Shield', label: '🛡️ Reserva' },
  { value: 'Plane', label: '✈️ Viagem' },
  { value: 'Home', label: '🏠 Imóvel' },
  { value: 'Car', label: '🚗 Veículo' },
  { value: 'GraduationCap', label: '🎓 Educação' },
  { value: 'Heart', label: '❤️ Pessoal' },
];

const BUDGET_CATEGORIES = [
  { id: 'moradia', label: 'Moradia', suggested: 30 },
  { id: 'alimentacao', label: 'Alimentação', suggested: 20 },
  { id: 'transporte', label: 'Transporte', suggested: 10 },
  { id: 'saude', label: 'Saúde', suggested: 10 },
  { id: 'lazer', label: 'Lazer', suggested: 10 },
  { id: 'educacao', label: 'Educação', suggested: 5 },
  { id: 'investimentos', label: 'Investimentos', suggested: 15 },
];

const formatBRL = (v: number) => v > 0 ? `R$ ${v.toLocaleString('pt-BR')}` : 'R$ 0';

export const BlockC: React.FC<BlockCProps> = ({ step, onStepChange, onComplete, onSaveDraft }) => {
  const { user } = useAuth();
  const [milestoneData, setMilestoneData] = useState<any>(null);

  useEffect(() => {
    if (step === 4 && user?.id) {
      supabase.rpc('calculate_milestone_cashflow', { p_user_id: user.id })
        .then(({ data }) => setMilestoneData(data));
    }
  }, [step, user?.id]);

  // ─── Step 0: Intro ────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="max-w-2xl mx-auto py-8 animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Nível 3: Planejamento</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Configure seus objetivos financeiros e defina para onde vai cada real do seu dinheiro.
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Neste nível você vai:</h2>
          <div className="space-y-3">
            {[
              { icon: Wallet, label: 'Orçamento Mensal', desc: 'Defina limites por categoria de gasto' },
              { icon: Target, label: 'Metas Financeiras', desc: 'Reserva de emergência, viagem, investimento' },
              { icon: TrendingUp, label: 'Visão do Futuro', desc: 'Projeção personalizada baseada nos seus dados' },
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
        <div className="text-center text-sm text-muted-foreground mb-3">⏱️ ~5 min | 📊 Resultado: Fluxo de Caixa</div>
        <Button variant="hero" size="lg" className="w-full" onClick={() => onStepChange(1)}>
          Planejar meu Futuro <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Step 1: Budget allocation ────────────────────────────────
  if (step === 1) {
    return (
      <div className="max-w-3xl mx-auto py-4">
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => onStepChange(0)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button variant="hero" size="sm" onClick={() => { onSaveDraft('budget', {}); onStepChange(2); }}>
            Próximo: Metas <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <BudgetEditor />
      </div>
    );
  }

  // ─── Step 2: Goals ────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="max-w-3xl mx-auto py-4">
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => onStepChange(1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button variant="hero" size="sm" onClick={() => { onSaveDraft('goals', {}); onStepChange(3); }}>
            Próximo: Revisão <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <GoalEditor />
      </div>
    );
  }

  // ─── Step 3: Review ───────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => onStepChange(2)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground mb-2">Quase lá!</h2>
          <p className="text-sm text-muted-foreground">Vamos ver o resultado do seu fluxo de caixa.</p>
        </div>
        <Button variant="hero" size="lg" className="w-full" onClick={() => onStepChange(4)}>
          Ver meu Fluxo de Caixa <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Step 4: Conquest Card ────────────────────────────────────
  if (step === 4) {
    const md = milestoneData as any;
    const variancePositive = md?.variance >= 0;

    const metrics = md
      ? [
          { label: 'Receita Planejada', value: formatBRL(md.planned_income) },
          { label: 'Despesa Planejada', value: formatBRL(md.planned_expenses) },
          { label: 'Receita Real', value: formatBRL(md.actual_income) },
          { label: 'Variância', value: `${md.variance_label || (variancePositive ? 'Abaixo do orçamento ✓' : 'Acima do orçamento ⚠️')}` },
        ]
      : [
          { label: 'Planejado', value: 'Calculando...' },
          { label: 'Realizado', value: 'Calculando...' },
          { label: 'Variância', value: 'Calculando...' },
          { label: 'Status', value: '...' },
        ];

    const insightText = md
      ? variancePositive
        ? `Suas despesas reais estão abaixo do planejado. Excelente controle! ✓`
        : `Suas despesas reais estão acima do planejado. Hora de ajustar! ⚠️`
      : 'Calculando seu fluxo de caixa...';

    return (
      <div className="py-8">
        <ConquestCard
          level={3}
          badge="gold"
          title="Fluxo de Caixa Mapeado!"
          metrics={metrics}
          insight={insightText}
          nextLevelPreview="Nível 4 — Domínio Total: projeção financeira de 30 anos."
          onContinue={onComplete}
          continueLabel="Avançar para Nível 4: Domínio Total"
        />
      </div>
    );
  }

  return null;
};

// ─── Budget Editor ──────────────────────────────────────────────

const BudgetEditor: React.FC = () => {
  const [budgets, setBudgets] = useState(
    BUDGET_CATEGORIES.map(c => ({ ...c, percent: c.suggested }))
  );
  const total = budgets.reduce((acc, b) => acc + b.percent, 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Wallet className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Orçamento por Categoria</h2>
          <p className="text-sm text-muted-foreground">Distribua sua renda em % por categoria</p>
        </div>
      </div>
      <div className="space-y-3 mb-4">
        {budgets.map((b, i) => (
          <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <span className="text-sm font-medium text-foreground flex-1">{b.label}</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-16 h-8 text-center text-sm"
                value={b.percent}
                min={0}
                max={100}
                onChange={e => {
                  const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                  setBudgets(prev => prev.map((item, idx) => idx === i ? { ...item, percent: val } : item));
                }}
              />
              <span className="text-xs text-muted-foreground w-6">%</span>
            </div>
          </div>
        ))}
      </div>
      <div className={`text-center text-sm font-medium ${total === 100 ? 'text-primary' : total > 100 ? 'text-destructive' : 'text-muted-foreground'}`}>
        Total: {total}% {total !== 100 && `(ideal: 100%)`}
      </div>
    </div>
  );
};

// ─── Goal Editor ────────────────────────────────────────────────

interface GoalForm { name: string; targetValue: string; currentValue: string; deadline: string; icon: string; }

const GoalEditor: React.FC = () => {
  const [goals, setGoals] = useState<GoalForm[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<GoalForm>({ name: '', targetValue: '', currentValue: '0', deadline: '', icon: 'Shield' });

  const handleAdd = () => {
    if (!form.name.trim() || !form.targetValue) return;
    setGoals(prev => [...prev, { ...form }]);
    setForm({ name: '', targetValue: '', currentValue: '0', deadline: '', icon: 'Shield' });
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Target className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Metas Financeiras</h2>
          <p className="text-sm text-muted-foreground">Defina objetivos concretos para o seu dinheiro</p>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        {goals.map((g, i) => (
          <Card key={i} className="border border-border">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  R$ {Number(g.currentValue).toLocaleString('pt-BR')} / R$ {Number(g.targetValue).toLocaleString('pt-BR')}
                  {g.deadline && ` • até ${g.deadline}`}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setGoals(prev => prev.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {adding ? (
        <Card className="border border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome da meta *</Label>
                <Input placeholder="Ex: Reserva de Emergência" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ícone</Label>
                <Select value={form.icon} onValueChange={v => setForm(p => ({ ...p, icon: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOAL_ICONS.map(ic => <SelectItem key={ic.value} value={ic.value}>{ic.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor alvo (R$) *</Label>
                <Input type="number" placeholder="0" value={form.targetValue} onChange={e => setForm(p => ({ ...p, targetValue: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Já acumulado (R$)</Label>
                <Input type="number" placeholder="0" value={form.currentValue} onChange={e => setForm(p => ({ ...p, currentValue: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prazo</Label>
                <Input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setAdding(false)}>Cancelar</Button>
              <Button size="sm" className="flex-1" onClick={handleAdd} disabled={!form.name.trim() || !form.targetValue}>Adicionar</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" className="w-full border-dashed py-5" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar Meta
        </Button>
      )}
      {goals.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          Metas ajudam a dar direção ao seu dinheiro. Você pode pular e criar depois.
        </p>
      )}
    </div>
  );
};
