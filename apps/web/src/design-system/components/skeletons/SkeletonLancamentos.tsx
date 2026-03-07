import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface SkeletonLancamentosProps {
  className?: string;
}

/**
 * Skeleton que imita o layout de Lancamentos.tsx.
 * Chips de filtro + tabela (mesma geometria do container de lançamentos).
 */
export const SkeletonLancamentos: React.FC<SkeletonLancamentosProps> = ({ className }) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Chips de filtro — scroll horizontal em mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />
        ))}
      </div>

      {/* Tabela skeleton — mesma geometria do container final */}
      <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] overflow-hidden">
        <div className="bg-[hsl(var(--color-surface-sunken))] h-10 border-b border-[hsl(var(--color-border-default))]" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
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
    </div>
  );
};
