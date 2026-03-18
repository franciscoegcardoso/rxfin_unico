/**
 * Alocação de Ativos — sub-rota de Bens & Investimentos → Investimentos.
 * (Não usar rota raiz `/alocacao`; manter redirect legado em App.tsx se necessário.)
 */
export const INVESTIMENTOS_ALOCACAO_PATH = '/bens-investimentos/investimentos/alocacao' as const;

/** Path antigo — filtrar em menus vindos do banco; redirect em App.tsx */
export const LEGACY_ALOCACAO_PATH = '/alocacao' as const;

/** Segmento relativo em AppShell para redirect legado */
export const LEGACY_ALOCACAO_ROUTE_SEGMENT = 'alocacao' as const;
