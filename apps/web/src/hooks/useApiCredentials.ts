import { useState, useCallback, useEffect } from 'react';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';

const EDGE_URL = `${SUPABASE_URL}/functions/v1/manage-api-credentials`;

export type ApiCredentialStatus = 'active' | 'inactive' | 'expired' | 'testing';

export interface ApiCredential {
  id: string;
  name: string;
  service: string;
  category: string;
  environment: string;
  endpoint_url?: string | null;
  description?: string | null;
  status: ApiCredentialStatus;
  expires_at?: string | null;
  last_rotated_at?: string | null;
  created_at: string;
  updated_at: string;
  /** Masked key (e.g. "abc••••••••xyz") — list response does not include raw values */
  key_masked?: string;
  secret_masked?: string;
}

export interface CreateCredentialPayload {
  name: string;
  service: string;
  category: string;
  environment: string;
  key_value: string;
  secret_value?: string;
  endpoint_url?: string;
  description?: string;
  expires_at?: string;
  status?: ApiCredentialStatus;
}

export interface UpdateCredentialPayload {
  name?: string;
  service?: string;
  category?: string;
  environment?: string;
  key_value?: string;
  secret_value?: string;
  endpoint_url?: string;
  description?: string;
  expires_at?: string;
  status?: ApiCredentialStatus;
}

export interface AuditLogEntry {
  action: string;
  credential_name: string;
  service: string;
  environment: string;
  ip?: string;
  created_at: string;
  metadata?: { fields_updated?: string[] };
}

export interface ConnectivityResult {
  reachable: boolean;
  status_code?: number;
  latency_ms?: number;
  error?: string;
}

export interface ExpirationSummary {
  expired: ApiCredential[];
  expiring_1d: ApiCredential[];
  expiring_7d: ApiCredential[];
  expiring_30d: ApiCredential[];
  ok: ApiCredential[];
}

export type SecurityLogEventType =
  | 'unauthorized_access'
  | 'forbidden_role'
  | 'rate_limit_exceeded'
  | 'invalid_action'
  | 'session_expired'
  | 'penetration_test';

export interface SecurityLogEntry {
  id: string;
  event_type: SecurityLogEventType;
  user_id: string | null;
  ip_address: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface UseApiCredentialsOptions {
  onSessionExpired?: () => void;
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  action: string,
  body?: object,
  queryParams?: Record<string, string>,
  onSessionExpired?: () => void
): Promise<{ data?: T; error?: string; status?: number; json?: Record<string, unknown> }> {
  const token = await getToken();
  if (!token) {
    return { error: 'Sessão não encontrada. Faça login novamente.' };
  }

  let url = `${EDGE_URL}?action=${action}`;
  if (queryParams) {
    const search = new URLSearchParams(queryParams).toString();
    if (search) url += `&${search}`;
  }
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
  if (body && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (res.status === 440 || json?.code === 'SESSION_EXPIRED') {
    onSessionExpired?.();
    return { error: 'Sessão expirada por inatividade.', status: 440, json };
  }

  if (!res.ok) {
    if (res.status === 429) {
      return { error: (json?.error as string) || 'Limite atingido', status: res.status, json };
    }
    return { error: (json?.error as string) || res.statusText || 'Erro na requisição', status: res.status, json };
  }

  if (json.error) {
    return { error: json.error as string, status: res.status, json };
  }

  return { data: json as T };
}

export function useApiCredentials(options?: UseApiCredentialsOptions) {
  const [credentials, setCredentials] = useState<ApiCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onSessionExpired = options?.onSessionExpired;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await request<{ success: boolean; data: ApiCredential[] }>('GET', 'list', undefined, undefined, onSessionExpired);
    if (err) {
      setError(err);
      setCredentials([]);
    } else if (data?.data) {
      setCredentials(data.data);
    } else {
      setCredentials([]);
    }
    setLoading(false);
  }, [onSessionExpired]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(async (payload: CreateCredentialPayload): Promise<boolean> => {
    const { data, error: err } = await request<{ success: boolean }>('POST', 'create', payload, undefined, onSessionExpired);
    if (err) {
      setError(err);
      return false;
    }
    if (data?.success) {
      await load();
      return true;
    }
    return false;
  }, [load, onSessionExpired]);

  const update = useCallback(async (id: string, payload: UpdateCredentialPayload): Promise<boolean> => {
    const { data, error: err } = await request<{ success: boolean }>('PUT', 'update', { credential_id: id, ...payload }, undefined, onSessionExpired);
    if (err) {
      setError(err);
      return false;
    }
    if (data?.success) {
      await load();
      return true;
    }
    return false;
  }, [load, onSessionExpired]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    const { data, error: err } = await request<{ success: boolean }>('DELETE', 'delete', { credential_id: id }, undefined, onSessionExpired);
    if (err) {
      setError(err);
      return false;
    }
    if (data?.success) {
      await load();
      return true;
    }
    return false;
  }, [load, onSessionExpired]);

  const reveal = useCallback(async (
    id: string
  ): Promise<{ key_value: string; secret_value?: string } | { rateLimited: true; resetsAt: string } | null> => {
    const { data, error: err, status, json } = await request<{
      success: boolean;
      key_value?: string;
      secret_value?: string;
    }>('POST', 'reveal', { credential_id: id }, undefined, onSessionExpired);
    if (err) {
      if (status === 429 && json?.resets_at) {
        return { rateLimited: true, resetsAt: String(json.resets_at) };
      }
      setError(err);
      return null;
    }
    if (data?.success && data?.key_value !== undefined) {
      return {
        key_value: data.key_value ?? '',
        secret_value: data.secret_value,
      };
    }
    return null;
  }, [onSessionExpired]);

  const fetchAudit = useCallback(async (): Promise<AuditLogEntry[]> => {
    const { data, error: err } = await request<{ success: boolean; data: AuditLogEntry[] }>('GET', 'audit', undefined, undefined, onSessionExpired);
    if (err || !data?.data) return [];
    return data.data;
  }, [onSessionExpired]);

  const fetchAuditByCredential = useCallback(async (credentialId: string): Promise<AuditLogEntry[]> => {
    const { data, error: err } = await request<{ success: boolean; data: AuditLogEntry[] }>(
      'GET',
      'audit',
      undefined,
      { credential_id: credentialId },
      onSessionExpired
    );
    if (err || !data?.data) return [];
    return data.data;
  }, [onSessionExpired]);

  const testConnectivity = useCallback(async (
    credentialId: string
  ): Promise<{ result: ConnectivityResult } | { noEndpoint: true } | { error: string }> => {
    const { data, error: err, status } = await request<{
      success: boolean;
      result?: ConnectivityResult;
    }>('POST', 'test-connectivity', { credential_id: credentialId }, undefined, onSessionExpired);
    if (err) {
      if (status === 422) return { noEndpoint: true };
      setError(err);
      return { error: err };
    }
    if (data?.success && data?.result) return { result: data.result };
    return { error: 'Resposta inválida' };
  }, [onSessionExpired]);

  const fetchExpirationSummary = useCallback(async (): Promise<ExpirationSummary | null> => {
    const { data, error: err } = await request<{ success: boolean; summary: ExpirationSummary }>('GET', 'expiration-summary', undefined, undefined, onSessionExpired);
    if (err || !data?.summary) return null;
    return data.summary;
  }, [onSessionExpired]);

  const fetchSecurityLog = useCallback(async (limit = 50): Promise<SecurityLogEntry[]> => {
    const { data, error: err } = await request<{ success: boolean; data: SecurityLogEntry[] }>(
      'GET',
      'security-log',
      undefined,
      { limit: String(limit) },
      onSessionExpired
    );
    if (err || !data?.data) return [];
    return data.data;
  }, [onSessionExpired]);

  return {
    credentials,
    loading,
    error,
    reload: load,
    create,
    update,
    remove,
    reveal,
    fetchAudit,
    fetchAuditByCredential,
    testConnectivity,
    fetchExpirationSummary,
    fetchSecurityLog,
  };
}
