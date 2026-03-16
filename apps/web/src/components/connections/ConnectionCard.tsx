import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, RefreshCw, AlertCircle, CheckCircle2, Loader2, Link2 } from 'lucide-react';
import { ConnectorLogo } from '@/components/openfinance/ConnectorLogo';
import {
  formatLastSync,
  formatNextSync,
  getConnectionStatusConfig,
  getConsentExpiryDays,
  type ConnectionStatusConfig,
} from '@/utils/formatSync';
import type { PluggyConnection } from '@/hooks/usePluggyConnect';
import { cn } from '@/lib/utils';

const statusBadgeClass = (config: ConnectionStatusConfig): string => {
  switch (config.color) {
    case 'green':
      return 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    case 'yellow':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
    case 'red':
      return 'bg-destructive/15 text-destructive border-destructive/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const StatusIcon: React.FC<{ config: ConnectionStatusConfig; className?: string }> = ({
  config,
  className,
}) => {
  const c = cn('h-3.5 w-3.5 shrink-0', className);
  switch (config.icon) {
    case 'check':
      return <CheckCircle2 className={c} />;
    case 'alert':
      return <AlertCircle className={c} />;
    case 'refresh':
      return <Loader2 className={c} />;
    default:
      return <Clock className={c} />;
  }
};

export interface ConnectionCardProps {
  connection: PluggyConnection;
  onReconnect: (itemId: string) => void;
  /** Se true, mostra botão de reconectar em loading (ex.: após abrir widget) */
  isReconnecting?: boolean;
  className?: string;
}

/**
 * Card de uma conexão bancária: logo, nome, badge de status,
 * última/próxima sincronização e CTA de reconexão quando status = ERROR.
 */
export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  onReconnect,
  isReconnecting = false,
  className,
}) => {
  const statusConfig = getConnectionStatusConfig(
    connection.status,
    connection.error_type ?? null
  );
  const lastSyncLabel = formatLastSync(connection.last_sync_at);
  const nextSyncLabel = formatNextSync(connection.next_auto_sync_at ?? null);
  const consentDays = getConsentExpiryDays(connection.consent_expires_at ?? null);
  const showConsentWarning = consentDays !== null && consentDays <= 30;
  const isError =
    connection.status === 'ERROR' ||
    connection.status === 'LOGIN_ERROR' ||
    connection.status === 'OUTDATED';
  const needsReconnect =
    isError &&
    (connection.error_type === 'LOGIN_ERROR' ||
      connection.status === 'LOGIN_ERROR' ||
      connection.status === 'OUTDATED');

  return (
    <Card className={cn(className)}>
      <CardContent className="p-4 space-y-3">
        {/* Header: logo + nome + badge de status */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ConnectorLogo
              imageUrl={connection.connector_image_url}
              primaryColor={connection.connector_primary_color}
              connectorName={connection.connector_name}
              size="md"
            />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{connection.connector_name}</p>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] gap-1 mt-0.5 border',
                  statusBadgeClass(statusConfig)
                )}
              >
                <StatusIcon config={statusConfig} />
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Body: última atualização + próxima sync (se houver) */}
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Atualizado {lastSyncLabel}</span>
          </div>
          {nextSyncLabel && (
            <div className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 shrink-0" />
              <span>Próxima sync: {nextSyncLabel}</span>
            </div>
          )}
          {showConsentWarning && (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>
                Consentimento expira em{' '}
                {consentDays <= 0
                  ? 'hoje'
                  : `${consentDays} dia${consentDays > 1 ? 's' : ''}`}
              </span>
            </div>
          )}
        </div>

        {/* Footer: Reconectar quando status = ERROR (e LOGIN_ERROR ou legado) */}
        {needsReconnect && (
          <div className="pt-1 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onReconnect(connection.item_id)}
              disabled={isReconnecting}
            >
              {isReconnecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Link2 className="h-3.5 w-3.5" />
              )}
              Reconectar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
