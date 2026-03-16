import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ConnectorStatusValue } from '@/hooks/useConnectorStatus';

const STATUS_CONFIG: Record<
  ConnectorStatusValue,
  { label: string; tooltip: string; dotClass: string }
> = {
  ONLINE: {
    label: 'Operacional',
    tooltip: 'Conector operacional',
    dotClass: 'bg-emerald-500',
  },
  UNSTABLE: {
    label: 'Instável',
    tooltip:
      'Conector com instabilidade. Dados podem estar desatualizados.',
    dotClass: 'bg-amber-500',
  },
  OFFLINE: {
    label: 'Offline',
    tooltip:
      'Conector offline. Sincronização indisponível no momento.',
    dotClass: 'bg-red-500',
  },
};

interface ConnectorHealthBadgeProps {
  connectorId: number;
  statusMap: Map<number, { status: ConnectorStatusValue; changedAt: string }>;
  showLabel?: boolean;
  className?: string;
}

/**
 * Badge de saúde do conector Pluggy (ONLINE / UNSTABLE / OFFLINE).
 * Se não houver dados de status para o connectorId, não renderiza nada.
 */
export const ConnectorHealthBadge: React.FC<ConnectorHealthBadgeProps> = ({
  connectorId,
  statusMap,
  showLabel = false,
  className,
}) => {
  const entry = statusMap.get(connectorId);
  if (entry == null) return null;

  const config = STATUS_CONFIG[entry.status];
  if (!config) return null;

  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 shrink-0',
        className
      )}
      title={!showLabel ? config.tooltip : undefined}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full shrink-0',
          config.dotClass
        )}
        aria-hidden
      />
      {showLabel && (
        <span className="text-[10px] text-muted-foreground">
          {config.label}
        </span>
      )}
    </span>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-default">{content}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          {config.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
