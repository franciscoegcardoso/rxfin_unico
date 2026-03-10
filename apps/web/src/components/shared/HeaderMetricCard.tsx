import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type HeaderMetricCardVariant = 'positive' | 'negative' | 'neutral' | 'blue' | 'amber';

const variantStyles = {
  positive: {
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-600',
    valueColor: 'text-green-600',
  },
  negative: {
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-600',
    valueColor: 'text-red-600',
  },
  neutral: {
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    valueColor: 'text-foreground',
  },
  blue: {
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600',
    valueColor: 'text-foreground',
  },
  amber: {
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
    valueColor: 'text-foreground',
  },
} as const;

export interface HeaderMetricCardProps {
  /** Label em maiúsculas (ex: "TOTAL ATIVOS") */
  label: string;
  /** Valor exibido (ex: "R$ 1.303.000") */
  value: string;
  /** positive = verde, negative = vermelho, neutral = preto, blue = azul, amber = âmbar */
  variant?: HeaderMetricCardVariant;
  /** Ícone: elemento React (ex: <Wallet />) ou componente Lucide (ex: Wallet) — nunca passar como objeto no JSX */
  icon: React.ReactNode | LucideIcon;
  /** Classe extra no Card */
  className?: string;
}

/**
 * Card de métrica padronizado para headers de página (referência: bens-investimentos).
 * Layout: ícone à esquerda em círculo colorido, label em cima e valor embaixo à direita.
 * Fonte: label 10px uppercase muted, valor 14px semibold; cores por variant.
 */
export const HeaderMetricCard: React.FC<HeaderMetricCardProps> = ({
  label,
  value,
  variant = 'neutral',
  icon,
  className,
}) => {
  const styles = variantStyles[variant];
  return (
    <Card className={cn('rounded-[14px] border border-border/80 bg-card shadow-sm', className)}>
      <CardContent className="flex items-center gap-2 p-3">
        <div
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center shrink-0 [&>svg]:h-4 [&>svg]:w-4',
            styles.iconBg,
            styles.iconColor
          )}
        >
          {React.isValidElement(icon)
            ? icon
            : (() => {
                const Icon = icon as LucideIcon;
                return <Icon className="h-4 w-4" aria-hidden />;
              })()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate">
            {label}
          </p>
          <p
            className={cn(
              'text-sm font-semibold truncate tabular-nums',
              styles.valueColor
            )}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
