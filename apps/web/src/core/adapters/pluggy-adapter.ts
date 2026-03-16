/**
 * Pluggy → ExternalConnection adapter.
 * 
 * Maps Pluggy-specific data structures and status codes
 * to the provider-agnostic ExternalConnection types.
 */

import type {
  ExternalConnection,
  ExternalAccount,
  ExternalTransaction,
  ConnectionStatus,
  ConnectionErrorType,
} from '@/core/types/external-connection';

// ─── Status Mapping ───────────────────────────────────────────────────────────

export function mapPluggyStatus(status: string, executionStatus: string | null): ConnectionStatus {
  if (status === 'ERROR') return 'error';
  if (status === 'LOGIN_ERROR') return 'error';
  if (status === 'OUTDATED') return 'expired';
  if (status === 'UPDATING' || status === 'WAITING_USER_INPUT') return 'syncing';
  if (['CREATING', 'MERGING'].includes(executionStatus || '')) return 'syncing';
  if (status === 'UPDATED') return 'connected';
  return 'pending';
}

export function mapPluggyErrorType(
  status: string,
  executionStatus: string | null,
  errorType?: string | null
): ConnectionErrorType | null {
  if (status === 'ERROR' && errorType === 'LOGIN_ERROR') return 'login_error';
  if (status === 'ERROR' && errorType === 'USER_INPUT_TIMEOUT') return 'timeout';
  if (status === 'LOGIN_ERROR') return 'login_error';
  if (status === 'OUTDATED' && executionStatus === 'USER_INPUT_TIMEOUT') return 'timeout';
  if (status === 'OUTDATED') return 'provider_error';
  return null;
}

// ─── Row Adapters ─────────────────────────────────────────────────────────────

interface PluggyConnectionRow {
  id: string;
  user_id: string;
  item_id: string;
  connector_name: string;
  connector_image_url: string | null;
  connector_primary_color: string | null;
  status: string;
  execution_status: string | null;
  error_type?: string | null;
  consent_expires_at: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export function toExternalConnection(row: PluggyConnectionRow): ExternalConnection {
  return {
    id: row.id,
    userId: row.user_id,
    externalId: row.item_id,
    provider: 'pluggy',
    institutionName: row.connector_name,
    institutionLogoUrl: row.connector_image_url,
    institutionPrimaryColor: row.connector_primary_color,
    status: mapPluggyStatus(row.status, row.execution_status),
    errorType: mapPluggyErrorType(row.status, row.execution_status, row.error_type),
    executionStatus: row.execution_status,
    consentExpiresAt: row.consent_expires_at,
    lastSyncAt: row.last_sync_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface PluggyAccountRow {
  id: string;
  user_id: string;
  connection_id: string;
  pluggy_account_id: string;
  type: string;
  subtype: string | null;
  name: string;
  number: string | null;
  balance: number;
  currency_code: string;
  credit_limit: number | null;
  available_credit_limit: number | null;
  card_brand: string | null;
  created_at: string;
  updated_at: string;
}

export function toExternalAccount(row: PluggyAccountRow): ExternalAccount {
  return {
    id: row.id,
    userId: row.user_id,
    connectionId: row.connection_id,
    externalAccountId: row.pluggy_account_id,
    type: row.type,
    subtype: row.subtype,
    name: row.name,
    number: row.number,
    balance: row.balance,
    currencyCode: row.currency_code,
    creditLimit: row.credit_limit,
    availableCreditLimit: row.available_credit_limit,
    cardBrand: row.card_brand,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface PluggyTransactionRow {
  id: string;
  user_id: string;
  account_id: string;
  pluggy_transaction_id: string;
  description: string;
  description_raw: string | null;
  amount: number;
  date: string;
  category: string | null;
  type: string;
  status: string;
  payment_data: object | null;
  created_at: string;
}

export function toExternalTransaction(row: PluggyTransactionRow): ExternalTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    externalTransactionId: row.pluggy_transaction_id,
    description: row.description,
    descriptionRaw: row.description_raw,
    amount: row.amount,
    date: row.date,
    category: row.category,
    type: row.type,
    status: row.status,
    paymentData: row.payment_data,
    createdAt: row.created_at,
  };
}
