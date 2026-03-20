import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ConsentExpiryUrgency = 'expired' | 'critical' | 'warning';

export interface ConsentExpiryAlert {
  connection_id: string;
  connector_name: string;
  connector_image_url: string | null;
  consent_expires_at: string;
  days_remaining: number;
  is_expired: boolean;
  urgency: ConsentExpiryUrgency;
}

export interface ConsentExpiryAlertsPayload {
  alerts: ConsentExpiryAlert[];
  has_expired: boolean;
  has_critical: boolean;
}

const QUERY_KEY = ['consent-expiry-alerts'] as const;
const STALE_MS = 60 * 60 * 1000; // 1h — uma chamada efetiva por sessão de cache

const URGENCY_RANK: Record<ConsentExpiryUrgency, number> = {
  expired: 0,
  critical: 1,
  warning: 2,
};

/** Ordena do mais urgente ao menos; empate por dias restantes (menor = mais urgente). */
export function sortConsentAlerts(alerts: ConsentExpiryAlert[]): ConsentExpiryAlert[] {
  return [...alerts].sort((a, b) => {
    const dr = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (dr !== 0) return dr;
    return a.days_remaining - b.days_remaining;
  });
}

export function useConsentExpiryAlerts(userId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEY, userId],
    queryFn: async (): Promise<ConsentExpiryAlertsPayload> => {
      const { data, error } = await supabase.rpc('get_consent_expiry_alerts', {
        p_user_id: userId!,
      });
      if (error) throw error;
      return (data ?? { alerts: [], has_expired: false, has_critical: false }) as ConsentExpiryAlertsPayload;
    },
    enabled: !!userId,
    staleTime: STALE_MS,
    gcTime: STALE_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
