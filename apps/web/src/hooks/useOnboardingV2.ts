import { useEffect, useCallback } from 'react';
import { useOnboardingV2Store, type OnboardingStep } from '@/store/onboardingV2Store';

const STEP_LABELS: Record<OnboardingStep, string> = {
  0: 'Perfil',
  1: 'Identidade',
  2: 'Conexão',
  3: 'Patrimônio',
  4: 'Imposto de Renda',
  5: 'Revisão',
  6: 'Concluído',
};

const TOTAL_STEPS = 6;

export function useOnboardingV2() {
  const store = useOnboardingV2Store();
  const { loadState, markAbandoned, currentStep, stepsCompleted, onboardingCompleted } = store;

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    if (onboardingCompleted) return;
    const handleBeforeUnload = () => {
      markAbandoned(currentStep);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentStep, onboardingCompleted, markAbandoned]);

  const isStepAccessible = useCallback((step: OnboardingStep): boolean => {
    if (step === 0) return true;
    if (step === currentStep) return true;
    return stepsCompleted.includes(step);
  }, [currentStep, stepsCompleted]);

  const stepLabel = useCallback((step: OnboardingStep): string => {
    return STEP_LABELS[step] ?? '';
  }, []);

  const progressPercent = (stepsCompleted.length / TOTAL_STEPS) * 100;

  return {
    ...store,
    isStepAccessible,
    stepLabel,
    progressPercent,
  };
}
