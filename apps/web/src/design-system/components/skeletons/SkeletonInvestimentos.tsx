import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonInvestimentosProps {
  className?: string;
}

/**
 * Skeleton que imita o layout da tela de investimentos (Bens e Investimentos).
 * Rentabilidade total, donut, lista de investment cards.
 */
export const SkeletonInvestimentos: React.FC<SkeletonInvestimentosProps> = ({ className }) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Bloco rentabilidade total */}
      <div className="h-12 w-48 rounded-xl bg-muted animate-pulse" />

      {/* Donut placeholder */}
      <div className="h-48 w-48 rounded-full bg-muted animate-pulse mx-auto" />

      {/* Lista de 4 investment cards */}
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse mb-2" />
        ))}
      </div>
    </div>
  );
};
