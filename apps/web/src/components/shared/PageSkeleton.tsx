import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PageSkeletonProps {
  /** Layout variant */
  variant?: 'metrics-table' | 'cards-grid' | 'list' | 'dashboard';
  /** Number of metric cards (for metrics-table, dashboard) */
  metrics?: number;
  /** Number of list/card items */
  items?: number;
  /** Additional className */
  className?: string;
}

/** Reusable skeleton for a row of metric cards — exported as CardSkeleton grid */
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-2 w-16" />
        </CardContent>
      </Card>
    ))}
  </div>
);

/** Reusable skeleton for a row of metric cards (KPI grid — 2 cols mobile, 4 cols desktop) */
const MetricsSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <div className="kpi-grid">
    {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
      <div
        key={i}
        className="rounded-[var(--radius)] border border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] p-4 space-y-3"
      >
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-7 rounded-[7px]" />
        </div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
    ))}
  </div>
);

/** Skeleton for a table (same geometry as Lancamentos table) — exported for reuse */
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 6 }) => (
  <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] overflow-hidden">
    <div className="bg-[hsl(var(--color-surface-sunken))] h-10 border-b border-[hsl(var(--color-border-default))]" />
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="flex gap-4 px-4 py-3 border-b border-[hsl(var(--color-border-subtle))] last:border-0"
      >
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    ))}
  </div>
);

/** Skeleton for card grid layout */
const CardsGridSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

/** Skeleton for chart placeholder — exported for reuse */
export const ChartSkeleton: React.FC<{ className?: string; height?: number }> = ({ className, height = 280 }) => (
  <Card className={className}>
    <CardContent className="p-4 space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </CardContent>
  </Card>
);

/** Skeleton for list layout */
const ListSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <Card>
    <CardHeader className="pb-3">
      <Skeleton className="h-5 w-48" />
    </CardHeader>
    <CardContent className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </CardContent>
  </Card>
);

/**
 * Reusable page-level loading skeleton.
 * Matches the visual structure of the target page layout.
 */
export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  variant = 'dashboard',
  metrics = 4,
  items = 4,
  className,
}) => {
  return (
    <div className={cn("space-y-6 animate-in fade-in duration-300", className)}>
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>

      {variant === 'metrics-table' && (
        <>
          <MetricsSkeleton count={metrics} />
          <TableSkeleton />
        </>
      )}

      {variant === 'cards-grid' && (
        <>
          <MetricsSkeleton count={metrics} />
          <CardsGridSkeleton count={items} />
        </>
      )}

      {variant === 'list' && (
        <ListSkeleton count={items} />
      )}

      {variant === 'dashboard' && (
        <>
          <MetricsSkeleton count={metrics} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-40 w-full rounded-lg" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-40 w-full rounded-lg" />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Inline section skeleton for components inside pages.
 */
export const SectionSkeleton: React.FC<{ rows?: number; className?: string }> = ({ rows = 3, className }) => (
  <Card className={className}>
    <CardHeader className="pb-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-36" />
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </CardContent>
  </Card>
);

/**
 * Error state for failed data loads.
 */
export const PageErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message = 'Erro ao carregar dados. Tente novamente.',
  onRetry,
}) => (
  <Card className="border-destructive/30">
    <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
        <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <p className="text-sm text-muted-foreground text-center">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-primary hover:underline font-medium"
        >
          Tentar novamente
        </button>
      )}
    </CardContent>
  </Card>
);
