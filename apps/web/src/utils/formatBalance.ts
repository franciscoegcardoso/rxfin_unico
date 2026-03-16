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
