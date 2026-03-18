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

/** Lista completa de lançamentos (deduplicada entre N componentes no Início). */
export function lancamentosListQueryKey(userId: string) {
  return ['lancamentos', userId] as const;
}

export function lancamentosPaginatedQueryKey(
  userId: string,
  page: number,
  pageSize: number,
  mesReferencia: string | null | undefined
) {
  return ['lancamentos', userId, 'paginated', page, pageSize, mesReferencia ?? ''] as const;
}

/** Invalida lista + todas as págin paginadas do utilizador. */
export function lancamentosQueryFilter(userId: string) {
  return { queryKey: ['lancamentos', userId] as const };
}
