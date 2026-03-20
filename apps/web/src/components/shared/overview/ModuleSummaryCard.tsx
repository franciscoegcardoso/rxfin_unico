import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface ModuleSummaryCardProps {
  title: string;
  subtitle: string;
  value: string;
  valueVariant?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  iconColor: string;
  badge?: string;
  onClick: () => void;
  isLoading?: boolean;
}

export const ModuleSummaryCard: React.FC<ModuleSummaryCardProps> = ({
  title,
  subtitle,
  value,
  valueVariant = 'neutral',
  icon: Icon,
  iconColor,
  badge,
  onClick,
  isLoading,
}) => {
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="p-4 space-y-2">
          <div className="animate-pulse bg-muted rounded-md h-4 w-24" />
          <div className="animate-pulse bg-muted rounded-md h-6 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'cursor-pointer border-border hover:shadow-sm transition-shadow',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Icon className={cn('h-6 w-6 shrink-0 mt-0.5', iconColor)} aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>
              {isMobile && <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />}
            </div>
            {badge && (
              <Badge variant="destructive" className="text-xs w-fit mt-2">
                {badge}
              </Badge>
            )}
          </div>
        </div>
        <p
          className={cn(
            'text-lg font-semibold tabular-nums',
            valueVariant === 'positive' && 'text-emerald-600 dark:text-emerald-400',
            valueVariant === 'negative' && 'text-destructive',
            valueVariant === 'neutral' && 'text-foreground'
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
};
