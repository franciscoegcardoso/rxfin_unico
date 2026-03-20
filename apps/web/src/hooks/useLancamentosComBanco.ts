import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Lancamento, LancamentoRowState } from '@/types/consolidar'
import type { PeriodFilterValue } from '@/components/shared/CategoryAssignmentFilters'

export type LancamentosSource = 'bank' | 'card'

/** Converte seletor do modal → YYYY-MM para a RPC; null = sem filtro de mês na RPC. */
export function periodoToReferenceMonth(period: PeriodFilterValue): string | null {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const toYYYYMM = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  switch (period) {
    case 'this_month':
      return toYYYYMM(now)
    case 'last_month': {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 1)
      return toYYYYMM(d)
    }
    default:
      return null
  }
}

function filterByPeriodo(data: Lancamento[], period: PeriodFilterValue): Lancamento[] {
  if (period === 'this_month' || period === 'last_month') return data
  const now = new Date()
  const cutoffISO = (monthsBack: number): string => {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  switch (period) {
    case 'last_2_months':
      return data.filter((t) => t.tx_date >= cutoffISO(2))
    case 'last_3_months':
      return data.filter((t) => t.tx_date >= cutoffISO(3))
    case 'last_6_months':
      return data.filter((t) => t.tx_date >= cutoffISO(6))
    case 'all':
    default:
      return data
  }
}

function rpcLimitForPeriod(period: PeriodFilterValue, referenceMonth: string | null): number {
  if (referenceMonth != null) return 800
  if (period === 'all') return 2000
  return 5000
}

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
    is_internal_transfer: Boolean(r.is_internal_transfer),
  }
}

const BATCH_RPC = 40

export function useLancamentosComBanco(
  source: LancamentosSource,
  period: PeriodFilterValue,
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient()
  const enabled = options?.enabled !== false
  const referenceMonth = periodoToReferenceMonth(period)
  const limit = rpcLimitForPeriod(period, referenceMonth)

  const {
    data: rawRows = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['lancamentos-com-banco', source, period, referenceMonth, limit],
    queryFn: async () => {
      const { data, error: err } = await supabase.rpc('get_lancamentos_com_banco', {
        p_source_filter: source,
        p_reference_month: referenceMonth,
        p_limit: limit,
        p_offset: 0,
      })
      if (err) throw err
      const rows = (data ?? []) as Record<string, unknown>[]
      return rows.map(normalizeRow)
    },
    enabled,
  })

  const data = useMemo(() => filterByPeriodo(rawRows, period), [rawRows, period])

  const initialRowStates = useMemo(() => {
    const map: Record<string, LancamentoRowState> = {}
    data.forEach((row) => {
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
  }, [data])

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

  const toggleConfirmada = useCallback((transactionId: string) => {
    setRowStates((prev) => {
      const current = prev[transactionId]
      if (!current) return prev
      if (!current.categoria_id && !current.grupo_id) return prev
      return {
        ...prev,
        [transactionId]: {
          ...current,
          confirmada: !current.confirmada,
          dirty: true,
        },
      }
    })
  }, [])

  const pendingCount = useMemo(() => data.filter((r) => r.is_pending).length, [data])

  const dirtyCount = useMemo(
    () => Object.values(rowStates).filter((s) => s.dirty).length,
    [rowStates]
  )

  const saveAll = useCallback(async (): Promise<{ totalUpdated: number }> => {
    const dirtyEntries = Object.entries(rowStates).filter(([, s]) => {
      if (!s.dirty) return false
      if (s.is_income) return !!(s.categoria_id && s.categoria_nome)
      return !!((s.categoria_id || s.grupo_id) && (s.categoria_nome || s.grupo_nome))
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
      const { data: rpcData, error: rpcError } = await supabase.rpc('apply_batch_categories', {
        p_items: chunk,
      })
      if (rpcError) throw rpcError
      const n = (rpcData as { updated?: number } | null)?.updated
      totalUpdated += typeof n === 'number' ? n : chunk.length
    }

    // Criar regras por estabelecimento (store_category_rules) para memória persistente
    const txToStore = new Map(data.map((r) => [r.transaction_id, r.estabelecimento]))
    const storeToRule = new Map<string, { category_id: string; category_name: string }>()
    for (const [, s] of dirtyEntries) {
      const storeName = txToStore.get(s.transaction_id)
      if (!storeName) continue
      const catId = (s.is_income ? s.categoria_id : s.categoria_id ?? s.grupo_id) ?? ''
      const catName = (s.is_income ? s.categoria_nome : s.categoria_nome ?? s.grupo_nome) ?? ''
      if (catId && catName && !storeToRule.has(storeName)) {
        storeToRule.set(storeName, { category_id: catId, category_name: catName })
      }
    }
    for (const [storeName, rule] of storeToRule) {
      await supabase.rpc('bulk_assign_category_by_store', {
        p_store_name: storeName,
        p_category_id: rule.category_id,
        p_category_name: rule.category_name,
        p_apply_historical: false,
        p_source_filter: source,
      })
    }

    await queryClient.invalidateQueries({ queryKey: ['lancamentos-com-banco'] })
    await refetch()
    return { totalUpdated }
  }, [rowStates, data, source, queryClient, refetch])

  const reset = useCallback(() => {
    setRowStates(initialRowStates)
  }, [initialRowStates])

  return {
    data,
    rowStates,
    pendingCount,
    dirtyCount,
    isLoading,
    isFetching,
    error: error ?? null,
    setCategory,
    toggleConfirmada,
    saveAll,
    reset,
    refetch,
  }
}
