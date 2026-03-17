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

export const MetricCard: React.FC<MetricCardProps> = ({
  title, value, comparison, trend, positive = true,
  icon, iconBg = 'bg-primary/10', onClick, className,
}) => {
  return (
    <Card
      className={cn(onClick && 'hover:border-primary/30 hover:shadow-md cursor-pointer transition-all duration-200', className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-1">
            <p className="truncate" style={{
              fontSize: '10px', fontWeight: 500, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'hsl(var(--color-text-secondary))',
              fontFamily: 'var(--font-sans)',
            }}>
              {title}
            </p>
            <p className="truncate tabular-nums" style={{
              fontSize: '22px', fontWeight: 600, letterSpacing: '-0.02em',
              color: 'hsl(var(--color-text-primary))', fontFamily: 'var(--font-numeric)',
              lineHeight: 1.15,
            }}>
              {value}
            </p>
            {comparison && (
              <div className="flex items-center gap-1" style={{
                fontSize: '11px', fontWeight: 500, fontFamily: 'var(--font-sans)',
                color: positive ? 'hsl(var(--color-income))' : 'hsl(var(--color-expense))',
              }}>
                {trend === 'up' && <ArrowUpRight className="h-3 w-3 shrink-0" />}
                {trend === 'down' && <ArrowDownRight className="h-3 w-3 shrink-0" />}
                <span className="truncate">{comparison}</span>
              </div>
            )}
          </div>
          {icon && (
            <div className={cn('shrink-0 h-9 w-9 rounded-lg flex items-center justify-center', iconBg)}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
