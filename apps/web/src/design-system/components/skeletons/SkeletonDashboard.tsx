import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface SkeletonDashboardProps {
  className?: string;
}

/**
 * Skeleton que imita o layout do Inicio.tsx (Dashboard).
 * KPI grid, bloco de saldo, lista de transações, gráfico.
 */
export const SkeletonDashboard: React.FC<SkeletonDashboardProps> = ({ className }) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* KPI grid — mesma geometria dos cards finais */}
      <div className="kpi-grid">
        {[1, 2, 3, 4].map((i) => (
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

      {/* Bloco de saldo */}
      <div className="h-32 rounded-[var(--radius)] border border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] overflow-hidden">
        <Skeleton className="h-full w-full" />
      </div>

      {/* Lista de 5 transações recentes */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 rounded-[var(--radius)] border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))]">
            <Skeleton className="h-full w-full rounded-[var(--radius)]" />
          </div>
        ))}
      </div>

      {/* Bloco de gráfico */}
      <div className="h-48 rounded-[var(--radius-lg)] border border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))]">
        <Skeleton className="h-full w-full rounded-[var(--radius-lg)]" />
      </div>
    </div>
  );
};
