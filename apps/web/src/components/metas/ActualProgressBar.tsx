import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Target } from 'lucide-react';

interface ActualProgressBarProps {
  actual: number;
  goal: number;
  type: 'income' | 'expense';
  showLabel?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function ActualProgressBar({
  actual,
  goal,
  type,
  showLabel = true,
  showIcon = true,
  className,
}: ActualProgressBarProps) {
  if (goal === 0) return null;
  
  const percentage = Math.min(100, (actual / goal) * 100);
  const exceeds = actual > goal;
  
  // For income: exceeding goal is good
  // For expense: exceeding goal is bad
  const isGood = type === 'income' 
    ? percentage >= 100 
    : percentage <= 100;
  
  const getStatus = () => {
    if (type === 'income') {
      if (percentage >= 100) return { icon: CheckCircle2, color: 'text-income', label: 'Meta atingida' };
      if (percentage >= 80) return { icon: Target, color: 'text-amber-500', label: 'Em progresso' };
      return { icon: AlertCircle, color: 'text-muted-foreground', label: 'Abaixo da meta' };
    } else {
      if (percentage > 100) return { icon: AlertCircle, color: 'text-expense', label: 'Acima da meta' };
      if (percentage >= 90) return { icon: Target, color: 'text-amber-500', label: 'Próximo do limite' };
      return { icon: CheckCircle2, color: 'text-income', label: 'Dentro da meta' };
    }
  };
  
  const status = getStatus();
  const StatusIcon = status.icon;
  
  // Progress bar color based on type and performance
  const getProgressColor = () => {
    if (type === 'income') {
      return percentage >= 100 ? 'bg-income' : 'bg-amber-500';
    } else {
      if (percentage > 100) return 'bg-expense';
      if (percentage >= 90) return 'bg-amber-500';
      return 'bg-income';
    }
  };
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon && (
        <StatusIcon className={cn("h-3.5 w-3.5 flex-shrink-0", status.color)} />
      )}
      <div className="flex-1 min-w-0">
        <div className="relative">
          <Progress 
            value={Math.min(percentage, 100)} 
            className="h-1.5"
          />
          {/* Overlay for the actual progress color */}
          <div 
            className={cn(
              "absolute top-0 left-0 h-1.5 rounded-full transition-all",
              getProgressColor()
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
      {showLabel && (
        <span className={cn("text-[10px] font-medium whitespace-nowrap", status.color)}>
          {percentage.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
