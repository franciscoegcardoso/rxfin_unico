import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'border-b border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))] px-4 py-4 md:px-8 md:py-5',
        className
      )}
    >
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="hidden md:flex items-center gap-1 mb-2">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight
                  className="h-3 w-3 text-[hsl(var(--color-text-tertiary))]"
                  aria-hidden
                />
              )}
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  className="text-[11px] text-[hsl(var(--color-text-tertiary))] hover:text-[hsl(var(--color-text-secondary))] transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[11px] text-[hsl(var(--color-text-tertiary))]">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="text-[20px] font-semibold md:text-[22px] text-[hsl(var(--color-text-primary))] tracking-[-0.3px] leading-tight truncate"
            id="page-title"
          >
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-[13px] text-[hsl(var(--color-text-secondary))] line-clamp-1">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
