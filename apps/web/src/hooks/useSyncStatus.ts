import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SyncConnection {
  item_id: string;
  connector_name: string;
  connector_image: string | null;
  conn_status: string;
  exec_status: string | null;
  error_code: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_txns_synced: number | null;
  jobs_pending: number;
  jobs_running: number;
  ui_state: 'idle' | 'syncing' | 'queued' | 'error' | 'unknown';
}

export interface SyncSummary {
  is_syncing: boolean;
  has_error: boolean;
  last_sync_at: string | null;
  connections_count: number;
}

export interface SyncStatus {
  summary: SyncSummary;
  connections: SyncConnection[];
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kneaniaifzgqibpajyji.supabase.co';

export function useSyncStatus(itemId?: string) {
  return useQuery<SyncStatus>({
    queryKey: ['syncStatus', itemId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/sync-status`,
        {
          method: itemId ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          ...(itemId ? { body: JSON.stringify({ itemId }) } : {}),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.summary?.is_syncing ? 3000 : 30_000;
    },
    staleTime: 2000,
  });
}
