import React from 'react';
import { cn } from '@/lib/utils';
import { BackLink } from './BackLink';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  backTo?: string;
  backLabel?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  children,
  icon,
  className,
  backTo,
  backLabel,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      {backTo && backLabel && (
        <BackLink to={backTo} label={backLabel} />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="h-10 w-10 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center shrink-0 text-primary">
              {icon}
            </div>
          )}
          <div className="min-w-0 space-y-0.5">
            <h1 className="text-2xl font-bold text-foreground tracking-[-0.02em] truncate">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {children && (
          <div className="flex items-center gap-2 shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
