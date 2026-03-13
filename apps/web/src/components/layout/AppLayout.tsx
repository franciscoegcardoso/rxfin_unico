import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
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
import { useDemoMode } from '@/hooks/useDemoMode';
import { useShell } from '@/design-system/layouts/ShellContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { insideShell } = useShell();
  const { isDemoMode } = useDemoMode();
  const { needsPhone, currentEmail } = usePhoneCompletion();
  const [phoneCompleted, setPhoneCompleted] = useState(false);
  useAutoConsolidation();

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
      <>
        <div className="w-full max-w-full overflow-x-hidden flex flex-col flex-1 min-h-0">
          {isDemoMode && <DemoDataBanner inline />}
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
        <PhoneCompletionDialog
          open={showPhoneDialog}
          onComplete={() => setPhoneCompleted(true)}
          currentEmail={currentEmail}
        />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background w-full max-w-full overflow-x-hidden flex flex-col">
        <DemoDataBanner />
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
          <footer className="w-full border-t border-border py-2 px-6 flex justify-center bg-background">
            <SecureConnectionBadge />
          </footer>
        )}
        {isMobile && <MobileBottomNav />}
        <PhoneCompletionDialog
          open={showPhoneDialog}
          onComplete={() => setPhoneCompleted(true)}
          currentEmail={currentEmail}
        />
      </div>
    </>
  );
};
