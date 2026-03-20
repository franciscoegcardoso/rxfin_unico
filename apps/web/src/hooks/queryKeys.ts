/**
 * Chaves estáveis para React Query — deduplicação e invalidação consistente.
 */
export const STALE = {
  /** subscription_plans, estrutura pages (nav) */
  APP_STRUCTURE: 15 * 60 * 1000,
  GC_APP_STRUCTURE: 60 * 60 * 1000,
  /** app_settings */
  APP_SETTINGS: 5 * 60 * 1000,
  GC_APP_SETTINGS: 30 * 60 * 1000,
  /** app_config (demo_user_id, feature flags) */
  APP_CONFIG: 15 * 60 * 1000,
  GC_APP_CONFIG: 60 * 60 * 1000,
  /** lancamentos por utilizador */
  LANCAMENTOS: 60 * 1000,
  GC_LANCAMENTOS: 60 * 60 * 1000,
} as const;

/**
 * Segmento estável do mês na query key.
 * - `__all__` = sem filtro de mês (lista completa)
 * - `YYYY-MM` = filtro válido
 * - `invalid-month` = mês inválido (query desativada no hook; nunca use "" no cache)
 */
export function lancamentosMesSegment(mesReferencia?: string | null): string {
  if (mesReferencia == null) return '__all__';
  if (mesReferencia.length === 7) return mesReferencia;
  return 'invalid-month';
}

/**
 * Lista de lançamentos para React Query.
 * Com `mesReferencia` null/undefined → segmento `__all__` (lista completa).
 * No Início, preferir uma única subscrição via `LancamentosAllProvider` + `useGlobalLancamentosQuery`
 * (`hooks/useGlobalLancamentos.ts`) em vez de vários `useLancamentosRealizados()`.
 */
export function lancamentosListQueryKey(userId: string, mesReferencia?: string | null) {
  return ['lancamentos', userId, lancamentosMesSegment(mesReferencia)] as const;
}

export function lancamentosPaginatedQueryKey(
  userId: string,
  page: number,
  pageSize: number,
  mesReferencia: string | null | undefined
) {
  return ['lancamentos', userId, 'paginated', page, pageSize, lancamentosMesSegment(mesReferencia)] as const;
}

/** Invalida lista + todas as págin paginadas do utilizador. */
export function lancamentosQueryFilter(userId: string) {
  return { queryKey: ['lancamentos', userId] as const };
}
