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

const PROGRESS_PHASES: OnboardingPhase[] = ['started', 'block_a_done', 'block_b_done', 'block_c_done'];

/** Altura fixa do banner para compensação no MobileShell (pt). */
export const ONBOARDING_BANNER_HEIGHT_PX = 48;

const PHASE_LABEL: Record<string, string> = {
  started: 'Bloco 1/4 — Perfil financeiro',
  block_a_done: 'Bloco 2/4 — Conectar bancos',
  block_b_done: 'Bloco 3/4 — Conectar bancos',
  block_c_done: 'Bloco 4/4 — Metas e sonhos',
};

const PHASE_PROGRESS: Record<string, number> = {
  started: 0,
  block_a_done: 25,
  block_b_done: 50,
  block_c_done: 75,
};

export type OnboardingBannerVariant = 'raio_x' | 'control';

export interface OnboardingProgressBannerProps {
  inline?: boolean;
  placement?: 'below-header' | 'inline' | 'fixed-top';
  /** Modo controlado: vem de get_banner_state() — sem ler fase do hook */
  ctaRoute?: string;
  ctaLabel?: string;
  /** Fase do Raio-X para barra de progresso (ex.: started, block_a_done) */
  phase?: string | null;
  variant?: OnboardingBannerVariant;
}

export const OnboardingProgressBanner: React.FC<OnboardingProgressBannerProps> = ({
  inline = false,
  placement,
  ctaRoute,
  ctaLabel,
  phase: phaseProp,
  variant = 'raio_x',
}) => {
  const navigate = useNavigate();
  const { currentPhase, isLoading } = useOnboardingCheckpoint();

  const controlled = Boolean(ctaRoute && ctaLabel);
  const phase = (controlled ? phaseProp : currentPhase) as string;
  const effectivePhase = phase ?? '';

  if (controlled) {
    const isControl = variant === 'control';
    const label = isControl
      ? 'Complete a configuração guiada do RXFin'
      : PHASE_LABEL[effectivePhase] ?? '';
    const progress = isControl ? 50 : PHASE_PROGRESS[effectivePhase] ?? 0;
    const titleShort = isControl ? 'Configuração em andamento' : 'Raio-X em andamento';
    const titleDesktop = isControl ? 'Configuração em andamento' : 'Raio-X em andamento';

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
        h-[48px]
        bg-[hsl(var(--color-brand-950))] dark:bg-[hsl(var(--color-brand-900))]
        text-white
        flex items-center
      `}
      >
        <div className="w-full max-w-[1800px] mx-auto px-4 h-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Rocket className="h-4 w-4 shrink-0 text-[hsl(var(--color-brand-300))]" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white sm:hidden">
                {titleShort} — {label}
              </p>
              <div className="hidden sm:flex items-center gap-3">
                <p className="text-sm font-semibold text-white whitespace-nowrap">{titleDesktop}</p>
                {!isControl && (
                  <>
                    <span className="text-xs text-[hsl(var(--color-brand-300))] whitespace-nowrap hidden md:inline">
                      · {label}
                    </span>
                    <div className="w-24 h-1.5 rounded-full bg-[hsl(var(--color-brand-800))]">
                      <div
                        className="h-full rounded-full bg-[hsl(var(--color-brand-400))] transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-[hsl(var(--color-brand-300))] tabular-nums">{progress}%</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <Button
              size="sm"
              onClick={() => navigate(ctaRoute!)}
              className="
              font-bold text-xs sm:text-sm gap-1.5
              bg-[hsl(var(--color-brand-600))] hover:bg-[hsl(var(--color-brand-500))]
              text-white shadow-md
              whitespace-nowrap
              hover:scale-105 transition-transform
            "
            >
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{ctaLabel}</span>
              <span className="sm:hidden">Continuar →</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
        h-[48px]
        bg-[hsl(var(--color-brand-950))] dark:bg-[hsl(var(--color-brand-900))]
        text-white
        flex items-center
      `}
    >
      <div className="w-full max-w-[1800px] mx-auto px-4 h-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Rocket className="h-4 w-4 shrink-0 text-[hsl(var(--color-brand-300))]" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white sm:hidden">Raio-X em andamento — {label}</p>
            <div className="hidden sm:flex items-center gap-3">
              <p className="text-sm font-semibold text-white whitespace-nowrap">Raio-X em andamento</p>
              <span className="text-xs text-[hsl(var(--color-brand-300))] whitespace-nowrap hidden md:inline">
                · {label}
              </span>
              <div className="w-24 h-1.5 rounded-full bg-[hsl(var(--color-brand-800))]">
                <div
                  className="h-full rounded-full bg-[hsl(var(--color-brand-400))] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-[hsl(var(--color-brand-300))] tabular-nums">{progress}%</span>
            </div>
          </div>
        </div>
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
