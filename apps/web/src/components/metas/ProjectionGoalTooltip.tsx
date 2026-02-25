import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TrendingUp, Target, CheckCircle2, DollarSign } from 'lucide-react';

interface ProjectionGoalTooltipProps {
  children: React.ReactNode;
  projected: number;
  goal: number;
  actual?: number;
  type: 'income' | 'expense';
  formatCurrency: (value: number) => string;
  hasCustomGoal?: boolean;
}

export function ProjectionGoalTooltip({
  children,
  projected,
  goal,
  actual,
  type,
  formatCurrency,
  hasCustomGoal = false,
}: ProjectionGoalTooltipProps) {
  const goalVsProjected = projected > 0 
    ? ((goal - projected) / projected) * 100 
    : 0;
  
  const actualVsGoal = actual !== undefined && goal > 0 
    ? ((actual - goal) / goal) * 100 
    : null;
  
  // Determine if variations are positive based on type
  const isGoalGood = type === 'income' 
    ? goalVsProjected >= 0 
    : goalVsProjected <= 0;
  
  const isActualGood = type === 'income' 
    ? (actualVsGoal !== null && actualVsGoal >= 0)
    : (actualVsGoal !== null && actualVsGoal <= 0);
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        className="max-w-xs p-3"
      >
        <div className="space-y-2">
          {/* Projeção */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs">Projeção:</span>
            </div>
            <span className="text-xs font-medium">{formatCurrency(projected)}</span>
          </div>
          
          {/* Meta */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              <span className="text-xs">
                Meta{hasCustomGoal ? ' (editada)' : ''}:
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium">{formatCurrency(goal)}</span>
              {Math.abs(goalVsProjected) >= 0.5 && (
                <span className={cn(
                  "text-[10px]",
                  isGoalGood ? "text-income" : "text-expense"
                )}>
                  ({goalVsProjected > 0 ? '+' : ''}{goalVsProjected.toFixed(0)}%)
                </span>
              )}
            </div>
          </div>
          
          {/* Realizado (se existir) */}
          {actual !== undefined && actual > 0 && (
            <div className="flex items-center justify-between gap-4 pt-1 border-t">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-xs">Realizado:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium">{formatCurrency(actual)}</span>
                {actualVsGoal !== null && Math.abs(actualVsGoal) >= 0.5 && (
                  <span className={cn(
                    "text-[10px]",
                    isActualGood ? "text-income" : "text-expense"
                  )}>
                    ({actualVsGoal > 0 ? '+' : ''}{actualVsGoal.toFixed(0)}% vs meta)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
