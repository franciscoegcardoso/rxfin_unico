import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface GoalComparisonBadgeProps {
  value: number;
  base: number;
  type: 'income' | 'expense';
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export function GoalComparisonBadge({
  value,
  base,
  type,
  size = 'sm',
  showIcon = false,
  className,
}: GoalComparisonBadgeProps) {
  if (base === 0 || value === 0) return null;
  
  const diff = ((value - base) / base) * 100;
  const absValue = Math.abs(diff);
  
  // For income: higher is better (positive = green)
  // For expense: lower is better (negative = green)
  const isPositive = type === 'income' 
    ? diff >= 0 
    : diff <= 0;
  
  if (absValue < 0.5) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-muted-foreground border-muted-foreground/30",
          size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs',
          className
        )}
      >
        {showIcon && <Minus className="h-2.5 w-2.5 mr-0.5" />}
        0%
      </Badge>
    );
  }
  
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        isPositive 
          ? "text-income border-income/30" 
          : "text-expense border-expense/30",
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs',
        className
      )}
    >
      {showIcon && <Icon className="h-2.5 w-2.5 mr-0.5" />}
      {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
    </Badge>
  );
}
