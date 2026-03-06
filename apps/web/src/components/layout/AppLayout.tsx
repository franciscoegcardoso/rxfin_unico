import React, { useState } from 'react';
import { TopNavbar } from './TopNavbar';
import { PageTransition } from './PageTransition';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { MobileMenuProvider } from '@/contexts/MobileMenuContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAutoConsolidation } from '@/hooks/useAutoConsolidation';
import { usePhoneCompletion } from '@/hooks/usePhoneCompletion';
import { PhoneCompletionDialog } from '@/components/auth/PhoneCompletionDialog';
import { SecureConnectionBadge } from '@/components/shared/SecureConnectionBadge';
import { DemoDataBanner } from '@/components/shared/DemoDataBanner';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useShell } from '@/design-system/layouts/ShellContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const { insideShell } = useShell();
  const { isDemoMode } = useDemoMode();
  const { needsPhone, currentEmail } = usePhoneCompletion();
  const [phoneCompleted, setPhoneCompleted] = useState(false);
  useAutoConsolidation();

  const showPhoneDialog = needsPhone && !phoneCompleted;

  const content = (
    <>
      <DemoDataBanner />
      <div className="w-full mx-auto max-w-[95%] 2xl:max-w-[1800px]">
        <PageTransition>
          {children}
        </PageTransition>
      </div>
    </>
  );

  if (insideShell) {
    return (
      <MobileMenuProvider>
        <div className="w-full max-w-full overflow-x-hidden flex flex-col flex-1 min-h-0">
          <main
            className={`
              w-full max-w-full overflow-x-hidden flex-1
              px-4 md:px-6 lg:px-8
              py-4 md:py-6
              ${isDemoMode ? 'pt-32 md:pt-28' : ''}
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
      </MobileMenuProvider>
    );
  }

  return (
    <MobileMenuProvider>
    <div className="min-h-screen bg-background w-full max-w-full overflow-x-hidden flex flex-col">
      <TopNavbar />
      <main 
        className={`
          w-full max-w-full overflow-x-hidden flex-1 
          ${isDemoMode ? 'pt-32 md:pt-28' : 'pt-16'}
          px-4 md:px-6 lg:px-8 
          py-6
          ${isMobile ? 'pb-20' : ''}
        `}
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
    </MobileMenuProvider>
  );
};
