import React, { useState } from 'react';
import { TopNavbar } from './TopNavbar';
import { PageTransition } from './PageTransition';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAutoConsolidation } from '@/hooks/useAutoConsolidation';
import { usePhoneCompletion } from '@/hooks/usePhoneCompletion';
import { PhoneCompletionDialog } from '@/components/auth/PhoneCompletionDialog';
import { SecureConnectionBadge } from '@/components/shared/SecureConnectionBadge';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const { needsPhone, currentEmail } = usePhoneCompletion();
  const [phoneCompleted, setPhoneCompleted] = useState(false);
  
  // Run automatic consolidation on first login of the day
  useAutoConsolidation();

  const showPhoneDialog = needsPhone && !phoneCompleted;

  return (
    <div className="min-h-screen bg-background w-full max-w-full overflow-x-hidden flex flex-col">
      <TopNavbar />
      <main 
        className={`
          w-full max-w-full overflow-x-hidden flex-1 
          pt-16 
          px-4 md:px-6 lg:px-8 
          py-6
          ${isMobile ? 'pb-20' : ''}
        `}
      >
        <div className="w-full mx-auto max-w-[95%] 2xl:max-w-[1800px]">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>
      {!isMobile && (
        <footer className="w-full border-t py-2 px-6 flex justify-center">
          <SecureConnectionBadge />
        </footer>
      )}
      {isMobile && <MobileBottomNav />}

      {/* Global phone completion dialog - shows after login if phone is missing */}
      <PhoneCompletionDialog
        open={showPhoneDialog}
        onComplete={() => setPhoneCompleted(true)}
        currentEmail={currentEmail}
      />
    </div>
  );
};
