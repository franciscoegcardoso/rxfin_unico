import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import * as lancamentosService from '@/core/services/lancamentos';
import type { LancamentoRealizado } from '@/core/types/lancamentos';
import { STALE, lancamentosListQueryKey } from '@/hooks/queryKeys';

/** Mesmo formato interno que `useLancamentosRealizados` (lista completa, todos os meses). */
export type GlobalLancamentosQueryData = {
  mode: 'full';
  list: LancamentoRealizado[];
};

/**
 * Query única para lista completa de lançamentos (`mes_referencia` não filtrado).
 * queryKey: `['lancamentos', userId, '__all__']`
 *
 * Usar **uma vez** por árvore (p.ex. via `LancamentosAllProvider`) para não multiplicar observers no Início.
 */
export function useGlobalLancamentosQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<GlobalLancamentosQueryData, Error> {
  const { user } = useAuth();
  const uid = user?.id ?? '';
  const enabled = (options?.enabled ?? true) && !!user?.id;

  return useQuery({
    queryKey: lancamentosListQueryKey(uid || '__none__', null),
    queryFn: async (): Promise<GlobalLancamentosQueryData> => {
      if (!user?.id) return { mode: 'full', list: [] };
      const list = await lancamentosService.fetchLancamentos(user.id, undefined);
      return { mode: 'full', list };
    },
    enabled,
    staleTime: STALE.LANCAMENTOS,
    gcTime: STALE.GC_LANCAMENTOS,
  });
}
