import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  CreditCard,
  CheckSquare,
  RotateCcw,
  Save,
  Zap,
  AlertTriangle,
  Trash2,
} from 'lucide-react'
import { useLancamentosComBanco, type LancamentosSource } from '@/hooks/useLancamentosComBanco'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import type { LancamentoFilters } from '@/types/consolidar'
import { BancoLogo } from '@/components/shared/BancoLogo'
import { useUserCategories } from '@/hooks/useUserCategories'
import type {
  PeriodFilterValue,
  StatusFilterValue,
} from '@/components/shared/CategoryAssignmentFilters'

const defaultFilters: LancamentoFilters = {
  search: '',
  bancos: [],
  semCategoria: false,
  naoConfirmados: false,
  dateFrom: null,
  dateTo: null,
}

const formatDate = (iso: string) => {
  if (!iso) return '—'
  const dateOnly = iso.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return iso
  try {
    return format(parseISO(dateOnly), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    const [y, m, d] = dateOnly.split('-')
    return `${d}/${m}/${y}`
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(
    Math.abs(value)
  )

function bancoKey(row: { connector_name: string; account_name: string | null }) {
  return row.account_name ? `${row.connector_name}|${row.account_name}` : row.connector_name
}

export interface LancamentosTabProps {
  source: LancamentosSource
  period: PeriodFilterValue
  categories: { id: string; name: string }[]
  statusFilter: StatusFilterValue
  bankOrCardValue: string
  categoryFilterValue: string
  onSaveComplete: (rowsUpdated: number, rpcUpdates: number) => void
  onClose?: () => void
  requestCloseRef?: React.RefObject<(() => void) | null>
  enabled?: boolean
}

export function LancamentosTab({
  source,
  period,
  categories,
  statusFilter,
  bankOrCardValue,
  categoryFilterValue,
  onSaveComplete,
  onClose,
  requestCloseRef,
  enabled = true,
}: LancamentosTabProps) {
  const [filters, setFilters] = useState<LancamentoFilters>(defaultFilters)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [bulkGrupoId, setBulkGrupoId] = useState('')
  const [bulkCatId, setBulkCatId] = useState('')
  const [bulkIncomeId, setBulkIncomeId] = useState('')
  const [massSubcats, setMassSubcats] = useState<{ id: string; name: string }[]>([])
  const [isMassAssigning, setIsMassAssigning] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)

  const {
    data,
    rowStates,
    pendingCount,
    dirtyCount,
    isLoading,
    isFetching,
    setCategory,
    saveAll,
    reset,
    refetch,
  } = useLancamentosComBanco(source, period, { enabled })

  const { data: userCats } = useUserCategories()

  const expenseGroups = categories

  useEffect(() => {
    if (!bulkGrupoId || !userCats?.expenseGroups) {
      setMassSubcats([])
      setBulkCatId('')
      return
    }
    const grupoNome = categories.find((c) => c.id === bulkGrupoId)?.name ?? ''
    const group = userCats.expenseGroups.find((g) => g.category_name === grupoNome)
    setMassSubcats(group?.items ?? [])
    setBulkCatId('')
  }, [bulkGrupoId, categories, userCats])

  const uniqueBancos = useMemo(() => {
    const set = new Set<string>()
    data.forEach((r) => set.add(bancoKey(r)))
    return Array.from(set).sort()
  }, [data])

  const filteredData = useMemo(() => {
    let list = [...data]
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim()
      list = list.filter((r) => r.estabelecimento.toLowerCase().includes(q))
    }
    if (filters.bancos.length > 0) {
      list = list.filter((r) => filters.bancos.includes(bancoKey(r)))
    }
    if (bankOrCardValue !== 'all') {
      if (source === 'bank') {
        list = list.filter(
          (r) =>
            r.connector_name === bankOrCardValue ||
            r.account_name === bankOrCardValue ||
            `${r.connector_name} · ${r.account_name ?? ''}`.includes(bankOrCardValue)
        )
      } else {
        list = list.filter((r) => r.card_id === bankOrCardValue)
      }
    }
    if (categoryFilterValue !== 'all') {
      list = list.filter((r) => (r.categoria_nome ?? '').trim() === categoryFilterValue)
    }
    if (statusFilter === 'pending') list = list.filter((r) => r.is_pending)
    else if (statusFilter === 'confirmed') list = list.filter((r) => !r.is_pending)
    if (filters.semCategoria) list = list.filter((r) => r.is_pending)
    if (filters.naoConfirmados) list = list.filter((r) => !r.is_category_confirmed)
    if (filters.dateFrom) list = list.filter((r) => r.tx_date >= filters.dateFrom!)
    if (filters.dateTo) list = list.filter((r) => r.tx_date <= filters.dateTo!)
    return list
  }, [data, filters, statusFilter, bankOrCardValue, categoryFilterValue, source])

  const sortedRows = useMemo(() => {
    const list = [...filteredData]
    list.sort((a, b) => {
      const sa = rowStates[a.transaction_id]
      const sb = rowStates[b.transaction_id]
      const pa = a.is_pending ? 1 : 0
      const pb = b.is_pending ? 1 : 0
      if (pa !== pb) return pb - pa
      const da = sa?.dirty ? 1 : 0
      const db = sb?.dirty ? 1 : 0
      if (da !== db) return db - da
      return b.tx_date.localeCompare(a.tx_date)
    })
    return list
  }, [filteredData, rowStates])

  const totalRows = data.length
  const categorizados = data.filter((r) => {
    const s = rowStates[r.transaction_id]
    return (s?.categoria_id ?? s?.grupo_id ?? null) != null || r.is_category_confirmed
  }).length

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedRows.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(sortedRows.map((r) => r.transaction_id)))
  }

  const getItemsForGroup = (grupoNome: string | null) => {
    if (!grupoNome || !userCats?.expenseGroups) return []
    const group = userCats.expenseGroups.find((g) => g.category_name === grupoNome)
    return group?.items ?? []
  }

  const grupoForExpenseItemId = useCallback(
    (itemId: string | null) => {
      if (!itemId || !userCats?.expenseGroups) return null
      for (const g of userCats.expenseGroups) {
        const item = g.items.find((i) => i.id === itemId)
        if (item) return { id: g.category_id, name: g.category_name }
      }
      return null
    },
    [userCats]
  )

  const handleRequestClose = useCallback(() => {
    if (dirtyCount > 0) setShowExitDialog(true)
    else onClose?.()
  }, [dirtyCount, onClose])

  useEffect(() => {
    if (requestCloseRef) requestCloseRef.current = handleRequestClose
    return () => {
      if (requestCloseRef) requestCloseRef.current = null
    }
  }, [requestCloseRef, handleRequestClose])

  const selectedRows = useMemo(
    () => sortedRows.filter((r) => selectedIds.has(r.transaction_id)),
    [sortedRows, selectedIds]
  )
  const selectionAllIncome =
    selectedRows.length > 0 && selectedRows.every((r) => rowStates[r.transaction_id]?.is_income)
  const selectionAllExpense =
    selectedRows.length > 0 && selectedRows.every((r) => !rowStates[r.transaction_id]?.is_income)
  const selectionHomogeneous = selectionAllIncome || selectionAllExpense

  const handleMassAssign = async () => {
    if (selectedIds.size < 2 || !selectionHomogeneous) return
    const ids = Array.from(selectedIds)
    setIsMassAssigning(true)
    try {
      if (selectionAllIncome) {
        if (!bulkIncomeId) return
        const name = userCats?.incomeItems.find((i) => i.id === bulkIncomeId)?.name ?? ''
        const items = ids.map((transaction_id) => ({
          transaction_id,
          group_category_id: null,
          group_category_name: null,
          category_id: bulkIncomeId,
          category_name: name,
        }))
        const { error } = await supabase.rpc('apply_batch_categories', { p_items: items })
        if (error) throw error
        toast.success(`Categoria aplicada em ${ids.length} lançamento(s)`)
        await refetch()
      } else {
        if (!bulkGrupoId) return
        const grupoNome = categories.find((c) => c.id === bulkGrupoId)?.name ?? ''
        const finalCatId = bulkCatId || bulkGrupoId
        const finalCatNome = bulkCatId
          ? massSubcats.find((s) => s.id === bulkCatId)?.name ?? grupoNome
          : grupoNome
        const items = ids.map((transaction_id) => ({
          transaction_id,
          group_category_id: bulkGrupoId,
          group_category_name: grupoNome,
          category_id: finalCatId,
          category_name: finalCatNome,
        }))
        const { error } = await supabase.rpc('apply_batch_categories', { p_items: items })
        if (error) throw error
        toast.success(`Categoria aplicada em ${ids.length} lançamento(s)`)
        await refetch()
      }
      setSelectedIds(new Set())
      setBulkGrupoId('')
      setBulkCatId('')
      setBulkIncomeId('')
    } catch {
      toast.error('Não foi possível aplicar em massa.')
    } finally {
      setIsMassAssigning(false)
    }
  }

  const handleDiscard = () => {
    reset()
    setSelectedIds(new Set())
  }

  const handleSaveAll = async () => {
    if (dirtyCount === 0) return
    const n = dirtyCount
    setSaving(true)
    try {
      const { totalUpdated } = await saveAll()
      onSaveComplete(n, totalUpdated)
    } finally {
      setSaving(false)
    }
  }

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.bancos.length > 0 ||
    filters.semCategoria ||
    filters.naoConfirmados ||
    filters.dateFrom != null ||
    filters.dateTo != null

  const sourceLabel = source === 'bank' ? 'conta' : 'cartão'
  const showLoadingSkeleton = isLoading || (isFetching && data.length === 0)

  if (showLoadingSkeleton) {
    return (
      <div className="space-y-2 py-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (filteredData.length === 0) {
    const noDataInPeriod = data.length === 0
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
        <CheckCircle2
          className={cn('h-10 w-10', noDataInPeriod ? 'text-emerald-500' : 'text-muted-foreground')}
        />
        <p className="text-sm text-muted-foreground max-w-sm">
          {noDataInPeriod
            ? `Nenhum lançamento no período (${sourceLabel}).`
            : 'Nenhum lançamento corresponde aos filtros selecionados.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-0">
      <div className="shrink-0 mb-4 space-y-1">
        <p className="text-sm text-muted-foreground">
          {categorizados} de {totalRows} lançamentos com categoria · {pendingCount} pendentes
        </p>
        <Progress value={totalRows > 0 ? (categorizados / totalRows) * 100 : 0} className="h-2" />
        {dirtyCount > 0 && (
          <p className="text-xs text-muted-foreground">{dirtyCount} alteração(ões) não salva(s)</p>
        )}
      </div>

      <div className="shrink-0 mb-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar estabelecimento"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="h-8 w-40 text-xs"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              Banco {filters.bancos.length > 0 ? `(${filters.bancos.length})` : ''}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {uniqueBancos.map((b) => (
                <label key={b} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={filters.bancos.includes(b)}
                    onCheckedChange={(checked) =>
                      setFilters((f) => ({
                        ...f,
                        bancos: checked ? [...f.bancos, b] : f.bancos.filter((x) => x !== b),
                      }))
                    }
                  />
                  <span className="truncate">{b.replace('|', ' · ')}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <Checkbox
            checked={filters.semCategoria}
            onCheckedChange={(c) => setFilters((f) => ({ ...f, semCategoria: !!c }))}
          />
          Sem categoria
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <Checkbox
            checked={filters.naoConfirmados}
            onCheckedChange={(c) => setFilters((f) => ({ ...f, naoConfirmados: !!c }))}
          />
          Não confirmados
        </label>
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || null }))}
            className="h-8 w-36 text-xs"
          />
          <span className="text-muted-foreground text-xs">até</span>
          <Input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || null }))}
            className="h-8 w-36 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-8 px-1 py-2 shrink-0">
                <Checkbox
                  checked={sortedRows.length > 0 && selectedIds.size === sortedRows.length}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="text-left px-2 py-2 font-medium w-[100px] shrink-0">Data</th>
              <th className="text-left px-2 py-2 font-medium min-w-[200px]">Estabelecimento</th>
              <th className="text-left px-2 py-2 font-medium w-[110px] shrink-0">Valor</th>
              <th className="text-left px-2 py-2 font-medium w-[72px] shrink-0">Fonte</th>
              <th className="text-left px-2 py-2 font-medium w-[100px] shrink-0">Banco</th>
              <th className="text-left px-2 py-2 font-medium min-w-[140px] shrink-0">Grupo (L1)</th>
              <th className="text-left px-2 py-2 font-medium min-w-[160px] shrink-0">Categoria</th>
              <th className="text-left px-2 py-2 font-medium w-20 shrink-0">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const state = rowStates[row.transaction_id]
              const isIncome = state?.is_income ?? row.is_income
              const isDespesa = row.transaction_type === 'despesa'
              const borderClass = row.is_pending
                ? 'border-l-2 border-l-red-400'
                : state?.dirty
                  ? 'border-l-2 border-l-yellow-400'
                  : 'border-l-2 border-l-emerald-400'
              const grupoNomeEfetivo =
                state?.grupo_nome ?? categories.find((c) => c.id === state?.grupo_id)?.name ?? null
              const itemsForGroup = getItemsForGroup(grupoNomeEfetivo)

              return (
                <tr
                  key={row.transaction_id}
                  className={cn('border-b border-border/50 hover:bg-muted/20', borderClass)}
                >
                  <td className="px-1 py-1.5 shrink-0">
                    <Checkbox
                      checked={selectedIds.has(row.transaction_id)}
                      onCheckedChange={() => toggleSelect(row.transaction_id)}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground tabular-nums shrink-0 whitespace-nowrap text-xs">
                    {formatDate(row.tx_date)}
                  </td>
                  <td className="px-2 py-1.5 min-w-[200px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs leading-tight truncate break-words" title={row.estabelecimento}>
                        {row.estabelecimento}
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="shrink-0 inline-flex">
                              {isDespesa ? (
                                <ArrowDownLeft className="w-3.5 h-3.5 text-red-500" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">{isDespesa ? 'Saída' : 'Entrada'}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                  <td
                    className={cn(
                      'px-2 py-1.5 font-medium shrink-0 tabular-nums text-xs',
                      isDespesa ? 'text-red-500' : 'text-emerald-600'
                    )}
                  >
                    {isDespesa ? '- ' : '+ '}
                    {formatCurrency(row.amount)}
                  </td>
                  <td className="px-2 py-1.5 shrink-0">
                    {source === 'bank' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Landmark className="h-3.5 w-3.5" /> Conta
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CreditCard className="h-3.5 w-3.5" /> Cartão
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 w-[100px] shrink-0">
                    <BancoLogo
                      connector_name={row.connector_name}
                      connector_image_url={row.connector_image_url}
                      account_name={row.account_name}
                      size={20}
                    />
                  </td>
                  <td className="px-2 py-1.5 shrink-0">
                    {isIncome ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <Select
                        value={
                          state?.grupo_id ??
                          expenseGroups.find((g) => g.name === state?.grupo_nome)?.id ??
                          ''
                        }
                        onValueChange={(val) => {
                          const g = expenseGroups.find((x) => x.id === val)
                          if (g)
                            setCategory(row.transaction_id, g.id, g.name, null, null)
                        }}
                      >
                        <SelectTrigger className="h-6 text-xs w-full min-w-[120px]">
                          <SelectValue placeholder="Grupo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseGroups.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-2 py-1.5 shrink-0 min-w-[160px]">
                    {isIncome ? (
                      <Select
                        value={state?.categoria_id ?? ''}
                        onValueChange={(val) => {
                          const it = userCats?.incomeItems.find((i) => i.id === val)
                          if (it)
                            setCategory(row.transaction_id, null, null, it.id, it.name)
                        }}
                      >
                        <SelectTrigger className="h-6 text-xs w-full">
                          <SelectValue placeholder="Receita..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(userCats?.incomeItems ?? []).map((it) => (
                            <SelectItem key={it.id} value={it.id}>
                              {it.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="space-y-1">
                        <Select
                          value={state?.categoria_id ?? ''}
                          onValueChange={(val) => {
                            const item = itemsForGroup.find((i) => i.id === val)
                            if (item) {
                              const g = grupoForExpenseItemId(item.id)
                              setCategory(
                                row.transaction_id,
                                g?.id ?? state?.grupo_id ?? null,
                                g?.name ?? state?.grupo_nome ?? null,
                                item.id,
                                item.name
                              )
                            }
                          }}
                          disabled={!state?.grupo_id && !state?.grupo_nome}
                        >
                          <SelectTrigger className="h-6 text-xs w-full">
                            <SelectValue placeholder="Subcategoria..." />
                          </SelectTrigger>
                          <SelectContent>
                            {itemsForGroup.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {row.ai_sugestao_id &&
                          !state?.categoria_id &&
                          !state?.grupo_id &&
                          !row.is_income && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              <span className="inline-flex gap-1 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] px-1.5 py-0.5">
                                ✨ {row.ai_sugestao_categoria ?? ''}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px]"
                                onClick={() => {
                                  const g = grupoForExpenseItemId(row.ai_sugestao_id)
                                  if (row.ai_sugestao_id && row.ai_sugestao_categoria)
                                    setCategory(
                                      row.transaction_id,
                                      g?.id ?? null,
                                      g?.name ?? null,
                                      row.ai_sugestao_id,
                                      row.ai_sugestao_categoria
                                    )
                                }}
                              >
                                Aceitar
                              </Button>
                            </div>
                          )}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 shrink-0">
                    {state?.confirmada && !state?.dirty ? (
                      <span className="text-emerald-600 dark:text-emerald-400" title="Confirmada">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                    ) : state?.dirty ? (
                      <span className="text-amber-500" title="Alterações não salvas">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                      </span>
                    ) : (
                      <span className="text-muted-foreground" title="Pendente">
                        <span className="inline-block w-3 h-3 rounded-full border border-muted-foreground" />
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedIds.size >= 2 && selectionHomogeneous && (
        <div className="mx-0 mb-3 rounded-lg border border-primary/30 bg-primary/5 dark:bg-primary/10 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4" />
              {selectedIds.size} selecionados
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Limpar seleção
            </button>
          </div>
          {selectionAllIncome ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground shrink-0">Receita:</span>
              <Select value={bulkIncomeId} onValueChange={setBulkIncomeId}>
                <SelectTrigger className="h-7 text-xs min-w-[160px]">
                  <SelectValue placeholder="Categoria receita..." />
                </SelectTrigger>
                <SelectContent>
                  {(userCats?.incomeItems ?? []).map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      {it.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-7 px-3 text-xs gap-1.5"
                disabled={!bulkIncomeId || isMassAssigning}
                onClick={() => void handleMassAssign()}
              >
                {isMassAssigning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                Aplicar a todos
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground shrink-0">Despesa:</span>
              <Select value={bulkGrupoId} onValueChange={setBulkGrupoId}>
                <SelectTrigger className="h-7 text-xs min-w-[130px]">
                  <SelectValue placeholder="Grupo..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={bulkCatId} onValueChange={setBulkCatId} disabled={!bulkGrupoId}>
                <SelectTrigger className="h-7 text-xs min-w-[150px] disabled:opacity-40">
                  <SelectValue placeholder="Subcategoria..." />
                </SelectTrigger>
                <SelectContent>
                  {massSubcats.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-7 px-3 text-xs gap-1.5"
                disabled={!bulkGrupoId || isMassAssigning}
                onClick={() => void handleMassAssign()}
              >
                {isMassAssigning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                Aplicar a todos
              </Button>
            </div>
          )}
        </div>
      )}

      {selectedIds.size === 1 && (
        <div className="mb-3 py-1.5 px-2 rounded border border-border bg-muted/30 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">1 selecionado</span>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Limpar seleção
          </button>
        </div>
      )}

      <div className="sticky bottom-0 mt-4 pt-4 border-t border-border bg-background px-0 py-3 flex items-center justify-end gap-2 flex-wrap">
        <Button type="button" variant="outline" size="sm" className="h-8 px-4 text-sm" onClick={handleRequestClose}>
          Cancelar
        </Button>
        {dirtyCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-4 text-sm text-destructive hover:bg-destructive/10 gap-1.5"
            onClick={handleDiscard}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Descartar alterações
          </Button>
        )}
        <Button
          size="sm"
          className="h-8 px-4 text-sm gap-1.5"
          disabled={dirtyCount === 0 || saving}
          onClick={() => void handleSaveAll()}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {dirtyCount > 0 ? `Salvar tudo (${dirtyCount})` : 'Salvar tudo'}
        </Button>
      </div>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Alterações não salvas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você tem <strong>{dirtyCount}</strong> lançamento(s) com alterações não salvas. O que deseja fazer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              className="w-full h-9 gap-1.5"
              onClick={async () => {
                setShowExitDialog(false)
                setSaving(true)
                try {
                  const { totalUpdated } = await saveAll()
                  onSaveComplete(dirtyCount, totalUpdated)
                  onClose?.()
                } finally {
                  setSaving(false)
                }
              }}
            >
              <Save className="w-4 h-4" />
              Salvar e fechar
            </Button>
            <Button
              variant="outline"
              className="w-full h-9 text-destructive hover:bg-destructive/10 gap-1.5"
              onClick={() => {
                setShowExitDialog(false)
                reset()
                setSelectedIds(new Set())
                onClose?.()
              }}
            >
              <Trash2 className="w-4 h-4" />
              Descartar e fechar
            </Button>
            <Button variant="outline" className="w-full h-9" onClick={() => setShowExitDialog(false)}>
              Voltar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
