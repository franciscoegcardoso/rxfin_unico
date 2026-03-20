/**
 * Formatação de idade do saldo e status de atualização para Real Time Balance.
 */

export function formatBalanceAge(minutes: number | null): string {
  if (minutes == null) return '';
  if (minutes < 5) return 'agora mesmo';
  if (minutes < 60) return `há ${Math.round(minutes)} min`;
  if (minutes < 1440) return `há ${Math.round(minutes / 60)} h`;
  return `há ${Math.round(minutes / 1440)} dias`;
}

export type StaleStatus = 'fresh' | 'aging' | 'stale';

export function getStaleStatus(
  isStale: boolean,
  ageMinutes: number | null
): StaleStatus {
  if (isStale) return 'stale';
  if (ageMinutes != null && ageMinutes > 240) return 'aging';
  return 'fresh';
}

/** Limite "Ao vivo" alinhado ao produto (saldo atualizado há menos de 5 min). */
const LIVE_FRESH_MAX_MINUTES = 5;
const LIVE_FRESH_MAX_MS = LIVE_FRESH_MAX_MINUTES * 60 * 1000;

export interface BalanceFreshnessInput {
  balance_updated_at: string | null;
  balance_age_minutes: number | null;
}

/**
 * Saldo considerado "ao vivo" quando o backend indica atualização recente
 * (`balance_updated_at` ou `balance_age_minutes` da RPC `get_realtime_balance`).
 */
export function isRealtimeBalanceFresh(input: BalanceFreshnessInput): boolean {
  if (input.balance_updated_at) {
    const t = new Date(input.balance_updated_at).getTime();
    if (!Number.isNaN(t)) return Date.now() - t < LIVE_FRESH_MAX_MS;
  }
  if (input.balance_age_minutes != null) {
    return input.balance_age_minutes < LIVE_FRESH_MAX_MINUTES;
  }
  return false;
}

/** Header agregado: todas as contas corrente (checking) precisam estar frescas para "Ao vivo". */
export function allBalancesFresh(accounts: BalanceFreshnessInput[]): boolean {
  if (accounts.length === 0) return false;
  return accounts.every((a) => isRealtimeBalanceFresh(a));
}
