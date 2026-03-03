/**
 * Audit log para Edge Functions — insere diretamente em crud_audit_log.
 * Usar com o client Supabase com service_role (admin).
 */
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function logEdgeFunctionCrud(
  supabaseAdmin: SupabaseClient,
  params: {
    userId?: string;
    operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
    tableName: string;
    recordId?: string;
    source?: string;
    endpoint: string;
    oldData?: unknown;
    newData?: unknown;
    success: boolean;
    errorMessage?: string;
    errorCode?: string;
    durationMs?: number;
  }
): Promise<void> {
  try {
    await supabaseAdmin.from('crud_audit_log').insert({
      user_id: params.userId ?? null,
      operation: params.operation,
      table_name: params.tableName,
      record_id: params.recordId ?? null,
      source: params.source ?? 'edge_function',
      endpoint: params.endpoint,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null,
      metadata: {},
      success: params.success,
      error_message: params.errorMessage ?? null,
      error_code: params.errorCode ?? null,
      duration_ms: params.durationMs ?? null,
    });
  } catch (err) {
    console.error('[AuditLog] Edge Function log failed:', err);
  }
}
