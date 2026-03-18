import { useMemo, useEffect, useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as lancamentosService from '@/core/services/lancamentos';
import type { LancamentoRealizado, LancamentoInput } from '@/core/types/lancamentos';
import {
  STALE,
  lancamentosListQueryKey,
  lancamentosPaginatedQueryKey,
  lancamentosQueryFilter,
} from '@/hooks/queryKeys';

export type { LancamentoRealizado, LancamentoInput };

const PAGE_SIZE = 50;

export type UseLancamentosRealizadosOptions = {
  paginated?: boolean;
  pageSize?: number;
  mesReferencia?: string | null;
};

type LancamentosQueryResult =
  | { mode: 'full'; list: LancamentoRealizado[] }
  | { mode: 'paginated'; list: LancamentoRealizado[]; count: number };

export function useLancamentosRealizados(options: UseLancamentosRealizadosOptions = {}) {
  const { paginated = false, pageSize = PAGE_SIZE, mesReferencia } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);

  const uid = user?.id ?? '';

  useEffect(() => {
    setPage(0);
  }, [mesReferencia]);

  const queryKey = useMemo(
    () =>
      paginated && uid
        ? lancamentosPaginatedQueryKey(uid, page, pageSize, mesReferencia)
        : lancamentosListQueryKey(uid || '__none__'),
    [paginated, uid, page, pageSize, mesReferencia]
  );

  const { data, isPending, isFetching, error: queryError } = useQuery({
    queryKey,
    queryFn: async (): Promise<LancamentosQueryResult> => {
      if (!user?.id) {
        return paginated ? { mode: 'paginated', list: [], count: 0 } : { mode: 'full', list: [] };
      }
      if (paginated) {
        const { data: rows, count } = await lancamentosService.fetchLancamentosPaginated(
          user.id,
          page,
          pageSize,
          mesReferencia ?? undefined
        );
        return { mode: 'paginated', list: rows, count };
      }
      const list = await lancamentosService.fetchLancamentos(user.id);
      return { mode: 'full', list };
    },
    enabled: !!user?.id,
    staleTime: STALE.LANCAMENTOS,
    gcTime: STALE.GC_LANCAMENTOS,
  });

  const invalidateLancamentos = useCallback(async () => {
    if (!user?.id) return;
    await queryClient.invalidateQueries(lancamentosQueryFilter(user.id));
  }, [queryClient, user?.id]);

  const lancamentos =
    data?.mode === 'full' ? data.list : data?.mode === 'paginated' ? data.list : [];
  const totalCount = data?.mode === 'paginated' ? data.count : data?.mode === 'full' ? data.list.length : 0;
  const loading = isPending || (isFetching && !data);
  const error = queryError ? 'Erro ao carregar lançamentos' : null;

  const fetchLancamentos = useCallback(
    async (pageIndex?: number) => {
      if (paginated && pageIndex !== undefined) setPage(pageIndex);
      await invalidateLancamentos();
    },
    [paginated, invalidateLancamentos]
  );

  const addLancamento = async (input: LancamentoInput) => {
    if (!user) {
      toast.error('Utilizador não autenticado');
      return null;
    }
    try {
      await lancamentosService.createLancamentoRpc({
        p_tipo: input.tipo,
        p_categoria: input.categoria,
        p_nome: input.nome,
        p_valor_previsto: input.valor_previsto,
        p_mes_referencia: input.mes_referencia,
        p_valor_realizado: input.valor_realizado ?? null,
        p_data_vencimento: input.data_vencimento ?? null,
        p_data_pagamento: input.data_pagamento ?? null,
        p_forma_pagamento: input.forma_pagamento ?? null,
        p_observacoes: input.observacoes ?? null,
        p_category_id: input.category_id ?? null,
      });
      await invalidateLancamentos();
      toast.success('Lançamento criado');
      return {} as LancamentoRealizado;
    } catch (err) {
      console.error('Error adding lancamento:', err);
      toast.error('Erro ao adicionar lançamento');
      return null;
    }
  };

  const addMultipleLancamentos = async (inputs: LancamentoInput[]) => {
    if (!user) {
      toast.error('Utilizador não autenticado');
      return false;
    }
    try {
      const safeInputs = inputs.map((input) => ({
        ...input,
        valor_realizado: input.valor_realizado ?? input.valor_previsto,
      }));
      await lancamentosService.createMultipleLancamentos(user.id, safeInputs);
      await invalidateLancamentos();
      toast.success(`${inputs.length} lançamento(s) consolidado(s) com sucesso`);
      return true;
    } catch (err) {
      console.error('Error adding multiple lancamentos:', err);
      toast.error('Erro ao consolidar lançamentos');
      return false;
    }
  };

  const updateLancamento = async (id: string, updates: Partial<LancamentoInput>) => {
    try {
      const p_data: Record<string, unknown> = {};
      if (updates.nome !== undefined) p_data.nome = updates.nome;
      if (updates.valor_previsto !== undefined) p_data.valor_previsto = updates.valor_previsto;
      if (updates.valor_realizado !== undefined) p_data.valor_realizado = updates.valor_realizado;
      if (updates.categoria !== undefined) p_data.categoria = updates.categoria;
      if (updates.data_vencimento !== undefined) p_data.data_vencimento = updates.data_vencimento;
      if (updates.data_pagamento !== undefined) p_data.data_pagamento = updates.data_pagamento;
      if (updates.forma_pagamento !== undefined) p_data.forma_pagamento = updates.forma_pagamento;
      if (updates.observacoes !== undefined) p_data.observacoes = updates.observacoes;
      await lancamentosService.updateLancamentoRpc(id, p_data as never);
      await invalidateLancamentos();
      toast.success('Lançamento atualizado');
      return {} as LancamentoRealizado;
    } catch (err) {
      console.error('Error updating lancamento:', err);
      toast.error('Erro ao atualizar lançamento');
      return null;
    }
  };

  const deleteLancamento = async (id: string) => {
    try {
      await lancamentosService.deleteLancamento(id);
      await invalidateLancamentos();
      toast.success('Lançamento removido');
      return true;
    } catch (err) {
      console.error('Error deleting lancamento:', err);
      toast.error('Erro ao remover lançamento');
      return false;
    }
  };

  const softDeleteLancamento = async (id: string) => {
    try {
      await lancamentosService.softDeleteLancamentoRpc(id);
      await invalidateLancamentos();
      toast.success('Lançamento movido para a lixeira');
      return true;
    } catch (err) {
      console.error('Error soft deleting lancamento:', err);
      toast.error('Erro ao excluir lançamento');
      return false;
    }
  };

  const markLancamentoPaid = async (id: string, paid: boolean) => {
    try {
      await lancamentosService.markLancamentoPaidRpc(id, paid);
      await invalidateLancamentos();
      toast.success(paid ? 'Marcado como pago/recebido' : 'Desmarcado');
      return true;
    } catch (err) {
      console.error('Error marking lancamento paid:', err);
      toast.error('Falha ao atualizar status');
      return false;
    }
  };

  const markLancamentoPaidWithValues = async (
    id: string,
    valorRealizado: number,
    dataPagamento: string,
    formaPagamento: string
  ) => {
    try {
      await lancamentosService.markLancamentoPaidWithValuesRpc({
        p_id: id,
        p_valor_realizado: valorRealizado,
        p_data_pagamento: dataPagamento,
        p_forma_pagamento: formaPagamento,
      });
      await invalidateLancamentos();
      toast.success('Lançamento atualizado com valor e data');
      return true;
    } catch (err) {
      console.error('Error marking lancamento paid with values:', err);
      toast.error('Falha ao registrar pagamento');
      return false;
    }
  };

  const duplicateLancamentoNextMonth = async (id: string) => {
    try {
      const created = await lancamentosService.duplicateLancamentoNextMonthRpc(id);
      await invalidateLancamentos();
      if (created) {
        toast.success('Lançamento duplicado para o próximo mês');
        return created;
      }
      toast.success('Lançamento duplicado para o próximo mês');
      return null;
    } catch (err) {
      console.error('Error duplicating lancamento:', err);
      toast.error('Erro ao duplicar lançamento');
      return null;
    }
  };

  const updateFriendlyName = async (id: string, friendlyName: string): Promise<boolean> => {
    try {
      await lancamentosService.updateFriendlyName(id, friendlyName);
      await invalidateLancamentos();
      return true;
    } catch (err) {
      console.error('Error updating friendly name:', err);
      toast.error('Erro ao atualizar nome amigável');
      return false;
    }
  };

  const getLancamentosByMonth = (mes: string) => lancamentos.filter((l) => l.mes_referencia === mes);
  const isMonthConsolidated = (mes: string) => lancamentos.some((l) => l.mes_referencia === mes);
  const totalPages = paginated && pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1;

  return {
    lancamentos,
    loading,
    error,
    fetchLancamentos,
    addLancamento,
    addMultipleLancamentos,
    updateLancamento,
    updateFriendlyName,
    deleteLancamento,
    softDeleteLancamento,
    markLancamentoPaid,
    markLancamentoPaidWithValues,
    duplicateLancamentoNextMonth,
    getLancamentosByMonth,
    isMonthConsolidated,
    ...(paginated && {
      page,
      setPage,
      totalCount,
      totalPages,
      pageSize,
    }),
  };
}
