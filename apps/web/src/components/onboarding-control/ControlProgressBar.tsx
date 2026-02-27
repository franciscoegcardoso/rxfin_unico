import React from 'react';
import { cn } from '@/lib/utils';

interface ControlProgressBarProps {
  completedSteps: number;
  totalSteps: number;
}

export const ControlProgressBar: React.FC<ControlProgressBarProps> = ({ completedSteps, totalSteps }) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Módulos do dia a dia</p>
        <p className="text-xs text-muted-foreground">{completedSteps} de {totalSteps}</p>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full transition-colors duration-300",
              i < completedSteps ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
};
