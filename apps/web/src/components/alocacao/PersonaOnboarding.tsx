import { useState } from 'react';
import type { AssetClass, OnboardingPersona } from '@/types/allocation';
import {
  PERSONA_DEFAULTS,
  useCreateAllocationPolicy,
} from '@/hooks/useAllocationPolicy';

const PERSONAS: {
  id: OnboardingPersona;
  title: string;
  desc: string;
  emoji: string;
}[] = [
  {
    id: 'acumulador',
    title: 'Acumulador Sistemático',
    desc: 'Aporto todo mês e quero saber onde colocar para manter minha estratégia',
    emoji: '📊',
  },
  {
    id: 'engenheiro',
    title: 'Engenheiro de Portfolio',
    desc: 'Já gerencio minha carteira em planilha e quero automatizar o controle',
    emoji: '⚙️',
  },
  {
    id: 'fii_dependente',
    title: 'Renda Passiva FIIs',
    desc: 'Tenho foco em renda passiva com Fundos Imobiliários',
    emoji: '🏢',
  },
  {
    id: 'iniciante',
    title: 'Iniciante Assessorado',
    desc: 'Tenho carteira mas quero entender melhor minha alocação',
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

const ACTIVE_CLASSES: AssetClass[] = [
  'renda_fixa',
  'acoes',
  'fii',
  'internacional',
];

interface Props {
  onComplete: () => void;
}

export function PersonaOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [persona, setPersona] = useState<OnboardingPersona | null>(null);
  const [targets, setTargets] = useState<Record<AssetClass, number>>({
    renda_fixa: 40,
    acoes: 35,
    fii: 20,
    internacional: 5,
    cripto: 0,
    alternativo: 0,
  });

  const createPolicy = useCreateAllocationPolicy();

  function selectPersona(p: OnboardingPersona) {
    setPersona(p);
    setTargets({ ...PERSONA_DEFAULTS[p] });
    setStep(2);
  }

  function updateTarget(cls: AssetClass, value: number) {
    setTargets((prev) => ({ ...prev, [cls]: value }));
  }

  const totalPct = ACTIVE_CLASSES.reduce(
    (sum, cls) => sum + (targets[cls] ?? 0),
    0
  );
  const isValid = Math.abs(totalPct - 100) < 1;

  async function handleConfirm() {
    if (!persona || !isValid) return;
    await createPolicy.mutateAsync({ persona, targets });
    setStep(3);
  }

  if (step === 3) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          Política configurada!
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm">
          Agora conecte sua corretora para ver como sua carteira real se
          compara com sua estratégia.
        </p>
        <button
          type="button"
          onClick={onComplete}
          className="mt-2 px-6 py-2.5 bg-[#00C896] hover:bg-[#00b085] text-white
                     font-semibold rounded-lg transition-colors"
        >
          Ver minha carteira
        </button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="flex flex-col gap-6 max-w-md mx-auto">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Ajuste seus alvos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Defina quanto quer em cada classe. Total deve ser 100%.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {ACTIVE_CLASSES.map((cls) => (
            <div key={cls} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {CLASS_LABELS[cls]}
                </label>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 w-12 text-right">
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
                className="w-full accent-[#00C896]"
              />
            </div>
          ))}
        </div>

        <div
          className={`flex items-center justify-between rounded-lg px-4 py-2.5 font-semibold text-sm
          ${
            isValid
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          <span>Total</span>
          <span>
            {totalPct}% {isValid ? '✓' : `(faltam ${100 - totalPct}%)`}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600
                       text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || createPolicy.isPending}
            className="flex-1 px-4 py-2.5 bg-[#00C896] hover:bg-[#00b085] disabled:opacity-50
                       text-white font-semibold rounded-lg text-sm transition-colors"
          >
            {createPolicy.isPending ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          Qual é o seu perfil?
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Isso define a estratégia inicial da sua carteira.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectPersona(p.id)}
            className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700
                       bg-white dark:bg-slate-800/50 hover:border-[#00C896] hover:bg-green-50
                       dark:hover:bg-green-900/10 dark:hover:border-[#00C896]
                       text-left transition-all group"
          >
            <span className="text-2xl mt-0.5">{p.emoji}</span>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#00C896]">
                {p.title}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {p.desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
