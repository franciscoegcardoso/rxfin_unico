import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonPlanejamentoProps {
  className?: string;
}

/**
 * Skeleton que imita o layout de PlanejamentoAnual.tsx.
 * Grid 12 meses + lista de goal cards.
 */
export const SkeletonPlanejamento: React.FC<SkeletonPlanejamentoProps> = ({ className }) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Grid 12 meses */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>

      {/* Lista de 3 goal cards */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse mb-2" />
        ))}
      </div>
    </div>
  );
};
