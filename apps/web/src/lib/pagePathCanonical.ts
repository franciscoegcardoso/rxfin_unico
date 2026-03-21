/**
 * Alinha paths legados do Supabase com rotas canônicas do app (mesma lógica que useNavMenuPages).
 */
const SIMULADOR_FIPE_PATH = '/simuladores/veiculos/simulador-fipe';

export function normalizedPath(p: string): string {
  return p && p.startsWith('/') ? p : `/${p || ''}`.replace(/\/+/g, '/');
}

export function canonicalMenuPath(p: string): string {
  if (p.includes('?tab=metas')) return '/planejamento-mensal/metas';
  if (p.includes('?tab=analises')) return '/planejamento-mensal/analises';
  if (p.includes('?tab=visao-mensal')) return '/planejamento-mensal';
  const base = p.split('?')[0] ?? p;
  if (base === '/planejamento' || base === '/planejamento/') return '/planejamento-mensal';
  if (base === '/planejamento/visao-mensal') return '/planejamento-mensal';
  if (base === '/planejamento/metas') return '/planejamento-mensal/metas';
  if (base === '/planejamento/analises') return '/planejamento-mensal/analises';
  if (base === '/planejamento-anual/plano-anual') return '/planejamento-anual/plano2anos';
  if (base === '/planejamento-anual/plano-30-anos') return '/planejamento-anual/plano30anos';
  return p;
}

/** Path canónico para lookup (páginas + pathname actual). */
export function canonicalPathForPage(pathFromDb: string, slug?: string | null): string {
  const n = normalizedPath(pathFromDb);
  if (slug === 'simulador-fipe') return SIMULADOR_FIPE_PATH;
  return canonicalMenuPath(n);
}

/** Normaliza o pathname da barra de endereço para comparar com chaves do mapa. */
export function canonicalPathnameForLocation(pathname: string): string {
  return canonicalMenuPath(normalizedPath(pathname));
}
