import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/**
 * Hook for logging admin actions via the `log_admin_action` RPC.
 * Fire-and-forget — never blocks the UI or shows toasts on failure.
 */
export function useAdminAudit() {
  const logAction = useCallback(
    async (
      action: string,
      resourceType: string,
      resourceId?: string | null,
      metadata: Record<string, unknown> = {},
      severity: string = 'medium',
    ) => {
      try {
        await supabase.rpc('log_admin_action', {
          _action: action,
          _resource_type: resourceType,
          _resource_id: resourceId ?? undefined,
          _metadata: metadata as Json,
          _severity: severity,
        });
      } catch (err) {
        console.error('[useAdminAudit] Failed to log action:', err);
      }
    },
    [],
  );

  return { logAction };
}
