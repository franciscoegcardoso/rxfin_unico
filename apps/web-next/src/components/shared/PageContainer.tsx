import React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
  fullWidth?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
  narrow = false,
  fullWidth = false,
}) => (
  <div
    className={cn(
      'w-full mx-auto space-y-8',
      fullWidth ? '' : narrow ? 'max-w-3xl' : 'max-w-full xl:max-w-[95%] 2xl:max-w-[1800px]',
      className
    )}
  >
    {children}
  </div>
);
