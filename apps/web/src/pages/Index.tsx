import React from 'react';
import { Onboarding } from '@/components/onboarding/Onboarding';
import { Navigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { NubankHome } from '@/components/mobile/NubankHome';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';

const Index: React.FC = () => {
  const isMobile = useIsMobile();
  const { shouldShowOnboarding, targetRoute, isLoading } = useAuthRedirect();

  // Show loading while checking settings
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RXFinLoadingSpinner size={56} />
      </div>
    );
  }

  // If onboarding is enabled and not completed (checked from DB profiles.onboarding_completed)
  if (shouldShowOnboarding) {
    return <Onboarding />;
  }

  // Mobile: show Nubank-style home page
  if (isMobile) {
    return <NubankHome />;
  }

  // Desktop: redirect to configured target route
  return <Navigate to={targetRoute} replace />;
};

export default Index;
