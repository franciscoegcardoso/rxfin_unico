import { useState } from 'react';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import type { AssetClass, OnboardingPersona } from '@/types/allocation';
import {
  PERSONA_DEFAULTS,
  useUpsertAllocationPolicy,
} from '@/hooks/useAllocationDashboard';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PERSONAS: {
  id: OnboardingPersona;
  title: string;
  desc: string;
  emoji: string;
}[] = [
  {
    id: 'acumulador',
    title: 'Acumulador Sistemático',
    desc: 'Aporto todo mês, quero saber onde colocar',
    emoji: '📊',
  },
  {
    id: 'engenheiro',
    title: 'Engenheiro de Portfolio',
    desc: 'Gerencio minha carteira e quero automatizar',
    emoji: '⚙️',
  },
  {
    id: 'fii_dependente',
    title: 'Renda Passiva com FIIs',
    desc: 'Foco em FIIs para renda passiva',
    emoji: '🏢',
  },
  {
    id: 'iniciante',
    title: 'Iniciante Assessorado',
    desc: 'Tenho carteira mas quero entender melhor',
    emoji: '🎓',
  },
];

const CLASS_LABELS: Record<AssetClass, string> = {
  renda_fixa: 'Renda Fixa',
  acoes: 'Ações',
  fii: 'FIIs',
  internacional: 'Internacional',
  cripto: 'Cripto',
  alternativo: 'Alternativo',
};

const ACTIVE_CLASSES: AssetClass[] = ['renda_fixa', 'acoes', 'fii', 'internacional'];

interface Props {
  onComplete: () => void;
}

export function PersonaOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [persona, setPersona] = useState<OnboardingPersona | null>(null);
  const [targets, setTargets] = useState<Record<AssetClass, number>>({
    ...PERSONA_DEFAULTS.acumulador,
  });

  const upsert = useUpsertAllocationPolicy();

  function selectPersona(p: OnboardingPersona) {
    setPersona(p);
    setTargets({ ...PERSONA_DEFAULTS[p] });
    setStep(2);
  }

  function updateTarget(cls: AssetClass, value: number) {
    setTargets((prev) => ({ ...prev, [cls]: value }));
  }

  const totalPct = ACTIVE_CLASSES.reduce((sum, cls) => sum + (targets[cls] ?? 0), 0);
  const isValid = Math.abs(totalPct - 100) < 0.01;

  async function handleConfirm() {
    if (!persona || !isValid) return;
    try {
      await upsert.mutateAsync({ persona, targets });
      setStep(3);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar a política.');
    }
  }

  if (step === 3) {
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center border-2 border-emerald-500/40">
          <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
        </div>
        <h2 className="text-xl font-bold text-foreground">Política configurada!</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Sua estratégia de alocação está ativa. Conecte sua corretora para acompanhar o alinhamento
          em tempo real.
        </p>
        <button
          type="button"
          onClick={onComplete}
          className="mt-2 px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors"
        >
          Ver minha alocação
        </button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="flex flex-col gap-6 max-w-md mx-auto px-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Ajuste sua alocação</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Os percentuais devem somar exatamente 100%.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {ACTIVE_CLASSES.map((cls) => (
            <div key={cls} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">{CLASS_LABELS[cls]}</label>
                <span className="text-sm font-bold text-foreground w-12 text-right tabular-nums">
                  {targets[cls]}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={targets[cls]}
                onChange={(e) => updateTarget(cls, Number(e.target.value))}
                className="w-full accent-primary h-2"
              />
            </div>
          ))}
        </div>

        <div
          className={cn(
            'flex items-center justify-between rounded-lg px-4 py-2.5 font-semibold text-sm border',
            isValid
              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
              : 'bg-destructive/10 text-destructive border-destructive/30'
          )}
        >
          <span>Total</span>
          <span className="tabular-nums">
            {totalPct.toFixed(0)}% {isValid ? '✓' : `(ajuste ${100 - totalPct}%)`}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex-1 px-4 py-2.5 border border-border text-foreground rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-muted/80"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || upsert.isPending}
            className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold rounded-lg text-sm transition-colors"
          >
            {upsert.isPending ? 'Salvando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto px-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Como você investe?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha o perfil que mais combina com você — ajuste os percentuais no próximo passo.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectPersona(p.id)}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card',
              'hover:border-primary/60 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all text-left group'
            )}
          >
            <span className="text-2xl shrink-0">{p.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground group-hover:text-primary">{p.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{p.desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
