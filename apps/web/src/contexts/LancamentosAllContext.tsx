import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useGlobalLancamentosQuery } from '@/hooks/useGlobalLancamentos';
import type { LancamentoRealizado } from '@/core/types/lancamentos';

export type LancamentosAllContextValue = {
  lancamentos: LancamentoRealizado[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
};

const LancamentosAllContext = createContext<LancamentosAllContextValue | null>(null);

/**
 * Monta **uma** subscrição React Query para `['lancamentos', userId, '__all__']`.
 * Filhos devem usar `useLancamentosAll()` em vez de `useLancamentosRealizados()` para leitura.
 */
export function LancamentosAllProvider({ children }: { children: ReactNode }) {
  const q = useGlobalLancamentosQuery();

  const value = useMemo<LancamentosAllContextValue>(
    () => ({
      lancamentos: q.data?.list ?? [],
      loading: q.isPending || (q.isFetching && !q.data),
      error: q.error ? 'Erro ao carregar lançamentos' : null,
      refetch: () => q.refetch(),
    }),
    [q.data, q.error, q.isPending, q.isFetching, q.refetch]
  );

  return (
    <LancamentosAllContext.Provider value={value}>{children}</LancamentosAllContext.Provider>
  );
}

export function useLancamentosAll(): LancamentosAllContextValue {
  const ctx = useContext(LancamentosAllContext);
  if (!ctx) {
    throw new Error('useLancamentosAll must be used within LancamentosAllProvider');
  }
  return ctx;
}
