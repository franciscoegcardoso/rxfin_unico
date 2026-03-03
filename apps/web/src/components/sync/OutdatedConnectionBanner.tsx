import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokePluggySync } from '@/lib/pluggySync';
import type { Session } from '@supabase/supabase-js';
import { AlertTriangle } from 'lucide-react';
import { PluggyConnectButton } from '@/components/openfinance/PluggyConnectButton';

interface OutdatedConnection {
  id: string;
  connector_name: string;
  item_id: string | null;
  execution_status: string | null;
}

export const OutdatedConnectionBanner: React.FC<{ onReconnected?: () => void }> = ({ onReconnected }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [outdated, setOutdated] = useState<OutdatedConnection[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, s) => setSession(s ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const fetchOutdated = useCallback(async () => {
    if (!session?.access_token) return;
    const userId = session.user?.id;
    if (!userId) return;

    try {
      await invokePluggySync({ action: 'refresh-statuses' });
    } catch (e) {
      console.error('Failed to refresh connection statuses:', e);
    }

    const { data } = await supabase
      .from('pluggy_connections')
      .select('id, connector_name, item_id, execution_status')
      .eq('user_id', userId)
      .eq('status', 'OUTDATED')
      .is('deleted_at', null);

    setOutdated(data || []);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetchOutdated();
  }, [session, fetchOutdated]);

  const handleSuccess = useCallback(() => {
    fetchOutdated();
    onReconnected?.();
  }, [fetchOutdated, onReconnected]);

  if (outdated.length === 0) return null;

  return (
    <div className="space-y-2">
      {outdated.map((conn) => (
        <div
          key={conn.id}
          className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3"
        >
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              <span className="font-medium">Atenção:</span> Sua conexão com o{' '}
              <span className="font-semibold">{conn.connector_name}</span>{' '}
              expirou por tempo de inatividade.
              {conn.execution_status === 'USER_INPUT_TIMEOUT' && (
                <span className="text-muted-foreground">
                  {' '}Lembre-se de confirmar a permissão no aplicativo do banco.
                </span>
              )}
            </p>
          </div>
          {conn.item_id && (
            <PluggyConnectButton
              updateItemId={conn.item_id}
              onSuccess={handleSuccess}
              variant="outline"
              size="sm"
            />
          )}
        </div>
      ))}
    </div>
  );
};
