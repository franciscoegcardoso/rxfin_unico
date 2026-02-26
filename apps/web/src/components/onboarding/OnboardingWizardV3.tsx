import React, { useState, useCallback, useMemo } from 'react';
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
import { useOnboardingCheckpoint } from '@/hooks/useOnboardingCheckpoint';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';

const BLOCK_STEPS = { A: 4, B: 5, C: 5 } as const;

type ActiveBlock = 'A' | 'B' | 'C';

/**
 * Determines which block to show based on onboarding phase.
 */
function getActiveBlock(phase: string): ActiveBlock {
  switch (phase) {
    case 'block_b_done': return 'C';
    case 'block_a_done': return 'B';
    default: return 'A';
  }
}

export const OnboardingWizardV3: React.FC = () => {
  const navigate = useNavigate();
  const { currentLevel, currentPhase, advancePhase, registerEvent } = useOnboardingCheckpoint();
  const { saveDraft } = useOnboardingDraft();

  const activeBlock = useMemo(() => getActiveBlock(currentPhase), [currentPhase]);
  const totalSteps = BLOCK_STEPS[activeBlock];

  const [step, setStep] = useState(0);

  const handleStepChange = useCallback((newStep: number) => {
    setStep(newStep);
  }, []);

  const handleContinueLater = () => {
    navigate('/inicio');
  };

  const handleBlockAComplete = async () => {
    await advancePhase('block_a_done');
    await registerEvent('block_a_completed');
    // Reset step and switch to Block B
    setStep(0);
  };

  const handleBlockBComplete = async () => {
    await advancePhase('block_b_done');
    await registerEvent('block_b_completed');
    setStep(0);
  };

  const handleBlockCComplete = async () => {
    await advancePhase('block_c_done');
    await registerEvent('block_c_completed');
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
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
