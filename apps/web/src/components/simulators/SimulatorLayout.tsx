import React from 'react';
import { cn } from '@/lib/utils';
import { PageBreadcrumb } from '@/components/navigation/PageBreadcrumb';

interface SimulatorLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  /** Override inner container width (default: max-w-3xl). Use for wide charts, e.g. max-w-[min(100%,1400px)]. */
  innerClassName?: string;
}

/**
 * Base layout for simulator pages: light background, header, content area.
 */
export function SimulatorLayout({ title, subtitle, children, className, innerClassName }: SimulatorLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-background w-full max-w-full overflow-x-hidden', className)}>
      <div className={cn('max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-10', innerClassName)}>
        <PageBreadcrumb />
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
