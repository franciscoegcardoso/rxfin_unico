import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, BookOpen, ArrowRight } from 'lucide-react';

export const ControlOnboardingBanner: React.FC = () => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem('control-banner-dismissed') === 'true'
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('control-banner-dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="relative rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 flex items-center gap-3">
      <BookOpen className="h-5 w-5 text-blue-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          📚 Você ainda não conheceu todos os módulos de controle.
          Complete o onboarding de controle para desbloquear a Projeção de 30 Anos.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 gap-1 border-blue-300 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50"
        onClick={() => navigate('/onboarding-controle')}
      >
        Ir ao onboarding
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
