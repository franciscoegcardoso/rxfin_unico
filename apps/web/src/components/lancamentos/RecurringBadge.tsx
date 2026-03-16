import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/utils';
import type { RecurringBadgeInfo } from '@/hooks/useRecurringBadges';
import { cn } from '@/lib/utils';

export interface RecurringBadgeProps {
  info: RecurringBadgeInfo;
  className?: string;
}

function tooltipText(info: RecurringBadgeInfo): string {
  const avg = formatCurrency(info.average_amount);
  return `Recorrente · ${avg}/mês · ${Math.round(info.regularity_pct)}% regular`;
}

export const RecurringBadge: React.FC<RecurringBadgeProps> = ({ info, className }) => {
  const navigate = useNavigate();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate('/compromissos');
            }}
            className={cn(
              'inline-flex items-center justify-center rounded p-0.5 text-[hsl(var(--color-text-muted))] hover:text-[hsl(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-primary',
              className
            )}
            aria-label={tooltipText(info)}
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText(info)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
