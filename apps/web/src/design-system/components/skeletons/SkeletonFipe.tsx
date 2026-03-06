import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonFipeProps {
  className?: string;
}

/**
 * Skeleton que imita o layout do módulo FIPE (busca de veículo).
 * 4 selects em cascata + botão consultar.
 */
export const SkeletonFipe: React.FC<SkeletonFipeProps> = ({ className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      {/* 4 selects em cascata */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-12 rounded-xl bg-muted animate-pulse mb-3" />
      ))}

      {/* Botão consultar */}
      <div className="h-12 rounded-xl bg-muted animate-pulse" />
    </div>
  );
};
