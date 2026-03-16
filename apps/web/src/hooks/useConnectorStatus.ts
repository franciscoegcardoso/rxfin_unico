import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ConnectorStatusValue = 'ONLINE' | 'UNSTABLE' | 'OFFLINE';

export interface ConnectorStatusRow {
  connector_id: number;
  status: ConnectorStatusValue;
  changed_at: string;
}

/**
 * Busca o status de saúde dos conectores Pluggy via RPC get_connectors_status.
 * Retorna um Map<connectorId, { status, changedAt }>.
 * Re-fetch automático a cada 5 minutos.
 */
export function useConnectorStatus(connectorIds: number[]) {
  const uniqueIds = [...new Set(connectorIds)].filter((id) => id != null && Number.isInteger(id));

  const query = useQuery({
    queryKey: ['connector_status', uniqueIds.sort((a, b) => a - b)],
    queryFn: async (): Promise<Map<number, { status: ConnectorStatusValue; changedAt: string }>> => {
      if (uniqueIds.length === 0) return new Map();
      const { data, error } = await supabase.rpc('get_connectors_status', {
        p_connector_ids: uniqueIds,
      });
      if (error) throw error;
      const rows = (data ?? []) as ConnectorStatusRow[];
      const map = new Map<number, { status: ConnectorStatusValue; changedAt: string }>();
      rows.forEach((row) => {
        const id = row.connector_id;
        if (id != null && (row.status === 'ONLINE' || row.status === 'UNSTABLE' || row.status === 'OFFLINE')) {
          map.set(id, {
            status: row.status,
            changedAt: row.changed_at ?? '',
          });
        }
      });
      return map;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: uniqueIds.length > 0,
  });

  return {
    statusMap: query.data ?? new Map(),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
