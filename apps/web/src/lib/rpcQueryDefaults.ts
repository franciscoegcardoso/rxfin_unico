/**
 * Parte B.3 — Cache no cliente para RPCs pesadas (reduz carga em MVs/RPCs agregadas).
 * Alinhar hooks que chamam `get_investments_page_data`, health, etc.
 */
/** 5 min — recomendado no plano Fase 3 para dashboards analíticos. */
export const STALE_RPC_ANALYTICS_MS = 5 * 60 * 1000;

/** 10 min — dados de investimentos mudam com menos frequência que extrato. */
export const STALE_RPC_INVESTMENTS_PAGE_MS = 10 * 60 * 1000;
