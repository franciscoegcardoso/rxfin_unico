import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboardingCheckpoint } from '@/hooks/useOnboardingCheckpoint';

type OnboardingPhase =
  | 'not_started'
  | 'started'
  | 'block_a_done'
  | 'block_b_done'
  | 'block_c_done'
  | 'completed';

const PROGRESS_PHASES: OnboardingPhase[] = [
  'started',
  'block_a_done',
  'block_b_done',
  'block_c_done',
];

const PHASE_LABEL: Record<string, string> = {
  started: 'Bloco 1/4 — Perfil financeiro',
  block_a_done: 'Bloco 2/4 — Patrimônio',
  block_b_done: 'Bloco 3/4 — Conectar bancos',
  block_c_done: 'Bloco 4/4 — Metas e sonhos',
};

// Progresso da barra: porcentagem concluída até agora
const PHASE_PROGRESS: Record<string, number> = {
  started: 0,
  block_a_done: 25,
  block_b_done: 50,
  block_c_done: 75,
};

interface OnboardingProgressBannerProps {
  inline?: boolean;
}

export const OnboardingProgressBanner: React.FC<OnboardingProgressBannerProps> = ({
  inline = false,
}) => {
  const navigate = useNavigate();
  const { currentPhase, isLoading } = useOnboardingCheckpoint();

  if (isLoading || !PROGRESS_PHASES.includes(currentPhase as OnboardingPhase)) {
    return null;
  }

  const label = PHASE_LABEL[currentPhase] ?? '';
  const progress = PHASE_PROGRESS[currentPhase] ?? 0;

  const basePlacement = inline
    ? 'relative z-40 w-full shrink-0'
    : 'fixed top-14 left-0 right-0 z-40 w-full';

  return (
    <div
      className={`
        ${basePlacement}
        h-8
        bg-[hsl(var(--color-brand-950))]
        dark:bg-[hsl(var(--color-brand-900))]
        flex items-center
        px-4 md:px-6 lg:px-8
        gap-3
      `}
    >
      {/* Ícone */}
      <Rocket className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--color-brand-300))]" />

      {/* Label de fase */}
      <span className="text-xs font-medium text-[hsl(var(--color-brand-100))] whitespace-nowrap hidden sm:inline">
        Raio-X em andamento
      </span>
      <span className="text-xs text-[hsl(var(--color-brand-300))] whitespace-nowrap hidden md:inline">
        · {label}
      </span>

      {/* Barra de progresso */}
      <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-[hsl(var(--color-brand-800))] hidden sm:block">
        <div
          className="h-full rounded-full bg-[hsl(var(--color-brand-400))] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Botão */}
      <Button
        size="sm"
        onClick={() => navigate('/onboarding2')}
        className="
          ml-auto h-6 px-3 text-xs font-semibold gap-1
          bg-[hsl(var(--color-brand-600))]
          hover:bg-[hsl(var(--color-brand-500))]
          text-white
          shrink-0
        "
      >
        <span className="hidden sm:inline">Continuar Raio-X</span>
        <span className="sm:hidden">Continuar</span>
        <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );
};
