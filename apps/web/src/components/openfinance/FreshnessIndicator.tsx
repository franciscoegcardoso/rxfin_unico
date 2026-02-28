import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FreshnessIndicatorProps {
  lastSyncAt: string | null;
  status: string;
  /** Latest transaction date available from the bank (YYYY-MM-DD or ISO) */
  latestTransactionDate?: string | null;
  className?: string;
}

function getTimeDiffLabel(lastSyncAt: string): string {
  const now = new Date();
  const sync = new Date(lastSyncAt);
  const diffMs = now.getTime() - sync.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Atualizado agora';
  if (diffMin < 60) return `Atualizado há ${diffMin} min`;
  if (diffHours < 24) return `Atualizado há ${diffHours}h`;
  if (diffDays === 1) return 'Atualizado ontem';
  return `Atualizado há ${diffDays} dias`;
}

function formatDateBR(dateStr: string): string {
  const clean = dateStr.split('T')[0];
  const [y, m, d] = clean.split('-');
  return `${d}/${m}/${y}`;
}

type FreshnessLevel = 'fresh' | 'stale' | 'error';

function getFreshnessLevel(lastSyncAt: string | null, status: string): FreshnessLevel {
  if (status === 'LOGIN_ERROR' || status === 'OUTDATED') return 'error';
  if (!lastSyncAt) return 'stale';

  const diffMs = Date.now() - new Date(lastSyncAt).getTime();
  const hours24 = 24 * 60 * 60 * 1000;

  if (diffMs < hours24) return 'fresh';
  return 'stale';
}

const levelConfig: Record<FreshnessLevel, { color: string; Icon: React.ElementType; tooltip: string }> = {
  fresh: {
    color: 'text-income',
    Icon: CheckCircle2,
    tooltip: 'Dados atualizados recentemente.',
  },
  stale: {
    color: 'text-yellow-500',
    Icon: AlertTriangle,
    tooltip: 'Dados não atualizados há mais de 24 horas. Sincronize para obter os dados mais recentes.',
  },
  error: {
    color: 'text-destructive',
    Icon: AlertCircle,
    tooltip: 'Erro na conexão. Pode ser necessário reconectar sua conta.',
  },
};

export const FreshnessIndicator: React.FC<FreshnessIndicatorProps> = ({
  lastSyncAt,
  status,
  latestTransactionDate,
  className,
}) => {
  const level = getFreshnessLevel(lastSyncAt, status);
  const { color, Icon, tooltip } = levelConfig[level];

  const label = level === 'error'
    ? (status === 'OUTDATED' ? '⚠️ Expirada' : '⚠️ Erro de Login')
    : lastSyncAt
      ? getTimeDiffLabel(lastSyncAt)
      : 'Nunca sincronizado';

  const latestDateLabel = latestTransactionDate
    ? `Último dado disponível: ${formatDateBR(latestTransactionDate)}`
    : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center gap-1 text-[11px]', color, className)}>
            <Icon className="h-3 w-3" />
            {label}
            {latestDateLabel && (
              <span className="text-muted-foreground ml-0.5">
                · Dados até {formatDateBR(latestTransactionDate!)}
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px] text-xs space-y-1">
          <p>{tooltip}</p>
          {latestTransactionDate && lastSyncAt && (
            <p className="text-[10px] text-muted-foreground">
              A instituição pode levar 1–2 dias úteis para liberar as transações mais recentes.
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
