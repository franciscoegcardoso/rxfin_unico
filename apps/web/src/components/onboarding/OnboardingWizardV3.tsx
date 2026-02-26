import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemedLogo } from '@/components/ui/themed-logo';
import { JourneyMap } from './JourneyMap';
import { LevelBadge } from './LevelBadge';
import { BlockA } from './blocks/BlockA';
import { useOnboardingCheckpoint } from '@/hooks/useOnboardingCheckpoint';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';

const TOTAL_STEPS_BLOCK_A = 4; // welcome, income, expenses, marco

export const OnboardingWizardV3: React.FC = () => {
  const navigate = useNavigate();
  const { currentLevel, currentPhase, advancePhase, registerEvent } = useOnboardingCheckpoint();
  const { saveDraft } = useOnboardingDraft();

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
    // After block A, go back to dashboard (demo still active until block_b_done)
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
            totalStepsInBlock={TOTAL_STEPS_BLOCK_A}
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
          totalStepsInBlock={TOTAL_STEPS_BLOCK_A}
        />
      </div>

      {/* Content */}
      <main className="flex-1 px-4 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <BlockA
              step={step}
              onStepChange={handleStepChange}
              onComplete={handleBlockAComplete}
              onSaveDraft={saveDraft}
            />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
