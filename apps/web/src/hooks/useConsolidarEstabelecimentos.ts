import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  ConsolidarEstabelecimento,
  ConsolidarRowState,
  BulkAssignResult,
} from '@/types/consolidar';

export type SourceFilter = 'bank' | 'card' | null;

export function useConsolidarEstabelecimentos(sourceFilter: SourceFilter) {
  const queryClient = useQueryClient();

  const {
    data: rawData = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['consolidar-estabelecimentos', sourceFilter],
    queryFn: async () => {
      const { data, error: err } = await supabase.rpc('get_consolidar_estabelecimentos', {
        p_source_filter: sourceFilter,
      });
      if (err) throw err;
      return (data ?? []) as ConsolidarEstabelecimento[];
    },
    enabled: true,
  });

  const initialRowStates = useMemo(() => {
    const map: Record<string, ConsolidarRowState> = {};
    rawData.forEach((row) => {
      const prefillId = row.ai_sugestao_id && !row.categoria_id_atual ? null : row.categoria_id_atual;
      const prefillNome = row.ai_sugestao_id && !row.categoria_nome_atual ? null : row.categoria_nome_atual;
      map[row.estabelecimento] = {
        estabelecimento: row.estabelecimento,
        categoria_id: prefillId ?? null,
        categoria_nome: prefillNome ?? null,
        dirty: false,
        confirmada: row.total_pendentes === 0,
      };
    });
    return map;
  }, [rawData]);

  const [rowStates, setRowStates] = useState<Record<string, ConsolidarRowState>>(initialRowStates);

  useEffect(() => {
    setRowStates(initialRowStates);
  }, [initialRowStates]);

  const setCategory = useCallback(
    (estabelecimento: string, categoryId: string, categoryName: string) => {
      setRowStates((prev) => {
        const current = prev[estabelecimento];
        if (!current) return prev;
        return {
          ...prev,
          [estabelecimento]: {
            ...current,
            categoria_id: categoryId,
            categoria_nome: categoryName,
            dirty: true,
          },
        };
      });
    },
    []
  );

  const pendingCount = useMemo(() => {
    return rawData.filter((r) => r.total_pendentes > 0).length;
  }, [rawData]);

  const dirtyCount = useMemo(() => {
    return Object.values(rowStates).filter((s) => s.dirty).length;
  }, [rowStates]);

  const saveAll = useCallback(async (): Promise<{ totalUpdated: number }> => {
    let totalUpdated = 0;
    const dirtyEntries = Object.entries(rowStates).filter(([, s]) => s.dirty && s.categoria_id && s.categoria_nome);
    for (const [storeName, state] of dirtyEntries) {
      try {
        const { data, error: rpcError } = await supabase.rpc('bulk_assign_category_by_store', {
          p_store_name: storeName,
          p_category_id: state.categoria_id!,
          p_category_name: state.categoria_nome!,
          p_apply_historical: true,
          p_source_filter: sourceFilter,
        });
        if (rpcError) throw rpcError;
        const result = data as BulkAssignResult | null;
        if (result?.updated_transactions) totalUpdated += result.updated_transactions;
      } catch {
        // continue with other rows
      }
    }
    await queryClient.invalidateQueries({ queryKey: ['consolidar-estabelecimentos', sourceFilter] });
    await refetch();
    return { totalUpdated };
  }, [rowStates, sourceFilter, queryClient, refetch]);

  const reset = useCallback(() => {
    setRowStates(initialRowStates);
  }, [initialRowStates]);

  return {
    data: rawData,
    rowStates,
    pendingCount,
    dirtyCount,
    isLoading,
    error: error ?? null,
    setCategory,
    saveAll,
    reset,
    refetch,
  };
}
