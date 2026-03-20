import React from 'react';
import { cn } from '@/lib/utils';

export type BalanceLiveStatusBadgeVariant = 'default' | 'onPrimary';

export interface BalanceLiveStatusBadgeProps {
  live: boolean;
  /** `onPrimary`: texto sobre fundo escuro (hero mobile). */
  variant?: BalanceLiveStatusBadgeVariant;
  className?: string;
}

/**
 * Indicador de frescor do saldo Pluggy (sem chamadas extras — só dados já retornados pela RPC).
 */
export const BalanceLiveStatusBadge: React.FC<BalanceLiveStatusBadgeProps> = ({
  live,
  variant = 'default',
  className,
}) => {
  const liveColor =
    variant === 'onPrimary'
      ? 'text-emerald-300'
      : 'text-green-600 dark:text-green-400';
  const estimatedColor =
    variant === 'onPrimary' ? 'text-primary-foreground/75' : 'text-muted-foreground';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px] font-medium whitespace-nowrap shrink-0',
        live ? liveColor : estimatedColor,
        className
      )}
      title={live ? 'Saldo atualizado há menos de 5 minutos' : 'Saldo com base na última sincronização'}
    >
      <span className="text-[9px] leading-none" aria-hidden>
        {live ? '●' : '○'}
      </span>
      {live ? 'Ao vivo' : 'Estimado'}
    </span>
  );
};
