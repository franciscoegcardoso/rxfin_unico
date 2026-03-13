import React from 'react';
import { Check } from 'lucide-react';
import type { OnboardingStep } from '@/store/onboardingV2Store';
import { cn } from '@/lib/utils';

const STEP_LABELS: Record<OnboardingStep, string> = {
  0: 'Perfil',
  1: 'Identidade',
  2: 'Conexão',
  3: 'Patrimônio',
  4: 'Imposto de Renda',
  5: 'Revisão',
  6: 'Concluído',
};

const STEPS: OnboardingStep[] = [0, 1, 2, 3, 4, 5, 6];

export interface OnboardingProgressBarProps {
  currentStep: OnboardingStep;
  stepsCompleted: OnboardingStep[];
  onStepClick: (step: OnboardingStep) => void;
  isStepAccessible?: (step: OnboardingStep) => boolean;
  className?: string;
}

export const OnboardingProgressBar: React.FC<OnboardingProgressBarProps> = ({
  currentStep,
  stepsCompleted,
  onStepClick,
  isStepAccessible = () => false,
  className,
}) => {
  return (
    <nav
      className={cn('flex flex-wrap items-center justify-center gap-2 sm:gap-3', className)}
      aria-label="Progresso do onboarding"
    >
      {STEPS.map((step, index) => {
        const isCompleted = stepsCompleted.includes(step);
        const isCurrent = currentStep === step;
        const isFuture = !isCompleted && !isCurrent;
        const accessible = typeof isStepAccessible === 'function' ? isStepAccessible(step) : (step === 0 || isCompleted || isCurrent);

        const handleClick = () => {
          if (!accessible) return;
          onStepClick(step);
        };

        return (
          <button
            key={step}
            type="button"
            onClick={handleClick}
            disabled={!accessible}
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={`${STEP_LABELS[step]}${isCompleted ? ', concluído' : isCurrent ? ', etapa atual' : ''}`}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isCompleted &&
                'cursor-pointer bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.25)]',
              isCurrent &&
                'bg-primary text-primary-foreground shadow-sm scale-105',
              isFuture &&
                'cursor-default bg-[hsl(var(--color-surface-sunken))] text-[hsl(var(--color-text-tertiary))]',
            )}
          >
            {isCompleted ? (
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--income))] text-white transition-colors duration-200"
                aria-hidden
              >
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </span>
            ) : (
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors duration-200',
                  isCurrent && 'bg-primary-foreground/20 text-primary-foreground',
                  isFuture && 'bg-[hsl(var(--color-border-default))] text-[hsl(var(--color-text-tertiary))]',
                )}
                aria-hidden
              >
                {step + 1}
              </span>
            )}
            <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
          </button>
        );
      })}
    </nav>
  );
};
