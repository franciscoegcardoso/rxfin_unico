import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  comparison?: string;
  trend?: 'up' | 'down' | 'neutral';
  positive?: boolean;
  icon?: React.ReactNode;
  iconBg?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Standard lightweight metric card following the RXFin Design System.
 * When onClick is provided, automatically applies interactive hover styles and accessibility attributes.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  comparison,
  trend,
  positive = true,
  icon,
  iconBg = 'bg-primary/10',
  onClick,
  className,
}) => {
  return (
    <Card
      className={cn(
        onClick && "hover:border-primary/30 hover:shadow-md cursor-pointer transition-all duration-200",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-xl font-bold text-foreground truncate tabular-nums">{value}</p>
            {comparison && (
              <div className={cn(
                "flex items-center gap-1 text-xs",
                positive ? "text-income" : "text-expense"
              )}>
                {trend === 'up' && <ArrowUpRight className="h-3 w-3 shrink-0" />}
                {trend === 'down' && <ArrowDownRight className="h-3 w-3 shrink-0" />}
                <span className="truncate">{comparison}</span>
              </div>
            )}
          </div>
          {icon && (
            <div className={cn(
              "shrink-0 h-9 w-9 rounded-lg flex items-center justify-center",
              iconBg
            )}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
