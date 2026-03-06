import React from 'react';
import { cn } from '@/lib/utils';

interface SimulatorLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Base layout for simulator pages: light background, header, content area.
 */
export function SimulatorLayout({ title, subtitle, children, className }: SimulatorLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-background w-full max-w-full overflow-x-hidden', className)}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-10">
        <header className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight leading-tight px-1">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-1">
              {subtitle}
            </p>
          )}
        </header>
        <div className="space-y-4 sm:space-y-6 min-w-0">{children}</div>
      </div>
    </div>
  );
}
