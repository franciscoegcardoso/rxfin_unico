import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Lancamento, LancamentoRowState } from '@/types/consolidar'

export type LancamentosSource = 'bank' | 'card'

function normalizeRow(r: Record<string, unknown>): Lancamento {
  const isIncome = Boolean(r.is_income)
  return {
    transaction_id: String(r.transaction_id),
    tx_date: String(r.tx_date ?? '').slice(0, 10),
    estabelecimento: String(r.estabelecimento ?? ''),
    amount: Number(r.amount) || 0,
    transaction_type: r.transaction_type === 'receita' ? 'receita' : 'despesa',
    connector_name: String(r.connector_name ?? '—'),
    connector_image_url: (r.connector_image_url as string | null) ?? null,
    account_name: (r.account_name as string | null) ?? null,
    grupo_categoria_id: (r.grupo_categoria_id as string | null) ?? null,
    grupo_categoria_nome: (r.grupo_categoria_nome as string | null) ?? null,
    categoria_id: (r.categoria_id as string | null) ?? null,
    categoria_nome: (r.categoria_nome as string | null) ?? null,
    is_category_confirmed: Boolean(r.is_category_confirmed),
    ai_sugestao_categoria: (r.ai_sugestao_categoria as string | null) ?? null,
    ai_sugestao_id: (r.ai_sugestao_id as string | null) ?? null,
    is_pending: Boolean(r.is_pending),
    is_income: isIncome,
    card_id: r.card_id ? String(r.card_id) : null,
  }
}

const BATCH_RPC = 40

export function useLancamentosComBanco(
  source: LancamentosSource,
  dateFrom: string | null,
  dateTo: string | null,
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient()
  const enabled = options?.enabled !== false

  const {
    data: rawData = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['lancamentos-com-banco', source, dateFrom, dateTo],
    queryFn: async () => {
      const { data, error: err } = await supabase.rpc('get_lancamentos_com_banco', {
        p_source: source,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
      })
      if (err) throw err
      const rows = (data ?? []) as Record<string, unknown>[]
      return rows.map(normalizeRow)
    },
    enabled,
  })

  const initialRowStates = useMemo(() => {
    const map: Record<string, LancamentoRowState> = {}
    rawData.forEach((row) => {
      const aiOnlyExpense =
        !row.is_income &&
        Boolean(row.ai_sugestao_id) &&
        !row.grupo_categoria_id &&
        !row.categoria_id
      map[row.transaction_id] = {
        transaction_id: row.transaction_id,
        grupo_id: row.is_income ? null : aiOnlyExpense ? null : row.grupo_categoria_id,
        grupo_nome: row.is_income ? null : aiOnlyExpense ? null : row.grupo_categoria_nome,
        categoria_id: row.is_income
          ? row.categoria_id
          : aiOnlyExpense
            ? null
            : row.categoria_id,
        categoria_nome: row.is_income
          ? row.categoria_nome
          : aiOnlyExpense
            ? null
            : row.categoria_nome,
        dirty: false,
        confirmada: row.is_category_confirmed,
        is_income: row.is_income,
      }
    })
    return map
  }, [rawData])

  const [rowStates, setRowStates] = useState<Record<string, LancamentoRowState>>(initialRowStates)

  useEffect(() => {
    setRowStates(initialRowStates)
  }, [initialRowStates])

  const setCategory = useCallback(
    (
      transactionId: string,
      grupoId: string | null,
      grupoNome: string | null,
      categoriaId: string | null,
      categoriaNome: string | null
    ) => {
      setRowStates((prev) => {
        const current = prev[transactionId]
        if (!current) return prev
        return {
          ...prev,
          [transactionId]: {
            ...current,
            grupo_id: current.is_income ? null : grupoId,
            grupo_nome: current.is_income ? null : grupoNome,
            categoria_id: categoriaId,
            categoria_nome: categoriaNome,
            dirty: true,
          },
        }
      })
    },
    []
  )

  const pendingCount = useMemo(() => rawData.filter((r) => r.is_pending).length, [rawData])

  const dirtyCount = useMemo(
    () => Object.values(rowStates).filter((s) => s.dirty).length,
    [rowStates]
  )

  const saveAll = useCallback(async (): Promise<{ totalUpdated: number }> => {
    const dirtyEntries = Object.entries(rowStates).filter(([, s]) => {
      if (!s.dirty) return false
      const id = s.categoria_id ?? (!s.is_income ? s.grupo_id : null)
      const name = s.categoria_nome ?? (!s.is_income ? s.grupo_nome : null)
      return !!(id && name)
    })

    const items = dirtyEntries.map(([, s]) => ({
      transaction_id: s.transaction_id,
      group_category_id: s.is_income ? null : s.grupo_id,
      group_category_name: s.is_income ? null : s.grupo_nome,
      category_id: (s.is_income ? s.categoria_id : s.categoria_id ?? s.grupo_id) as string,
      category_name: (s.is_income ? s.categoria_nome : s.categoria_nome ?? s.grupo_nome) as string,
    }))

    let totalUpdated = 0
    for (let i = 0; i < items.length; i += BATCH_RPC) {
      const chunk = items.slice(i, i + BATCH_RPC)
      const { data, error: rpcError } = await supabase.rpc('apply_batch_categories', {
        p_items: chunk,
      })
      if (rpcError) throw rpcError
      const n = (data as { updated?: number } | null)?.updated
      totalUpdated += typeof n === 'number' ? n : chunk.length
    }

    await queryClient.invalidateQueries({ queryKey: ['lancamentos-com-banco', source] })
    await refetch()
    return { totalUpdated }
  }, [rowStates, queryClient, refetch, source])

  const reset = useCallback(() => {
    setRowStates(initialRowStates)
  }, [initialRowStates])

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
  }
}
