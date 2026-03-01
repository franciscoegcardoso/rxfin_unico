import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ResultCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}

/**
 * Card for simulator result: icon, label, large value (e.g. "Sua hora vale R$ XX,XX").
 */
export function ResultCard({
  icon,
  label,
  value,
  className,
  valueClassName = 'text-3xl font-bold text-green-700 dark:text-green-400',
}: ResultCardProps) {
  return (
    <Card className={cn('bg-white dark:bg-card shadow-lg rounded-2xl border-2 border-green-200 dark:border-green-800', className)}>
      <CardContent className="p-6">
        {icon && <div className="mb-3 flex justify-center">{icon}</div>}
        <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
        <p className={cn(valueClassName)}>{value}</p>
      </CardContent>
    </Card>
  );
}
