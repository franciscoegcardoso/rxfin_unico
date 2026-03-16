import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemedLogo } from '@/components/ui/themed-logo';
import { JourneyMap, getActiveLevelSubtitle } from './JourneyMap';
import { LevelBadge } from './LevelBadge';
import { BlockA } from './blocks/BlockA';
import { BlockB } from './blocks/BlockB';
import { BlockC } from './blocks/BlockC';
import { BlockD } from './blocks/BlockD';
import { OnboardingTransition } from './OnboardingTransition';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { useOnboardingCheckpoint } from '@/hooks/useOnboardingCheckpoint';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { useOnboardingSnapshot } from '@/hooks/useOnboardingSnapshot';
import { useAuth } from '@/contexts/AuthContext';
import { markOnboardingComplete } from '@/services/onboardingPersistence';
import { toast } from 'sonner';

const BLOCK_STEPS = { A: 6, B: 5, C: 5, D: 4 } as const;

type ActiveBlock = 'A' | 'B' | 'C' | 'D';

function getActiveBlock(phase: string): ActiveBlock {
  switch (phase) {
    case 'block_c_done': return 'D';
    case 'block_b_done': return 'C';
    case 'block_a_done': return 'B';
    default: return 'A';
  }
}

export const OnboardingWizardV3: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentLevel, currentPhase, advancePhase, registerEvent, isLoading } = useOnboardingCheckpoint();
  const { saveDraft, getDraft, clearDraft } = useOnboardingDraft();
  const { data: snapshot } = useOnboardingSnapshot();

  const activeBlock = useMemo(() => getActiveBlock(currentPhase), [currentPhase]);
  const totalSteps = BLOCK_STEPS[activeBlock];

  const [step, setStep] = useState(0);
  const [draftRestored, setDraftRestored] = useState(false);
  const [transition, setTransition] = useState<'block_a' | 'block_b' | 'block_c' | null>(null);
  const pendingTransitionRef = useRef<'block_a' | 'block_b' | 'block_c' | null>(null);

  // Marcar fase 'started' ao abrir o wizard com not_started (evita falha ao avançar para block_a_done)
  useEffect(() => {
    if (!isLoading && currentPhase === 'not_started' && user?.id) {
      advancePhase('started');
    }
  }, [currentPhase, isLoading, user?.id, advancePhase]);

  // Guard: usuário já completou o Raio-X — evita reabrir o wizard ao acessar /onboarding-raio-x diretamente
  useEffect(() => {
    if (currentPhase === 'completed') {
      navigate('/inicio', { replace: true });
    }
  }, [currentPhase, navigate]);

  // Restore draft on mount (step)
  useEffect(() => {
    if (draftRestored) return;
    getDraft().then((draft) => {
      if (draft && draft.currentBlock === activeBlock && draft.currentStep > 0) {
        setStep(draft.currentStep);
      }
      setDraftRestored(true);
    });
  }, [activeBlock, draftRestored, getDraft]);

  // Auto-save step changes to draft
  useEffect(() => {
    if (draftRestored && step > 0) {
      saveDraft('_nav', { currentBlock: activeBlock, currentStep: step });
    }
  }, [step, activeBlock, draftRestored, saveDraft]);

  const handleStepChange = useCallback((newStep: number) => {
    setStep(newStep);
  }, []);

  const handleContinueLater = () => {
    navigate('/inicio');
  };

  const handleBlockAComplete = async () => {
    if (!user?.id) {
      toast.error('Sessão inválida. Faça login novamente.');
      return;
    }
    pendingTransitionRef.current = 'block_a';
    setTransition('block_a');
  };

  const handleBlockBComplete = async () => {
    if (!user?.id) {
      toast.error('Sessão inválida. Faça login novamente.');
      return;
    }
    pendingTransitionRef.current = 'block_b';
    setTransition('block_b');
  };

  const handleBlockCComplete = async () => {
    if (!user?.id) {
      toast.error('Sessão inválida. Faça login novamente.');
      return;
    }
    pendingTransitionRef.current = 'block_c';
    setTransition('block_c');
  };

  const handleTransitionDone = useCallback(async () => {
    const phase = pendingTransitionRef.current;
    if (!phase || !user?.id) return;

    // Limpar imediatamente para evitar double-call
    pendingTransitionRef.current = null;
    setTransition(null);

    const phaseMap = {
      block_a: 'block_a_done',
      block_b: 'block_b_done',
      block_c: 'block_c_done',
    } as const;

    const eventMap = {
      block_a: 'block_a_completed',
      block_b: 'block_b_completed',
      block_c: 'block_c_completed',
    };

    // Garantir 'started' antes do primeiro avanço
    if (currentPhase === 'not_started') {
      await advancePhase('started');
    }

    const ok = await advancePhase(phaseMap[phase]);
    if (!ok) {
      console.error('[OnboardingTransition] advancePhase falhou para:', phaseMap[phase], '| currentPhase:', currentPhase);
      // Não travar o usuário — avançar step mesmo assim
    }

    await registerEvent(eventMap[phase]);
    setStep(0);
  }, [user?.id, currentPhase, advancePhase, registerEvent]);

  const handleBlockDComplete = async () => {
    if (!user?.id) {
      toast.error('Sessão inválida. Faça login novamente.');
      return;
    }
    const ok = await advancePhase('completed');
    if (!ok) return;
    await registerEvent('block_d_completed');
    // Sincroniza profiles.onboarding_completed = true para o ProtectedRoute usar como cache
    await markOnboardingComplete(user.id);
    // Seta o cache local para evitar query extra no próximo acesso a /inicio
    localStorage.setItem('rxfin-onboarding-done', 'true');
    await clearDraft();
    toast.success('🎉 Parabéns! Seu Raio-X está completo!');
    navigate('/inicio');
  };

  if (currentPhase === 'completed') return null; // redirect em andamento (evita flash do wizard)

  // Evita flash de tela branca enquanto o draft não foi restaurado
  if (!draftRestored) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <RXFinLoadingSpinner size={64} />
        <p className="text-sm text-muted-foreground animate-pulse">
          Retomando sua jornada...
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <RXFinLoadingSpinner size={64} />
        <p className="text-sm text-muted-foreground animate-pulse">
          Carregando sua jornada...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Tela de transição entre blocos — sobrepõe tudo */}
      <AnimatePresence>
        {transition && (
          <OnboardingTransition
            completedPhase={transition}
            onDone={handleTransitionDone}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/50 px-4 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ThemedLogo className="h-7 w-7 object-contain" />
            <span className="text-sm font-semibold text-primary">RXFin</span>
          </div>
          <LevelBadge
            currentLevel={currentLevel}
            currentStepInBlock={step}
            totalStepsInBlock={totalSteps}
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={handleContinueLater}
          >
            <X className="h-4 w-4 mr-1" />
            Continuar depois
          </Button>
        </div>
      </header>

      {/* Journey Map — horizontal stepper */}
      <div className="max-w-4xl mx-auto w-full px-4">
        <JourneyMap
          currentLevel={currentLevel}
          currentStepInBlock={step}
          totalStepsInBlock={totalSteps}
        />
        {(() => {
          const subtitle = getActiveLevelSubtitle(currentLevel);
          return subtitle ? (
            <p className="text-xs text-muted-foreground text-center mb-4">
              {subtitle}
            </p>
          ) : null;
        })()}
      </div>

      {/* Content */}
      <main className="flex-1 px-4 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeBlock}-${step}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {activeBlock === 'A' && (
              <BlockA
                step={step}
                onStepChange={handleStepChange}
                onComplete={handleBlockAComplete}
                onSaveDraft={saveDraft}
              />
            )}
            {activeBlock === 'B' && (
              <BlockB
                step={step}
                onStepChange={handleStepChange}
                onComplete={handleBlockBComplete}
                onSaveDraft={saveDraft}
                snapshot={snapshot}
              />
            )}
            {activeBlock === 'C' && (
              <BlockC
                step={step}
                onStepChange={handleStepChange}
                onComplete={handleBlockCComplete}
                onSaveDraft={saveDraft}
              />
            )}
            {activeBlock === 'D' && (
              <BlockD
                step={step}
                onStepChange={handleStepChange}
                onComplete={handleBlockDComplete}
                onSaveDraft={saveDraft}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
