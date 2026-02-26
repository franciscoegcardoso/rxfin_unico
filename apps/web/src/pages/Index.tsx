import React from 'react';
import { Navigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { NubankHome } from '@/components/mobile/NubankHome';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';

const Index: React.FC = () => {
  const isMobile = useIsMobile();
  const { targetRoute, isLoading } = useAuthRedirect();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RXFinLoadingSpinner size={56} />
      </div>
    );
  }

  // Mobile: show Nubank-style home page (demo banner renders inside AppLayout)
  if (isMobile) {
    return <NubankHome />;
  }

  // Desktop: redirect to dashboard (demo mode handled by AppLayout banner)
  return <Navigate to={targetRoute} replace />;
};

export default Index;
