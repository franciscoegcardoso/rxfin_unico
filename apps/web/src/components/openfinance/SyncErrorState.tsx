import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Link2 } from 'lucide-react';

interface SyncErrorStateProps {
  connectorName: string;
  status: string;
  onRetry: () => void;
  onReconnect?: () => void;
  isRetrying?: boolean;
}

export const SyncErrorState: React.FC<SyncErrorStateProps> = ({
  connectorName,
  status,
  onRetry,
  onReconnect,
  isRetrying,
}) => {
  const isLoginError = status === 'LOGIN_ERROR';
  const isTimeout = status === 'OUTDATED';

  const title = isTimeout
    ? `Conexão com ${connectorName} expirou`
    : isLoginError
      ? `A conexão com ${connectorName} expirou`
      : `Falha ao sincronizar ${connectorName}`;

  const description = isTimeout
    ? 'O tempo de autorização no seu banco expirou. Clique em Reconectar e lembre-se de confirmar a permissão no aplicativo do banco.'
    : isLoginError
      ? 'Sua sessão bancária precisa ser renovada. Reconecte para continuar sincronizando.'
      : 'Houve um problema temporário. Tente novamente em alguns instantes.';

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        {connectorName === 'XP Banking' &&
          (status === 'OUTDATED' || status === 'ERROR') && (
            <p className="text-xs text-muted-foreground mt-1">
              O XP Banking exige reautorização periódica por política de segurança do banco. Isso é normal e
              esperado.
            </p>
          )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {(isLoginError || isTimeout) && onReconnect ? (
          <Button size="sm" variant="destructive" className="gap-1.5 h-8 text-xs" onClick={onReconnect}>
            <Link2 className="h-3.5 w-3.5" />
            Reconectar conta
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-8 text-xs border-destructive/30 hover:bg-destructive/10"
            onClick={onRetry}
            disabled={isRetrying}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            Tentar novamente
          </Button>
        )}
      </div>
    </div>
  );
};
