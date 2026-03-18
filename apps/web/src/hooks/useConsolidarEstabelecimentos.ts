import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  ConsolidarEstabelecimento,
  ConsolidarRowState,
  BulkAssignResult,
  ConsolidarFilters,
  OcorrenciaDetalhe,
} from '@/types/consolidar';

export type SourceFilter = 'bank' | 'card' | null;

const DEFAULT_FILTERS: ConsolidarFilters = {
  search: '',
  bancos: [],
  fonte: [],
  grupoCategoria: null,
  semCategoria: false,
  naoConfirmados: false,
  dateFrom: null,
  dateTo: null,
};

/** Normaliza resposta da RPC para o formato v2 (compatível com resposta antiga). */
function normalizeRow(row: Record<string, unknown>): ConsolidarEstabelecimento {
  const todas_as_datas = (row.todas_as_datas as string[] | undefined) ?? [];
  const total_gasto = (row.total_gasto as number) ?? 0;
  const total_ocorrencias = (row.total_ocorrencias as number) ?? 0;
  const fonte = (row.fonte as 'bank' | 'card') ?? 'bank';
  const ocorrencias_detalhe = (row.ocorrencias_detalhe as OcorrenciaDetalhe[] | undefined);
  const hasNewFormat = Array.isArray(ocorrencias_detalhe);

  const builtOcorrencias: OcorrenciaDetalhe[] = hasNewFormat
    ? ocorrencias_detalhe
    : todas_as_datas.map((date) => ({
        date,
        amount: total_ocorrencias > 0 ? total_gasto / total_ocorrencias : 0,
        banco: '',
        account_name: null,
        fonte,
        transaction_type: 'despesa' as const,
      }));

  const valor_total = (row.valor_total as number) ?? total_gasto;
  const valor_medio = (row.valor_medio as number) ?? (total_ocorrencias > 0 ? valor_total / total_ocorrencias : 0);
  const transaction_type = (row.transaction_type as 'despesa' | 'receita') ?? 'despesa';
  const bancos = (row.bancos as string[]) ?? [];
  const bancos_detalhe = (row.bancos_detalhe as ConsolidarEstabelecimento['bancos_detalhe']) ?? [];

  return {
    estabelecimento: (row.estabelecimento as string) ?? '',
    transaction_type,
    total_ocorrencias,
    ultima_compra: (row.ultima_compra as string) ?? '',
    ocorrencias_detalhe: builtOcorrencias,
    categoria_id_atual: (row.categoria_id_atual as string | null) ?? null,
    categoria_nome_atual: (row.categoria_nome_atual as string | null) ?? null,
    grupo_categoria_id: (row.grupo_categoria_id as string | null) ?? null,
    grupo_categoria_nome: (row.grupo_categoria_nome as string | null) ?? null,
    alguma_confirmada: (row.alguma_confirmada as boolean) ?? false,
    total_pendentes: (row.total_pendentes as number) ?? 0,
    valor_total,
    valor_medio,
    fonte: (row.fonte as 'bank' | 'card' | 'mixed') ?? fonte,
    bancos,
    bancos_detalhe,
    ai_sugestao_categoria: (row.ai_sugestao_categoria as string | null) ?? null,
    ai_sugestao_id: (row.ai_sugestao_id as string | null) ?? null,
  };
}

export function useConsolidarEstabelecimentos(
  sourceFilter: SourceFilter,
  filters: ConsolidarFilters = DEFAULT_FILTERS
) {
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
      const rows = (data ?? []) as Record<string, unknown>[];
      return rows.map(normalizeRow);
    },
    enabled: true,
  });

  const initialRowStates = useMemo(() => {
    const map: Record<string, ConsolidarRowState> = {};
    rawData.forEach((row) => {
      const prefillCatId = row.ai_sugestao_id && !row.categoria_id_atual ? null : row.categoria_id_atual;
      const prefillCatNome = row.ai_sugestao_id && !row.categoria_nome_atual ? null : row.categoria_nome_atual;
      map[row.estabelecimento] = {
        estabelecimento: row.estabelecimento,
        grupo_id: row.grupo_categoria_id ?? null,
        grupo_nome: row.grupo_categoria_nome ?? null,
        categoria_id: prefillCatId ?? null,
        categoria_nome: prefillCatNome ?? null,
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
    (
      estabelecimento: string,
      grupoId: string | null,
      grupoNome: string | null,
      categoriaId: string | null,
      categoriaNome: string | null
    ) => {
      setRowStates((prev) => {
        const current = prev[estabelecimento];
        if (!current) return prev;
        return {
          ...prev,
          [estabelecimento]: {
            ...current,
            grupo_id: grupoId,
            grupo_nome: grupoNome,
            categoria_id: categoriaId,
            categoria_nome: categoriaNome,
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

  const filteredData = useMemo(() => {
    let list = [...rawData];
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter((r) => r.estabelecimento.toLowerCase().includes(q));
    }
    if (filters.bancos.length > 0) {
      list = list.filter((r) => r.bancos.some((b) => filters.bancos.includes(b)));
    }
    if (filters.fonte.length > 0) {
      list = list.filter((r) => filters.fonte.includes(r.fonte));
    }
    if (filters.grupoCategoria) {
      list = list.filter((r) => r.grupo_categoria_nome === filters.grupoCategoria);
    }
    if (filters.semCategoria) {
      list = list.filter((r) => r.total_pendentes > 0);
    }
    if (filters.naoConfirmados) {
      list = list.filter((r) => !r.alguma_confirmada);
    }
    if (filters.dateFrom) {
      list = list.filter((r) => r.ultima_compra >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      list = list.filter((r) => r.ultima_compra <= filters.dateTo!);
    }
    return list;
  }, [rawData, filters]);

  const saveAll = useCallback(async (): Promise<{ totalUpdated: number }> => {
    let totalUpdated = 0;
    const dirtyEntries = Object.entries(rowStates).filter(([, s]) => {
      if (!s.dirty) return false;
      const effectiveId = s.categoria_id ?? s.grupo_id;
      const effectiveName = s.categoria_nome ?? s.grupo_nome;
      return !!(effectiveId && effectiveName);
    });
    for (const [storeName, state] of dirtyEntries) {
      const p_category_id = state.categoria_id ?? state.grupo_id!;
      const p_category_name = state.categoria_nome ?? state.grupo_nome!;
      try {
        const { data, error: rpcError } = await supabase.rpc('bulk_assign_category_by_store', {
          p_store_name: storeName,
          p_category_id,
          p_category_name,
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
    filteredData,
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
