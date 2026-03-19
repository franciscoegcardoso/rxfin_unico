export type ApiCredentialCategory =
  | 'open_finance'
  | 'ai'
  | 'market_data'
  | 'infra'
  | 'automation'
  | 'communication'
  | 'mobile';

export type ApiCredentialEnvironment = 'production' | 'sandbox' | 'development';

export type ApiCredentialStatus = 'active' | 'inactive' | 'revoked';

export interface ApiCredential {
  id: string;
  name: string;
  service: string;
  category: ApiCredentialCategory;
  environment: ApiCredentialEnvironment;
  endpoint_url: string | null;
  description: string | null;
  status: ApiCredentialStatus;
  expires_at: string | null;
  last_rotated_at: string | null;
  created_at: string;
  updated_at: string;
  has_secret: boolean;
}

export type ApiKeyAuditAction = 'create' | 'update' | 'reveal' | 'rotate' | 'revoke';

export interface ApiKeyAuditEntry {
  id: string;
  admin_id: string;
  action: ApiKeyAuditAction;
  credential_id: string;
  credential_name: string;
  service: string;
  environment: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UpsertCredentialInput {
  id?: string;
  name: string;
  service: string;
  category: ApiCredentialCategory;
  environment: ApiCredentialEnvironment;
  key_value: string;
  secret_value?: string | null;
  endpoint_url?: string | null;
  description?: string | null;
  expires_at?: string | null;
}

export interface RotateCredentialInput {
  new_key_value?: string;
  new_secret_value?: string;
}

export interface VaultSecretStatus {
  secret_name: string;
  exists_in_vault: boolean;
  vault_updated_at: string | null;
  edge_functions: string[];
  description: string;
}

export interface WebhookEventSummary {
  source: string;
  endpoint_path: string;
  total_events: number;
  last_event_at: string | null;
  last_event_type: string | null;
  processed_count: number;
  error_count: number;
}
