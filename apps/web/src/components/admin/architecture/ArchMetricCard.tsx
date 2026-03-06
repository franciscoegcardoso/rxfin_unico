import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface ArchMetricCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  sublabel?: string;
  className?: string;
  valueClassName?: string;
}

export function ArchMetricCard({
  icon: Icon,
  value,
  label,
  sublabel,
  className,
  valueClassName,
}: ArchMetricCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className={cn('text-xl font-bold tabular-nums', valueClassName)}>{value}</p>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
