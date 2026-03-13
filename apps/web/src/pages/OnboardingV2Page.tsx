import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemedLogo } from '@/components/ui/themed-logo';
import { useOnboardingV2 } from '@/hooks/useOnboardingV2';
import { OnboardingProgressBar } from '@/components/onboarding/OnboardingProgressBar';
import { Step0Persona } from '@/components/onboarding/steps/Step0Persona';
import { Step1Identidade } from '@/components/onboarding/steps/Step1Identidade';
import { Step2Conexao } from '@/components/onboarding/steps/Step2Conexao';
import { StepPlaceholder } from '@/components/onboarding/steps/StepPlaceholder';

export default function OnboardingV2Page() {
  const navigate = useNavigate();
  const { currentStep, stepsCompleted, goToStep, isStepAccessible } = useOnboardingV2();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/50 px-4 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ThemedLogo className="h-7 w-7 object-contain" />
            <span className="text-sm font-semibold text-primary">RXFin</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => navigate('/inicio')}
          >
            <X className="h-4 w-4 mr-1" />
            Continuar depois
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full px-4 pt-4">
        <OnboardingProgressBar
          currentStep={currentStep}
          stepsCompleted={stepsCompleted}
          onStepClick={goToStep}
          isStepAccessible={isStepAccessible}
        />
      </div>

      <main className="flex-1 px-4 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {currentStep === 0 && <Step0Persona />}
            {currentStep === 1 && <Step1Identidade onContinue={() => {}} />}
            {currentStep === 2 && <Step2Conexao onContinue={() => {}} />}
            {currentStep === 3 && <StepPlaceholder stepNumber={3} />}
            {currentStep === 4 && <StepPlaceholder stepNumber={4} />}
            {currentStep === 5 && <StepPlaceholder stepNumber={5} />}
            {currentStep === 6 && <StepPlaceholder stepNumber={6} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
