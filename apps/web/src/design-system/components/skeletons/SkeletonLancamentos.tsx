import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonLancamentosProps {
  className?: string;
}

/**
 * Skeleton que imita o layout de Lancamentos.tsx.
 * Chips de filtro + lista agrupada por data.
 */
export const SkeletonLancamentos: React.FC<SkeletonLancamentosProps> = ({ className }) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Chips de filtro — 5 blocos em row */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-muted animate-pulse" />
        ))}
      </div>

      {/* Lista agrupada: 4 grupos, cada um com header + 2 cards */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((group) => (
          <div key={group}>
            <div className="h-4 w-32 bg-muted animate-pulse rounded mb-2" />
            <div className="space-y-2">
              <div className="h-16 rounded-xl bg-muted animate-pulse mb-2" />
              <div className="h-16 rounded-xl bg-muted animate-pulse mb-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
