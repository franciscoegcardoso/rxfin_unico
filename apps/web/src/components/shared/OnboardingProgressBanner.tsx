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
  block_a_done: 'Bloco 2/4 — Conectar bancos',
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
  placement?: 'below-header' | 'inline' | 'fixed-top';
}

export const OnboardingProgressBanner: React.FC<OnboardingProgressBannerProps> = ({
  inline = false,
  placement,
}) => {
  const navigate = useNavigate();
  const { currentPhase, isLoading } = useOnboardingCheckpoint();

  if (isLoading || !PROGRESS_PHASES.includes(currentPhase as OnboardingPhase)) {
    return null;
  }

  const label = PHASE_LABEL[currentPhase] ?? '';
  const progress = PHASE_PROGRESS[currentPhase] ?? 0;

  let basePlacement: string;
  if (placement === 'below-header') {
    basePlacement = 'fixed top-14 left-0 right-0 z-[39] w-full';
  } else if (placement === 'fixed-top') {
    basePlacement = 'fixed top-14 left-0 right-0 z-[39] w-full';
  } else if (inline || placement === 'inline') {
    basePlacement = 'relative z-40 w-full shrink-0';
  } else {
    basePlacement = 'fixed top-14 left-0 right-0 z-40 w-full';
  }

  return (
    <div
      className={`
        ${basePlacement}
        min-h-[48px]
        bg-[hsl(var(--color-brand-950))] dark:bg-[hsl(var(--color-brand-900))]
        text-white
        flex items-center
      `}
    >
      <div className="w-full max-w-[1800px] mx-auto px-4 py-3 min-h-[48px] flex flex-wrap items-center justify-between gap-3">

        {/* Lado esquerdo: ícone + texto de contexto */}
        <div className="flex items-center gap-2 min-w-0">
          <Rocket className="h-4 w-4 shrink-0 text-[hsl(var(--color-brand-300))]" />
          <div className="min-w-0">
            {/* Mobile: copy curto direto ao ponto */}
            <p className="text-sm font-semibold text-white sm:hidden">
              Raio-X em andamento — {label}
            </p>
            {/* Desktop: copy completo com barra de progresso inline */}
            <div className="hidden sm:flex items-center gap-3">
              <p className="text-sm font-semibold text-white whitespace-nowrap">
                Raio-X em andamento
              </p>
              <span className="text-xs text-[hsl(var(--color-brand-300))] whitespace-nowrap hidden md:inline">
                · {label}
              </span>
              {/* Barra de progresso */}
              <div className="w-24 h-1.5 rounded-full bg-[hsl(var(--color-brand-800))]">
                <div
                  className="h-full rounded-full bg-[hsl(var(--color-brand-400))] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-[hsl(var(--color-brand-300))] tabular-nums">
                {progress}%
              </span>
            </div>
          </div>
        </div>

        {/* Lado direito: botão CTA */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <Button
            size="sm"
            onClick={() => navigate('/onboarding')}
            className="
              font-bold text-xs sm:text-sm gap-1.5
              bg-[hsl(var(--color-brand-600))] hover:bg-[hsl(var(--color-brand-500))]
              text-white shadow-md
              whitespace-nowrap
              hover:scale-105 transition-transform
            "
          >
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Continuar meu Raio-X →</span>
            <span className="sm:hidden">Continuar →</span>
          </Button>
        </div>

      </div>
    </div>
  );
};
