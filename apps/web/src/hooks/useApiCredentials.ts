import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  ApiCredential,
  ApiCredentialCategory,
  ApiCredentialEnvironment,
  ApiCredentialStatus,
  ApiKeyAuditEntry,
  UpsertCredentialInput,
  RotateCredentialInput,
} from '@/types/apiCredentials';

const CATEGORIES: ApiCredentialCategory[] = [
  'open_finance',
  'ai',
  'market_data',
  'infra',
  'automation',
  'communication',
  'mobile',
];

const ENVIRONMENTS: ApiCredentialEnvironment[] = ['production', 'sandbox', 'development'];
const STATUSES: ApiCredentialStatus[] = ['active', 'inactive', 'revoked'];

function asCategory(v: unknown): ApiCredentialCategory {
  const s = String(v ?? '');
  return CATEGORIES.includes(s as ApiCredentialCategory) ? (s as ApiCredentialCategory) : 'infra';
}

function asEnvironment(v: unknown): ApiCredentialEnvironment {
  const s = String(v ?? '');
  return ENVIRONMENTS.includes(s as ApiCredentialEnvironment)
    ? (s as ApiCredentialEnvironment)
    : 'development';
}

function asStatus(v: unknown): ApiCredentialStatus {
  const s = String(v ?? '');
  return STATUSES.includes(s as ApiCredentialStatus) ? (s as ApiCredentialStatus) : 'inactive';
}

function mapCredential(row: Record<string, unknown>): ApiCredential {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    service: String(row.service ?? ''),
    category: asCategory(row.category),
    environment: asEnvironment(row.environment),
    endpoint_url: row.endpoint_url != null ? String(row.endpoint_url) : null,
    description: row.description != null ? String(row.description) : null,
    status: asStatus(row.status),
    expires_at: row.expires_at != null ? String(row.expires_at) : null,
    last_rotated_at: row.last_rotated_at != null ? String(row.last_rotated_at) : null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
    has_secret: Boolean(row.has_secret),
  };
}

function mapAuditRow(row: Record<string, unknown>): ApiKeyAuditEntry {
  const action = String(row.action ?? 'update').toLowerCase();
  const actions: ApiKeyAuditEntry['action'][] = ['create', 'update', 'reveal', 'rotate', 'revoke'];
  const a = actions.includes(action as ApiKeyAuditEntry['action'])
    ? (action as ApiKeyAuditEntry['action'])
    : 'update';
  return {
    id: String(row.id ?? ''),
    admin_id: String(row.admin_id ?? ''),
    action: a,
    credential_id: String(row.credential_id ?? ''),
    credential_name: String(row.credential_name ?? ''),
    service: String(row.service ?? ''),
    environment: String(row.environment ?? ''),
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_at: String(row.created_at ?? ''),
  };
}

function parseRevealValue(data: unknown): string {
  if (data == null) return '';
  if (typeof data === 'string') return data;
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return String((data as { value: unknown }).value ?? '');
  }
  return String(data);
}

export function useApiCredentials() {
  const [credentials, setCredentials] = useState<ApiCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auditLog, setAuditLog] = useState<ApiKeyAuditEntry[]>([]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_api_credentials_admin');
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      setCredentials(rows.map((r) => mapCredential(r as Record<string, unknown>)));
    } catch (e) {
      console.error(e);
      setCredentials([]);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch().catch(() => {});
  }, [refetch]);

  const upsert = useCallback(async (input: UpsertCredentialInput): Promise<void> => {
    const payload: Record<string, unknown> = {
      p_name: input.name.trim(),
      p_service: input.service.trim(),
      p_category: input.category,
      p_environment: input.environment,
      p_endpoint_url: input.endpoint_url?.trim() || null,
      p_description: input.description?.trim() || null,
      p_expires_at: input.expires_at?.trim() || null,
    };
    if (input.id) payload.p_id = input.id;
    if (input.key_value.trim()) payload.p_key_value = input.key_value.trim();
    else if (!input.id) payload.p_key_value = '';
    if (input.secret_value != null && String(input.secret_value).trim() !== '') {
      payload.p_secret_value = String(input.secret_value).trim();
    } else if (!input.id) {
      payload.p_secret_value = null;
    }

    const { error } = await supabase.rpc('upsert_api_credential', payload);
    if (error) throw error;
    await refetch();
  }, [refetch]);

  const reveal = useCallback(async (credentialId: string, field: 'key' | 'secret'): Promise<string> => {
    const { data, error } = await supabase.rpc('reveal_api_credential', {
      p_credential_id: credentialId,
      p_field: field,
    });
    if (error) throw error;
    return parseRevealValue(data);
  }, []);

  const rotate = useCallback(
    async (credentialId: string, params: RotateCredentialInput): Promise<void> => {
      const payload: Record<string, unknown> = { p_credential_id: credentialId };
      if (params.new_key_value?.trim()) payload.p_new_key_value = params.new_key_value.trim();
      if (params.new_secret_value?.trim()) payload.p_new_secret_value = params.new_secret_value.trim();
      const { error } = await supabase.rpc('rotate_api_credential', payload);
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  const revoke = useCallback(
    async (credentialId: string): Promise<void> => {
      const { error } = await supabase.rpc('delete_api_credential', {
        p_credential_id: credentialId,
      });
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  const fetchAuditLog = useCallback(async (credentialId?: string) => {
    const { data, error } = await supabase.rpc('list_api_key_audit_log', {
      p_limit: 500,
      p_credential_id: credentialId ?? null,
    });
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    setAuditLog(rows.map((r) => mapAuditRow(r as Record<string, unknown>)));
  }, []);

  return {
    credentials,
    isLoading,
    refetch,
    upsert,
    reveal,
    rotate,
    revoke,
    auditLog,
    fetchAuditLog,
  };
}
