import React, { useState, useEffect } from 'react';
import {
  ArrowRight, ArrowLeft, Crown, TrendingUp,
  Wallet, Target, FileText, BarChart3,
  Sparkles, CheckCircle2, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConquestCard } from '../ConquestCard';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';

interface BlockDProps {
  step: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSaveDraft: (key: string, data: unknown) => void;
}

const formatBRL = (v: number) =>
  v > 0 ? `R$ ${Math.round(v).toLocaleString('pt-BR')}` : 'R$ 0';

const formatBRLShort = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return formatBRL(v);
};

export const BlockD: React.FC<BlockDProps> = ({
  step, onStepChange, onComplete, onSaveDraft,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [masteryData, setMasteryData] = useState<any>(null);
  const [masteryLoading, setMasteryLoading] = useState(false);

  useEffect(() => {
    if (step >= 1 && user?.id && !masteryData && !masteryLoading) {
      setMasteryLoading(true);
      supabase
        .rpc('calculate_milestone_mastery', { p_user_id: user.id })
        .then(({ data }) => setMasteryData(data))
        .finally(() => setMasteryLoading(false));
    }
  }, [step, user?.id]);

  // ─── Step 0: Intro ──────────────────────────────────────────
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
            Seu diagnóstico completo e projeção de patrimônio para 30 anos.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 mb-6 space-y-3">
          {[
            { icon: Wallet,   label: 'Receitas & Despesas mapeadas', sub: '7 fontes de renda · 8 categorias' },
            { icon: BarChart3, label: 'Patrimônio identificado', sub: 'Veículos, bens e dívidas' },
            { icon: FileText,  label: 'Histórico de IR importado', sub: '3 declarações' },
            { icon: Target,    label: 'Orçamento e metas definidos', sub: 'Planejamento configurado' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground mb-4">
          ⏱️ ~2 min · 📊 Resultado: Raio-X + Projeção 30 anos
        </div>

        <Button variant="hero" size="lg" className="w-full" onClick={() => onStepChange(1)}>
          Ver meu diagnóstico completo <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Loading state (steps 1-3 compartilham dados) ───────────
  if (masteryLoading || (step >= 1 && !masteryData)) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex flex-col items-center gap-4">
        <RXFinLoadingSpinner size={48} />
        <p className="text-sm text-muted-foreground text-center">
          Calculando seu Raio-X financeiro...
        </p>
      </div>
    );
  }

  const md = masteryData as any;

  // ─── Step 1: Raio-X Financeiro com dados reais ──────────────
  if (step === 1) {
    const hasIncome = (md?.receita_mensal ?? 0) > 0;
    const hasSaving = (md?.sobra_mensal ?? 0) > 0;
    const savingPct = md?.taxa_poupanca_pct ?? 0;

    const summaryCards = [
      {
        icon: Wallet,
        label: 'Receita mensal',
        value: formatBRL(md?.receita_mensal ?? 0),
        sub: `${md?.income_items ?? 0} fonte${md?.income_items !== 1 ? 's' : ''} configurada${md?.income_items !== 1 ? 's' : ''}`,
        color: 'text-primary',
      },
      {
        icon: TrendingUp,
        label: 'Despesa mensal',
        value: formatBRL(md?.despesa_mensal ?? 0),
        sub: `${md?.expense_categories ?? 0} categorias`,
        color: 'text-foreground',
      },
      {
        icon: Target,
        label: 'Sobra para investir',
        value: hasSaving ? formatBRL(md.sobra_mensal) : '—',
        sub: hasSaving ? `${savingPct}% da renda` : 'Configure suas receitas',
        color: hasSaving ? 'text-primary' : 'text-muted-foreground',
      },
      {
        icon: BarChart3,
        label: 'Patrimônio líquido',
        value: formatBRLShort(md?.patrimonio_liquido ?? 0),
        sub: `${md?.ir_imports ?? 0} declaraç${md?.ir_imports !== 1 ? 'ões' : 'ão'} de IR`,
        color: 'text-primary',
      },
    ];

    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => onStepChange(0)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-primary uppercase tracking-wide">
              Raio-X Financeiro
            </p>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Panorama completo dos seus dados
          </h2>
          <p className="text-sm text-muted-foreground">
            Consolidamos tudo que você mapeou nos 3 blocos anteriores.
          </p>
        </div>

        {/* Grid de métricas */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {summaryCards.map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
              <p className={cn('text-lg font-bold', color)}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Links rápidos para o app */}
        <div className="bg-muted/30 rounded-xl p-4 mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Continue explorando após o onboarding
          </p>
          <div className="space-y-2">
            {[
              { label: 'Visão Mensal do Fluxo', route: '/planejamento/visao-mensal' },
              { label: 'Planejamento Anual', route: '/planejamento-anual' },
              { label: 'Bens & Investimentos', route: '/bens-investimentos' },
            ].map(({ label, route }) => (
              <button
                key={route}
                type="button"
                onClick={() => { onComplete(); navigate(route); }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-card border border-border hover:border-primary/50 transition-all group"
              >
                <span className="text-sm text-foreground">{label}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>

        <Button variant="hero" size="lg" className="w-full" onClick={() => onStepChange(2)}>
          Ver projeção de 30 anos <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Step 2: Projeção 30 anos ────────────────────────────────
  if (step === 2) {
    const cenarioA = md?.scenario_a_30y ?? 0;
    const cenarioB = md?.scenario_b_30y ?? 0;
    const diferenca = md?.difference ?? 0;
    const extraMensal = md?.extra_monthly_needed ?? 0;
    const sobraMensal = md?.sobra_mensal ?? 0;
    const hasSobra = sobraMensal > 0;

    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => onStepChange(1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-primary uppercase tracking-wide">
              Projeção de Futuro
            </p>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Seu patrimônio em 30 anos
          </h2>
          <p className="text-sm text-muted-foreground">
            Duas simulações baseadas no seu patrimônio atual
            ({formatBRLShort(md?.patrimonio_liquido ?? 0)})
            e sobra mensal.
          </p>
        </div>

        {/* Dois cenários */}
        <div className="space-y-3 mb-5">
          {/* Cenário A */}
          <div className="bg-card border-2 border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Cenário A — Conservador
                </p>
                <p className="text-xs text-muted-foreground">
                  ~6% a.a. · {hasSobra ? `aporte de ${formatBRLShort(sobraMensal * 0.5)}/mês` : 'sem aportes regulares'}
                </p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatBRLShort(cenarioA)}
              </p>
            </div>
            <div className="h-1.5 bg-muted rounded-full">
              <div className="h-1.5 bg-muted-foreground/40 rounded-full" style={{ width: '40%' }} />
            </div>
          </div>

          {/* Cenário B */}
          <div className="bg-primary/5 border-2 border-primary rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Cenário B — Moderado
                </p>
                <p className="text-xs text-muted-foreground">
                  ~10% a.a. · {hasSobra ? `aporte de ${formatBRLShort(sobraMensal)}/mês` : 'começando a investir'}
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">
                {formatBRLShort(cenarioB)}
              </p>
            </div>
            <div className="h-1.5 bg-primary/20 rounded-full">
              <div className="h-1.5 bg-primary rounded-full" style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        {/* Insight */}
        <div className="bg-card border border-border rounded-xl p-4 mb-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Diferença entre cenários</p>
              <p className="text-lg font-bold text-primary">{formatBRLShort(diferenca)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Extra/mês para Cenário B</p>
              <p className="text-lg font-bold text-foreground">
                {extraMensal > 0 ? formatBRLShort(extraMensal) : hasSobra ? '—' : 'Qualquer valor'}
              </p>
            </div>
          </div>
        </div>

        {/* Nota */}
        <div className="bg-muted/30 rounded-xl p-3 mb-5 flex items-start gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Simulação baseada no patrimônio líquido atual, sem considerar inflação.
            Veja cenários detalhados em <strong>Planejamento Anual</strong>.
          </p>
        </div>

        <Button variant="hero" size="lg" className="w-full" onClick={() => onStepChange(3)}>
          Concluir onboarding <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Step 3: Grand Finale — Conquest Diamond ────────────────
  if (step === 3) {
    const metrics = md ? [
      { label: 'Patrimônio atual',     value: formatBRLShort(md.patrimonio_liquido ?? 0) },
      { label: 'Cenário A (30 anos)',  value: formatBRLShort(md.scenario_a_30y ?? 0) },
      { label: 'Cenário B (30 anos)',  value: formatBRLShort(md.scenario_b_30y ?? 0) },
      { label: 'Potencial de ganho',   value: formatBRLShort(md.difference ?? 0) },
    ] : [
      { label: 'Patrimônio',   value: 'Calculando...' },
      { label: 'Cenário A',    value: 'Calculando...' },
      { label: 'Cenário B',    value: 'Calculando...' },
      { label: 'Potencial',    value: 'Calculando...' },
    ];

    const insight = md
      ? `Você tem ${formatBRLShort(md.patrimonio_liquido ?? 0)} de patrimônio líquido hoje. Seguindo o Cenário B, pode chegar a ${formatBRLShort(md.scenario_b_30y ?? 0)} em 30 anos.`
      : 'Calculando sua projeção...';

    return (
      <div className="py-8">
        <ConquestCard
          level={4}
          badge="diamond"
          crown
          title="🏆 DOMÍNIO TOTAL!"
          metrics={metrics}
          insight={insight}
          onContinue={onComplete}
          continueLabel="Ir para o Dashboard →"
          softUpsell={{
            text: '💎 Premium: projeção personalizada com IA, cenários ilimitados e alertas automáticos.',
            ctaText: 'Ver planos',
            ctaRoute: '/financeiro/planos',
          }}
        />
      </div>
    );
  }

  return null;
};
