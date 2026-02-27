import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemedLogo } from '@/components/ui/themed-logo';
import { JourneyMap } from './JourneyMap';
import { LevelBadge } from './LevelBadge';
import { BlockA } from './blocks/BlockA';
import { BlockB } from './blocks/BlockB';
import { BlockC } from './blocks/BlockC';
import { BlockD } from './blocks/BlockD';
import { useOnboardingCheckpoint } from '@/hooks/useOnboardingCheckpoint';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const BLOCK_STEPS = { A: 4, B: 5, C: 5, D: 4 } as const;

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
  const { currentLevel, currentPhase, advancePhase, registerEvent } = useOnboardingCheckpoint();
  const { saveDraft, getDraft, clearDraft } = useOnboardingDraft();

  const activeBlock = useMemo(() => getActiveBlock(currentPhase), [currentPhase]);
  const totalSteps = BLOCK_STEPS[activeBlock];

  const [step, setStep] = useState(0);
  const [draftRestored, setDraftRestored] = useState(false);

  // Restore draft on mount
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
    const ok = await advancePhase('block_a_done');
    if (!ok) return;
    await registerEvent('block_a_completed');
    setStep(0);
  };

  const handleBlockBComplete = async () => {
    const ok = await advancePhase('block_b_done');
    if (!ok) return;
    await registerEvent('block_b_completed');
    setStep(0);
  };

  const handleBlockCComplete = async () => {
    const ok = await advancePhase('block_c_done');
    if (!ok) return;
    await registerEvent('block_c_completed');
    setStep(0);
  };

  const handleBlockDComplete = async () => {
    const ok = await advancePhase('completed');
    if (!ok) return;
    await registerEvent('block_d_completed');
    await clearDraft();
    toast.success('🎉 Parabéns! Seu Raio-X está completo!');
    navigate('/inicio');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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

      {/* Journey Map */}
      <div className="max-w-4xl mx-auto w-full px-4">
        <JourneyMap
          currentLevel={currentLevel}
          currentStepInBlock={step}
          totalStepsInBlock={totalSteps}
        />
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
