import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from './useAuditLog';

type AuditSource = 'app' | 'n8n' | 'edge_function' | 'manual' | 'pluggy_sync' | 'system';

interface AuditOptions {
  endpoint?: string;
  source?: AuditSource;
}

export function useAuditedSupabase() {
  const { logOperation } = useAuditLog();

  const auditedInsert = useCallback(
    async (
      tableName: string,
      data: Record<string, unknown> | Record<string, unknown>[],
      options?: AuditOptions
    ) => {
      const startTime = performance.now();
      const result = await supabase.from(tableName as any).insert(data).select();
      const durationMs = Math.round(performance.now() - startTime);

      const records = Array.isArray(data) ? data : [data];
      const resultData = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
      for (let i = 0; i < records.length; i++) {
        const recordId = (resultData[i] as any)?.id?.toString() ?? (resultData[0] as any)?.id?.toString();
        await logOperation({
          operation: 'CREATE',
          tableName,
          recordId: recordId ?? undefined,
          newData: records[i] as Record<string, unknown>,
          success: !result.error,
          errorMessage: result.error?.message,
          errorCode: result.error?.code,
          durationMs,
          endpoint: options?.endpoint,
          source: options?.source,
        });
      }

      return result;
    },
    [logOperation]
  );

  const auditedUpdate = useCallback(
    async (
      tableName: string,
      data: Record<string, unknown>,
      match: Record<string, unknown>,
      options?: AuditOptions
    ) => {
      const startTime = performance.now();

      let query = supabase.from(tableName as any).select('*');
      for (const [key, value] of Object.entries(match)) {
        query = query.eq(key, value as string);
      }
      const oldResult = await query;
      const oldData = oldResult.data?.[0] as Record<string, unknown> | undefined;

      let updateQuery = supabase.from(tableName as any).update(data);
      for (const [key, value] of Object.entries(match)) {
        updateQuery = updateQuery.eq(key, value as string);
      }
      const result = await updateQuery.select();
      const durationMs = Math.round(performance.now() - startTime);

      const recordId = Object.values(match)[0]?.toString();

      await logOperation({
        operation: 'UPDATE',
        tableName,
        recordId,
        oldData: oldData ?? undefined,
        newData: data,
        success: !result.error,
        errorMessage: result.error?.message,
        errorCode: result.error?.code,
        durationMs,
        endpoint: options?.endpoint,
        source: options?.source,
      });

      return result;
    },
    [logOperation]
  );

  const auditedDelete = useCallback(
    async (tableName: string, match: Record<string, unknown>, options?: AuditOptions) => {
      const startTime = performance.now();

      let query = supabase.from(tableName as any).select('*');
      for (const [key, value] of Object.entries(match)) {
        query = query.eq(key, value as string);
      }
      const oldResult = await query;
      const oldData = oldResult.data?.[0] as Record<string, unknown> | undefined;

      let deleteQuery = supabase.from(tableName as any).delete();
      for (const [key, value] of Object.entries(match)) {
        deleteQuery = deleteQuery.eq(key, value as string);
      }
      const result = await deleteQuery;
      const durationMs = Math.round(performance.now() - startTime);

      const recordId = Object.values(match)[0]?.toString();

      await logOperation({
        operation: 'DELETE',
        tableName,
        recordId,
        oldData: oldData ?? undefined,
        success: !result.error,
        errorMessage: result.error?.message,
        errorCode: result.error?.code,
        durationMs,
        endpoint: options?.endpoint,
        source: options?.source,
      });

      return result;
    },
    [logOperation]
  );

  return {
    auditedInsert,
    auditedUpdate,
    auditedDelete,
    supabase,
    logOperation,
  };
}
