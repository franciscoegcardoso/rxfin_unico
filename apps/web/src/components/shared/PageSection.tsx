import React from 'react';
import { cn } from '@/lib/utils';

interface PageSectionProps {
  children: React.ReactNode;
  className?: string;
  /** Optional section title */
  title?: string;
  /** Optional description below title */
  description?: string;
  /** Right-side actions */
  actions?: React.ReactNode;
}

/**
 * Consistent section wrapper for page content blocks.
 * Use this to group related content with proper spacing.
 */
export const PageSection: React.FC<PageSectionProps> = ({
  children,
  className,
  title,
  description,
  actions,
}) => {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4">
          {title && (
            <div>
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          )}
          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
};
