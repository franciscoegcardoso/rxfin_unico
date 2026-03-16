import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ConnectionsHealthSummary {
  total: number;
  healthy: number;
  with_errors: number;
  login_errors: number;
  expiring_soon: number;
  expired: number;
}

export interface ConnectionHealthItem {
  id: string;
  item_id: string;
  connector_name: string;
  connector_image_url: string | null;
  connector_primary_color: string | null;
  status: string;
  error_type: string | null;
  consent_expires_at: string | null;
  consent_days_remaining: number | null;
  consent_expiring_soon: boolean;
  consent_expired: boolean;
  last_sync_at: string | null;
  [key: string]: unknown;
}

export interface ConnectionsHealthData {
  health_summary: ConnectionsHealthSummary;
  connections: ConnectionHealthItem[];
}

async function fetchConnectionsHealth(): Promise<ConnectionsHealthData | null> {
  const { data, error } = await supabase.rpc('get_connections_health');
  if (error) throw error;
  return data as ConnectionsHealthData | null;
}

export function useConnectionsHealth() {
  return useQuery({
    queryKey: ['connectionsHealth'],
    queryFn: fetchConnectionsHealth,
    staleTime: 60 * 1000,
  });
}
