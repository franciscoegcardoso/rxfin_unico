import React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Use narrower max-width for settings/form pages */
  narrow?: boolean;
  /** Use full width with no max constraint */
  fullWidth?: boolean;
}

/**
 * Stripe-style page container with consistent max-width and spacing.
 * Wrap all page content in this component for layout consistency.
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
  narrow = false,
  fullWidth = false,
}) => {
  return (
    <div 
      className={cn(
        "w-full mx-auto space-y-8",
        fullWidth 
          ? "" 
          : narrow 
            ? "max-w-3xl" 
            : "max-w-full xl:max-w-[95%] 2xl:max-w-[1800px]",
        className
      )}
    >
      {children}
    </div>
  );
};
