import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConnectorLogo } from '@/components/openfinance/ConnectorLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useConsentExpiryAlerts, sortConsentAlerts } from '@/hooks/useConsentExpiryAlerts';
import { cn } from '@/lib/utils';

/** Alias amigável; redireciona para instituições financeiras (Open Finance). */
const CONNECTIONS_PATH = '/conexoes';

/**
 * Banner não bloqueante no topo do conteúdo autenticado: consentimento Open Finance próximo do vencimento ou expirado.
 * Dados: RPC `get_consent_expiry_alerts` (cache 1h, sem polling).
 */
export const ConsentExpiryBanner: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading, isError } = useConsentExpiryAlerts(user?.id);
  const [dismissed, setDismissed] = useState(false);

  const { primary, variant, message } = useMemo(() => {
    const alerts = data?.alerts ?? [];
    if (alerts.length === 0) {
      return { primary: null as (typeof alerts)[0] | null, variant: null as 'expired' | 'critical' | 'warning' | null, message: '' };
    }
    const sorted = sortConsentAlerts(alerts);
    const p = sorted[0];
    const extra = alerts.length - 1;
    const name = p.connector_name?.trim() || 'instituição';

    let v: 'expired' | 'critical' | 'warning';
    if (data?.has_expired || p.urgency === 'expired' || p.is_expired) {
      v = 'expired';
    } else if (data?.has_critical || p.urgency === 'critical') {
      v = 'critical';
    } else {
      v = 'warning';
    }

    let msg = '';
    if (v === 'expired') {
      msg = `A autorização do ${name} expirou. Reconecte para retomar a sincronização.`;
    } else if (v === 'critical') {
      msg = `A autorização do ${name} expira em ${p.days_remaining} ${p.days_remaining === 1 ? 'dia' : 'dias'}. Renove agora para não perder dados.`;
    } else {
      msg = `Sua conexão com ${name} expira em ${p.days_remaining} ${p.days_remaining === 1 ? 'dia' : 'dias'}.`;
    }
    if (extra > 0) {
      msg += ` e mais ${extra} ${extra === 1 ? 'conexão' : 'conexões'}`;
    }

    return { primary: p, variant: v, message: msg };
  }, [data]);

  if (isLoading || isError || dismissed || !primary || !variant) {
    return null;
  }

  const shellClass =
    variant === 'expired'
      ? 'border-destructive/40 bg-destructive/10 [&_.consent-banner-text]:text-foreground'
      : variant === 'critical'
        ? 'border-amber-500/40 bg-amber-500/10 [&_.consent-banner-text]:text-foreground'
        : 'border-primary/35 bg-primary/5 [&_.consent-banner-text]:text-foreground';

  return (
    <div
      className={cn(
        'consent-expiry-banner shrink-0 border-b px-3 py-2.5 sm:px-4',
        shellClass,
      )}
      role="region"
      aria-label="Alerta de consentimento"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
          <ConnectorLogo
            imageUrl={primary.connector_image_url}
            connectorName={primary.connector_name}
            size="sm"
            className="mt-0.5 sm:mt-0"
          />
          <p className="consent-banner-text text-sm leading-snug">{message}</p>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1 sm:justify-start">
          <Button variant="secondary" size="sm" className="h-8 text-xs" asChild>
            <Link to={CONNECTIONS_PATH}>Renovar</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Dispensar alerta"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
