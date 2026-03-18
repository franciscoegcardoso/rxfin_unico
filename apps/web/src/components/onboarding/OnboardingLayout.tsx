import React from 'react';
import logoRxfinWhite from '@/assets/logo-rxfin-white.png';
import { ThemedLogo } from '@/components/ui/themed-logo';
import { OnboardingProfileMenu } from './OnboardingProfileMenu';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  variant?: 'hero' | 'form';
}

/**
 * Unified layout for onboarding screens
 * - Hero variant: gradient background with white logo (welcome screen)
 * - Form variant: light background with small logo in header
 */
export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({ 
  children, 
  variant = 'form' 
}) => {
  if (variant === 'hero') {
    return (
      <div className="min-h-screen gradient-hero flex flex-col relative">
        {/* Profile menu for account switching */}
        <OnboardingProfileMenu variant="dark" />
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Profile menu for account switching */}
      <OnboardingProfileMenu variant="light" />
      
      {/* Subtle header with logo */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center">
          <ThemedLogo className="h-8 w-8 object-contain" />
          <span className="ml-2 text-sm font-semibold text-primary">RXFin</span>
        </div>
      </header>
      
      {/* Content */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
};
/**
 * Logo component for onboarding - exports the white version
 */
export const OnboardingWhiteLogo: React.FC<{ className?: string }> = ({ className }) => (
  (() => {
    const cn = className || "h-16 w-16 object-contain";
    const extractTailwindSize = (prefix: 'h' | 'w'): number | undefined => {
      const match = cn.match(new RegExp(`\\b${prefix}-(\\d+)\\b`));
      return match ? Number(match[1]) * 4 : undefined;
    };

    const h = extractTailwindSize('h');
    const w = extractTailwindSize('w');
    const width = w ?? h ?? 64;
    const height = h ?? w ?? 64;

    return (
      <img
        src={logoRxfinWhite}
        alt="RXFin"
        className={cn}
        width={width}
        height={height}
      />
    );
  })()
);
