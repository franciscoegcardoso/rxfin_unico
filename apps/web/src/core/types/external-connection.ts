/**
 * Provider-agnostic types for external financial connections.
 * 
 * This abstraction layer allows the frontend to remain agnostic
 * to the underlying provider (Pluggy, Belvo, etc.).
 * All provider-specific logic should be confined to adapters and edge functions.
 */

// ─── Connection Status (normalized across providers) ──────────────────────────

export type ConnectionStatus = 'connected' | 'syncing' | 'error' | 'expired' | 'pending';

export type ConnectionErrorType = 'login_error' | 'timeout' | 'provider_error' | 'unknown';

// ─── Core Interfaces ─────────────────────────────────────────────────────────

export interface ExternalConnection {
  id: string;
  userId: string;
  /** Provider-specific item/link identifier */
  externalId: string;
  provider: 'pluggy' | 'belvo' | string;
  institutionName: string;
  institutionLogoUrl: string | null;
  institutionPrimaryColor: string | null;
  status: ConnectionStatus;
  errorType: ConnectionErrorType | null;
  executionStatus: string | null;
  consentExpiresAt: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalAccount {
  id: string;
  userId: string;
  connectionId: string;
  externalAccountId: string;
  type: 'BANK' | 'CREDIT' | 'SAVINGS' | 'INVESTMENT' | string;
  subtype: string | null;
  name: string;
  number: string | null;
  balance: number;
  currencyCode: string;
  creditLimit: number | null;
  availableCreditLimit: number | null;
  cardBrand: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalTransaction {
  id: string;
  userId: string;
  accountId: string;
  externalTransactionId: string;
  description: string;
  descriptionRaw: string | null;
  amount: number;
  date: string;
  category: string | null;
  type: string;
  status: string;
  paymentData: object | null;
  createdAt: string;
}

// ─── Provider Adapter Interface ───────────────────────────────────────────────

export interface ExternalConnectionActions {
  /** Get a connect token to launch the connection widget */
  getConnectToken: (updateExternalId?: string) => Promise<{ connectToken: string; cpf: string | null } | null>;
  /** Save or update a connection after widget success */
  saveConnection: (externalId: string) => Promise<boolean>;
  /** Trigger a data refresh for an existing connection */
  refreshConnection: (externalId: string) => Promise<boolean>;
  /** Soft-delete a connection */
  deleteConnection: (externalId: string) => Promise<boolean>;
  /** Trigger background sync */
  triggerSync: (externalId: string) => Promise<void>;
  /** Save user CPF (Brazil-specific, optional) */
  saveCpf?: (cpf: string) => Promise<boolean>;
}
