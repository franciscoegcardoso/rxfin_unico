import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboardingCheckpoint } from '@/hooks/useOnboardingCheckpoint';
import { useOnboardingControlCheckpoint } from '@/hooks/useOnboardingControlCheckpoint';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { ControlProgressBar } from './ControlProgressBar';
import { StepTransition } from './steps/StepTransition';
import { StepPlanejamento } from './steps/StepPlanejamento';
import { StepFluxo } from './steps/StepFluxo';
import { StepCartao } from './steps/StepCartao';
import { StepMetas } from './steps/StepMetas';
import { StepPatrimonio } from './steps/StepPatrimonio';
import { StepGrandFinale } from './steps/StepGrandFinale';

type ControlStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const PHASE_TO_STEP: Record<string, number> = {
  'not_started': 0,
  'started': 0,
  'planejamento_done': 2,
  'fluxo_done': 3,
  'cartao_done': 4,
  'metas_done': 5,
  'patrimonio_done': 6,
  'completed': 6,
};

export const OnboardingControlWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentControlPhase, controlDone, isLoading } = useOnboardingCheckpoint();
  const { advanceControlPhase, logControlEvent } = useOnboardingControlCheckpoint();

  const [currentStep, setCurrentStep] = useState<ControlStep>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Restore progress from DB
  useEffect(() => {
    if (isLoading || initialized) return;
    
    if (controlDone) {
      navigate('/inicio', { replace: true });
      return;
    }

    const savedStep = PHASE_TO_STEP[currentControlPhase] ?? 0;
    setCurrentStep(savedStep as ControlStep);
    
    // Mark previous steps as completed
    const completed: number[] = [];
    for (let i = 1; i < savedStep; i++) completed.push(i);
    setCompletedSteps(completed);
    setInitialized(true);
  }, [isLoading, currentControlPhase, controlDone, initialized, navigate]);

  const handleAdvanceStep = useCallback(async (
    phaseToAdvance: string,
    eventName: string,
    nextStep: ControlStep,
    completedStep?: number,
  ) => {
    await advanceControlPhase(phaseToAdvance as any);
    await logControlEvent(eventName);
    if (completedStep !== undefined) {
      setCompletedSteps(prev => [...prev, completedStep]);
    }
    setCurrentStep(nextStep);
  }, [advanceControlPhase, logControlEvent]);

  const handleComplete = useCallback(async () => {
    await advanceControlPhase('completed');
    await logControlEvent('control_onboarding_completed');
    navigate('/inicio', { replace: true });
  }, [advanceControlPhase, logControlEvent, navigate]);

  if (isLoading || !initialized) {
    return <RXFinLoadingSpinner height="h-screen" message="Carregando..." />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      {currentStep > 0 && currentStep < 6 && (
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-3">
          <ControlProgressBar completedSteps={completedSteps.length} totalSteps={6} />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {currentStep === 0 && (
            <StepTransition
              onStart={() => handleAdvanceStep('started', 'control_started', 1)}
            />
          )}
          {currentStep === 1 && (
            <StepPlanejamento
              userId={user?.id ?? ''}
              onComplete={() => handleAdvanceStep('planejamento_done', 'control_module_planejamento_done', 2, 1)}
            />
          )}
          {currentStep === 2 && (
            <StepFluxo
              userId={user?.id ?? ''}
              onComplete={() => handleAdvanceStep('fluxo_done', 'control_module_fluxo_done', 3, 2)}
            />
          )}
          {currentStep === 3 && (
            <StepCartao
              userId={user?.id ?? ''}
              onComplete={() => handleAdvanceStep('cartao_done', 'control_module_cartao_done', 4, 3)}
            />
          )}
          {currentStep === 4 && (
            <StepMetas
              userId={user?.id ?? ''}
              onComplete={() => handleAdvanceStep('metas_done', 'control_module_metas_done', 5, 4)}
            />
          )}
          {currentStep === 5 && (
            <StepPatrimonio
              userId={user?.id ?? ''}
              onComplete={() => handleAdvanceStep('patrimonio_done', 'control_module_patrimonio_done', 6, 5)}
            />
          )}
          {currentStep === 6 && (
            <StepGrandFinale
              userId={user?.id ?? ''}
              onComplete={handleComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
};
