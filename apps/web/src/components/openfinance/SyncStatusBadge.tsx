import React from 'react';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSyncStatus } from '@/hooks/useSyncStatus';

interface SyncStatusBadgeProps {
  itemId: string;
  onSyncComplete?: () => void;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Nunca sincronizado';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(diffMs / 86400000);
  if (days === 1) return 'há 1 dia';
  return `há ${days} dias`;
}

const uiStateConfig: Record<string, { icon: React.ReactNode; label: (conn: { last_sync_at: string | null; error_code: string | null }) => string }> = {
  idle: {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    label: (conn) => `Atualizado ${conn.last_sync_at ? timeAgo(conn.last_sync_at) : ''}`.trim() || 'Atualizado',
  },
  syncing: {
    icon: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
    label: () => 'Sincronizando...',
  },
  queued: {
    icon: <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />,
    label: () => 'Aguardando sincronização...',
  },
  error: {
    icon: <XCircle className="h-4 w-4 text-destructive" />,
    label: (conn) => `Erro na conexão${conn.error_code ? ` (${conn.error_code})` : ''}`,
  },
  unknown: {
    icon: <Clock className="h-4 w-4 text-muted-foreground" />,
    label: () => 'Status desconhecido',
  },
};

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ itemId, onSyncComplete }) => {
  const { data: syncData, isLoading } = useSyncStatus(itemId);
  const conn = syncData?.connections?.find((c) => c.item_id === itemId) ?? syncData?.connections?.[0];
  const uiState = (conn?.ui_state ?? 'unknown') as keyof typeof uiStateConfig;
  const config = uiStateConfig[uiState] ?? uiStateConfig.unknown;

  if (isLoading || !conn) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center">{config.icon}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">{config.label(conn)}</p>
      </TooltipContent>
    </Tooltip>
  );
};
