import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonDashboardProps {
  className?: string;
}

/**
 * Skeleton que imita o layout do Inicio.tsx (Dashboard).
 * Bloco de saldo, grid de quick actions, lista de transações, gráfico.
 */
export const SkeletonDashboard: React.FC<SkeletonDashboardProps> = ({ className }) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Bloco de saldo */}
      <div className="h-32 rounded-xl bg-muted animate-pulse" />

      {/* Grid 2x2 quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>

      {/* Lista de 5 transações recentes */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse mb-2" />
        ))}
      </div>

      {/* Bloco de gráfico */}
      <div className="h-48 rounded-xl bg-muted animate-pulse" />
    </div>
  );
};
