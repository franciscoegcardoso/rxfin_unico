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
import { SecureConnectionBadge } from '@/components/shared/SecureConnectionBadge';
import { DemoDataBanner } from '@/components/shared/DemoDataBanner';
import { OnboardingProgressBanner } from '@/components/shared/OnboardingProgressBanner';
import { DemoModeWelcomeModal } from '@/components/DemoModeWelcomeModal';
import { OnboardingSpotlight } from '@/components/OnboardingSpotlight';
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

  const showPhoneDialog = needsPhone && !phoneCompleted;

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
          <OnboardingProgressBanner inline />
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
        {isDemoMode && showSpotlight && (
          <OnboardingSpotlight
            targetRef={bannerRef}
            onDismiss={handleSpotlightDismiss}
            isMobile={isMobile}
          />
        )}
        <OnboardingTransitionModal
          isOpen={showTransitionModal}
          onConfirm={handleConfirmTransition}
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
        <OnboardingProgressBanner />
        <main
          className={cn(
            'w-full max-w-full overflow-x-hidden flex-1',
            'px-4 md:px-6 lg:px-8 pb-6',
            isMobile && 'pb-[max(5rem,calc(4rem+env(safe-area-inset-bottom)))]',
          )}
        >
          {content}
        </main>
        {!isMobile && (
          <footer className="w-full border-t border-[hsl(var(--color-border))] py-2 px-6 flex justify-center bg-[hsl(var(--color-surface-base))]">
            <SecureConnectionBadge />
          </footer>
        )}
        {isMobile && <MobileBottomNav />}
        {isDemoMode && (
          <DemoModeWelcomeModal
            open={showWelcomeModal}
            onOpenChange={setShowWelcomeModal}
            onStartRaioX={() => handleStartRaioX('welcome_modal')}
            onDismiss={handleModalDismiss}
          />
        )}
        {isDemoMode && showSpotlight && (
          <OnboardingSpotlight
            targetRef={bannerRef}
            onDismiss={handleSpotlightDismiss}
            isMobile={isMobile}
          />
        )}
        <OnboardingTransitionModal
          isOpen={showTransitionModal}
          onConfirm={handleConfirmTransition}
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
