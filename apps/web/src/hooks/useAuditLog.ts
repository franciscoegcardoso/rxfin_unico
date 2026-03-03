import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogParams {
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  tableName: string;
  recordId?: string;
  source?: 'app' | 'n8n' | 'edge_function' | 'manual' | 'pluggy_sync' | 'system';
  endpoint?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
  errorCode?: string;
  durationMs?: number;
}

export function useAuditLog() {
  const logOperation = useCallback(async (params: AuditLogParams) => {
    try {
      await supabase.rpc('log_crud_operation', {
        p_operation: params.operation,
        p_table_name: params.tableName,
        p_record_id: params.recordId ?? null,
        p_source: params.source ?? 'app',
        p_endpoint: params.endpoint ?? (typeof window !== 'undefined' ? window.location.pathname : ''),
        p_old_data: params.oldData ?? null,
        p_new_data: params.newData ?? null,
        p_metadata: {
          ...params.metadata,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          timestamp_local: new Date().toISOString(),
        },
        p_success: params.success ?? true,
        p_error_message: params.errorMessage ?? null,
        p_error_code: params.errorCode ?? null,
        p_duration_ms: params.durationMs ?? null,
      });
    } catch (err) {
      console.error('[AuditLog] Falha ao registrar:', err);
    }
  }, []);

  return { logOperation };
}
