import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, AlertCircle, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BillStatus = 'open' | 'closed' | 'paid' | 'overdue';

const statusConfig: Record<
  BillStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  open: {
    label: 'Aberta',
    icon: Clock,
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  },
  closed: {
    label: 'Fechada',
    icon: CalendarClock,
    className: 'bg-muted text-muted-foreground border-border',
  },
  paid: {
    label: 'Paga',
    icon: Check,
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  overdue: {
    label: 'Vencida',
    icon: AlertCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
};

export interface BillStatusBadgeProps {
  status: BillStatus;
  className?: string;
}

export const BillStatusBadge: React.FC<BillStatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status] ?? statusConfig.open;
  const Icon = config.icon;
  return (
    <Badge
      variant="outline"
      className={cn('text-xs gap-1 font-medium', config.className, className)}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {config.label}
    </Badge>
  );
};
