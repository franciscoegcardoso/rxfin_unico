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
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-950', className)}>
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
        <header className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
              {subtitle}
            </p>
          )}
        </header>
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
