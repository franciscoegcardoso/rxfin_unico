import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageTransition } from './PageTransition';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAutoConsolidation } from '@/hooks/useAutoConsolidation';
import { usePhoneCompletion } from '@/hooks/usePhoneCompletion';
import { PhoneCompletionDialog } from '@/components/auth/PhoneCompletionDialog';
import { DemoDataBanner, DEMO_BANNER_EXPANDED_MIN_HEIGHT_PX } from '@/components/shared/DemoDataBanner';
import { DemoModeWelcomeModal } from '@/components/DemoModeWelcomeModal';
import { OnboardingTransitionModal } from '@/components/OnboardingTransitionModal';
import { StartRaioXContext } from '@/contexts/StartRaioXContext';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useStartRaioX } from '@/hooks/useStartRaioX';
import { useShell } from '@/design-system/layouts/ShellContext';

const DEMO_WELCOME_KEY = 'rxfin_demo_welcome_shown';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { insideShell } = useShell();
  const { isDemoMode, isLoading: isDemoModeLoading } = useDemoMode();
  const { needsPhone, currentEmail } = usePhoneCompletion();
  const [phoneCompleted, setPhoneCompleted] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const startRaioX = useStartRaioX({
    onShowTransitionModal: () => setShowTransitionModal(true),
  });
  const { handleStartRaioX, raioxPath } = startRaioX;
  useAutoConsolidation();

  const handleConfirmTransition = useCallback(() => {
    setShowTransitionModal(false);
    navigate(raioxPath);
  }, [navigate, raioxPath]);

  useEffect(() => {
    if (isDemoModeLoading || !isDemoMode) return;
    try {
      if (sessionStorage.getItem(DEMO_WELCOME_KEY)) return;
    } catch {}
    const t = setTimeout(() => setShowWelcomeModal(true), 800);
    return () => clearTimeout(t);
  }, [isDemoMode, isDemoModeLoading]);

  const handleModalDismiss = () => {
    try {
      sessionStorage.setItem(DEMO_WELCOME_KEY, 'true');
    } catch {}
    setShowWelcomeModal(false);
    setTimeout(() => setShowSpotlight(true), 500);
  };

  const handleSpotlightDismiss = () => setShowSpotlight(false);

  useEffect(() => {
    if (!showSpotlight) return;
    const t = setTimeout(() => setShowSpotlight(false), 8000);
    return () => clearTimeout(t);
  }, [showSpotlight]);

  const showPhoneDialog = needsPhone && !phoneCompleted;

  const spotlightTooltip = isDemoMode && showSpotlight && (
    <div
      className="fixed top-[48px] left-0 right-0 z-[9998] flex justify-center pointer-events-none"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex flex-col items-center">
        <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-white drop-shadow-md" />
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl px-5 py-3 max-w-xs border border-gray-100 dark:border-gray-800">
          <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 text-center leading-snug">
            {isMobile
              ? "Aperte em 'COMEÇAR RAIO-X' para iniciar a sua jornada no RXFin!"
              : "Clique em 'COMEÇAR SEU RAIO-X FINANCEIRO' para iniciar a sua jornada no RXFin!"}
          </p>
          <button
            type="button"
            className="mt-2 w-full text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-center"
            onClick={handleSpotlightDismiss}
          >
            Entendido ×
          </button>
        </div>
      </div>
    </div>
  );

  const errorFallback = (retry: () => void) => (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
      <div className="w-12 h-12 rounded-full bg-[hsl(var(--color-expense)/0.1)] flex items-center justify-center">
        <span className="text-[hsl(var(--color-expense))] text-xl font-bold">!</span>
      </div>
      <p className="text-[15px] font-semibold text-[hsl(var(--color-text-primary))]">Algo deu errado</p>
      <p className="text-[13px] text-[hsl(var(--color-text-secondary))] text-center max-w-[280px]">Recarregue a página para tentar novamente.</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={retry}
          className="text-[13px] font-medium text-[hsl(var(--color-brand-700))] hover:underline"
        >
          Tentar novamente
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-[13px] font-medium text-[hsl(var(--color-brand-700))] hover:underline"
        >
          Recarregar
        </button>
      </div>
    </div>
  );

  const content = (
    <ErrorBoundary resetKey={location.pathname} fallback={errorFallback}>
      <div className="w-full max-w-full">
        <PageTransition>
          {children}
        </PageTransition>
      </div>
    </ErrorBoundary>
  );

  if (insideShell) {
    // Dentro do AppShell: banner de dados fictícios no topo da área de conteúdo (inline), deslocando o conteúdo para baixo pela altura exata do banner.
    return (
      <StartRaioXContext.Provider value={startRaioX}>
        <div className="w-full max-w-full overflow-x-hidden flex flex-col flex-1 min-h-0">
          {isDemoMode && <DemoDataBanner inline innerRef={bannerRef} />}
          <main
            className={`
              w-full max-w-full overflow-x-hidden flex-1 min-w-0
              px-4 md:px-6 lg:px-8
              pb-4 md:pb-6
              pt-0
            `}
          >
            {content}
          </main>
        </div>
        {isDemoMode && (
          <DemoModeWelcomeModal
            open={showWelcomeModal}
            onOpenChange={setShowWelcomeModal}
            onStartRaioX={() => handleStartRaioX('welcome_modal')}
            onDismiss={handleModalDismiss}
          />
        )}
        {spotlightTooltip}
        <OnboardingTransitionModal
          isOpen={showTransitionModal}
          onConfirm={handleConfirmTransition}
          onClose={() => setShowTransitionModal(false)}
        />
        <PhoneCompletionDialog
          open={showPhoneDialog}
          onComplete={() => setPhoneCompleted(true)}
          currentEmail={currentEmail}
        />
      </StartRaioXContext.Provider>
    );
  }

  return (
    <StartRaioXContext.Provider value={startRaioX}>
      <div className="min-h-screen bg-[hsl(var(--color-surface-base))] w-full max-w-full overflow-x-hidden flex flex-col">
        <DemoDataBanner innerRef={bannerRef} />
        <main
          className={cn(
            'w-full max-w-full overflow-x-hidden flex-1',
            'px-4 md:px-6 lg:px-8 pb-6',
            isMobile && 'pb-[max(5rem,calc(4rem+env(safe-area-inset-bottom)))]',
          )}
          style={{ paddingTop: isDemoMode ? `${DEMO_BANNER_EXPANDED_MIN_HEIGHT_PX}px` : '0px' }}
        >
          {content}
        </main>
        {isMobile && <MobileBottomNav />}
        {isDemoMode && (
          <DemoModeWelcomeModal
            open={showWelcomeModal}
            onOpenChange={setShowWelcomeModal}
            onStartRaioX={() => handleStartRaioX('welcome_modal')}
            onDismiss={handleModalDismiss}
          />
        )}
        {spotlightTooltip}
        <OnboardingTransitionModal
          isOpen={showTransitionModal}
          onConfirm={handleConfirmTransition}
          onClose={() => setShowTransitionModal(false)}
        />
        <PhoneCompletionDialog
          open={showPhoneDialog}
          onComplete={() => setPhoneCompleted(true)}
          currentEmail={currentEmail}
        />
      </div>
    </StartRaioXContext.Provider>
  );
};
