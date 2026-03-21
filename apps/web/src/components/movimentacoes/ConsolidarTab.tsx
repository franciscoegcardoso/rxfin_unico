import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  CreditCard,
  Shuffle,
  CheckSquare,
  RotateCcw,
  Save,
  Zap,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { useConsolidarEstabelecimentos } from '@/hooks/useConsolidarEstabelecimentos';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ConsolidarFilters } from '@/types/consolidar';
import { BancoLogo } from '@/components/shared/BancoLogo';
import { useUserCategories } from '@/hooks/useUserCategories';

interface ConsolidarTabProps {
  sourceFilter: 'bank' | 'card' | null;
  categories: { id: string; name: string }[];
  onSaveComplete: (establishmentsUpdated: number, transactionsUpdated: number) => void;
  onClose?: () => void;
  requestCloseRef?: React.RefObject<(() => void) | null>;
}

const defaultFilters: ConsolidarFilters = {
  search: '',
  bancos: [],
  fonte: [],
  grupoCategoria: null,
  semCategoria: false,
  naoConfirmados: false,
  dateFrom: null,
  dateTo: null,
};

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

function formatOcorrenciaDate(iso: string) {
  try {
    return format(parseISO(String(iso).slice(0, 10)), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return formatDate(String(iso));
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);

export function ConsolidarTab({ sourceFilter, categories, onSaveComplete, onClose, requestCloseRef }: ConsolidarTabProps) {
  const [filters, setFilters] = useState<ConsolidarFilters>(defaultFilters);
  const [selectedEstabelecimentos, setSelectedEstabelecimentos] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAllMap, setShowAllMap] = useState<Record<string, boolean>>({});
  const [massGrupoId, setMassGrupoId] = useState<string>('');
  const [massCatId, setMassCatId] = useState<string>('');
  const [massIncomeId, setMassIncomeId] = useState<string>('');
  const [massSubcats, setMassSubcats] = useState<{ id: string; name: string }[]>([]);
  const [isMassAssigning, setIsMassAssigning] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const {
    filteredData,
    data,
    rowStates,
    pendingCount,
    dirtyCount,
    isLoading,
    setCategory,
    setRowStates,
    toggleConfirmada,
    saveAll,
    reset,
  } = useConsolidarEstabelecimentos(sourceFilter, filters);

  const { data: userCats } = useUserCategories();

  const uniqueBancos = useMemo(() => {
    const set = new Set<string>();
    data.forEach((r) => r.bancos.forEach((b) => set.add(b)));
    return Array.from(set).sort();
  }, [data]);

  const totalEstabelecimentos = data.length;
  // Conta estabelecimentos sem pendentes (total_pendentes === 0) ou confirmados manualmente nesta sessão
  const categorizados = data.filter(
    (r) => r.total_pendentes === 0 || rowStates[r.estabelecimento]?.confirmada === true
  ).length;
  const totalPendentesToUpdate = data
    .filter((r) => rowStates[r.estabelecimento]?.dirty)
    .reduce((acc, r) => acc + r.total_ocorrencias, 0);

  const sortedRows = filteredData;

  const parentRef = useRef<HTMLDivElement>(null);

  const toggleExpand = (estabelecimento: string) => {
    setExpanded((prev) => ({ ...prev, [estabelecimento]: !prev[estabelecimento] }));
  };

  const toggleSelect = (est: string) => {
    setSelectedEstabelecimentos((prev) => {
      const next = new Set(prev);
      if (next.has(est)) next.delete(est);
      else next.add(est);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEstabelecimentos.size === sortedRows.length) {
      setSelectedEstabelecimentos(new Set());
    } else {
      setSelectedEstabelecimentos(new Set(sortedRows.map((r) => r.estabelecimento)));
    }
  };

  const getItemsForGroup = (grupoNome: string | null) => {
    if (!grupoNome || !userCats?.expenseGroups) return [];
    const group = userCats.expenseGroups.find((g) => g.category_name === grupoNome);
    return group?.items ?? [];
  };

  const grupoForExpenseItemId = useCallback(
    (itemId: string | null) => {
      if (!itemId || !userCats?.expenseGroups) return null;
      for (const g of userCats.expenseGroups) {
        const item = g.items.find((i) => i.id === itemId);
        if (item) return { id: g.category_id, name: g.category_name };
      }
      return null;
    },
    [userCats]
  );

  useEffect(() => {
    if (!massGrupoId || !userCats?.expenseGroups) {
      setMassSubcats([]);
      setMassCatId('');
      return;
    }
    const grupoNome = categories.find((c) => c.id === massGrupoId)?.name ?? '';
    const group = userCats.expenseGroups.find((g) => g.category_name === grupoNome);
    setMassSubcats(group?.items ?? []);
    setMassCatId('');
  }, [massGrupoId, categories, userCats]);

  const handleRequestClose = useCallback(() => {
    if (dirtyCount > 0) {
      setShowExitDialog(true);
    } else {
      onClose?.();
    }
  }, [dirtyCount, onClose]);

  useEffect(() => {
    if (requestCloseRef) {
      requestCloseRef.current = handleRequestClose;
    }
    return () => {
      if (requestCloseRef) requestCloseRef.current = null;
    };
  }, [requestCloseRef, handleRequestClose]);

  const handleMassAssign = async () => {
    const storeNames = Array.from(selectedEstabelecimentos);
    const selectedRows = sortedRows.filter((r) => selectedEstabelecimentos.has(r.estabelecimento));
    const selectionAllIncome = selectedRows.length > 0 && selectedRows.every((r) => r.transaction_type === 'receita');
    const selectionAllExpense = selectedRows.length > 0 && selectedRows.every((r) => r.transaction_type !== 'receita');
    if (!selectionAllIncome && !selectionAllExpense) {
      toast.error('Seleção mista. Selecione apenas receitas ou apenas despesas.');
      return;
    }
    setIsMassAssigning(true);
    try {
      let finalCatId = '';
      let finalCatNome = '';
      let finalGroupId: string | null = null;
      let finalGroupName: string | null = null;

      if (selectionAllIncome) {
        if (!massIncomeId) return;
        const income = userCats?.incomeItems.find((i) => i.id === massIncomeId);
        finalCatId = massIncomeId;
        finalCatNome = income?.name ?? '';
      } else {
        if (!massGrupoId) return;
        const grupoNome = categories.find((c) => c.id === massGrupoId)?.name ?? '';
        finalGroupId = massGrupoId;
        finalGroupName = grupoNome;
        finalCatId = massCatId || massGrupoId;
        finalCatNome = massCatId
          ? (massSubcats.find((s) => s.id === massCatId)?.name ?? grupoNome)
          : grupoNome;
      }

      const { data: rpcData, error } = await supabase.rpc('bulk_assign_category_to_stores', {
        p_store_names: storeNames,
        p_category_id: finalCatId,
        p_category_name: finalCatNome,
        p_apply_historical: true,
        p_source_filter: sourceFilter,
      });
      if (error) throw error;
      storeNames.forEach((store) => {
        setCategory(store, finalGroupId, finalGroupName, finalCatId, finalCatNome);
      });
      setSelectedEstabelecimentos(new Set());
      setMassGrupoId('');
      setMassCatId('');
      setMassIncomeId('');
      toast.success(
        `Categoria aplicada em massa: ${(rpcData as { stores_updated?: number })?.stores_updated ?? storeNames.length} estabelecimentos · ${(rpcData as { total_updated_transactions?: number })?.total_updated_transactions ?? 0} lançamentos atualizados`
      );
    } catch {
      toast.error('Não foi possível aplicar a categoria.');
    } finally {
      setIsMassAssigning(false);
    }
  };

  const handleDiscard = () => {
    reset();
    setSelectedEstabelecimentos(new Set());
  };

  const handleSaveAll = async () => {
    if (dirtyCount === 0) return;
    const establishmentsCount = dirtyCount;
    setSaving(true);
    try {
      const { totalUpdated } = await saveAll();
      onSaveComplete(establishmentsCount, totalUpdated);
    } finally {
      setSaving(false);
    }
  };

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.bancos.length > 0 ||
    filters.fonte.length > 0 ||
    filters.grupoCategoria != null ||
    filters.semCategoria ||
    filters.naoConfirmados ||
    filters.dateFrom != null ||
    filters.dateTo != null;

  type VirtualRowEntry =
    | { type: 'parent'; key: string; rowIndex: number }
    | { type: 'child'; key: string; rowIndex: number; childIndex: number; ocKey: string }
    | { type: 'more'; key: string; rowIndex: number };

  const virtualEntries = useMemo<VirtualRowEntry[]>(() => {
    const out: VirtualRowEntry[] = [];
    sortedRows.forEach((row, rowIndex) => {
      out.push({ type: 'parent', key: `parent-${row.estabelecimento}`, rowIndex });
      const isExpanded = expanded[row.estabelecimento];
      if (!isExpanded || !row.ocorrencias_detalhe?.length) return;
      const visible = showAllMap[row.estabelecimento] ? row.ocorrencias_detalhe : row.ocorrencias_detalhe.slice(0, 5);
      visible.forEach((oc, childIndex) => {
        const ocKey = `${row.estabelecimento}::${oc.date}::${oc.amount}::${childIndex}`;
        out.push({ type: 'child', key: `child-${ocKey}`, rowIndex, childIndex, ocKey });
      });
      if (row.ocorrencias_detalhe.length > 5) {
        out.push({ type: 'more', key: `more-${row.estabelecimento}`, rowIndex });
      }
    });
    return out;
  }, [sortedRows, expanded, showAllMap]);

  const rowVirtualizer = useVirtualizer({
    count: virtualEntries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (virtualEntries[index]?.type === 'parent' ? 44 : virtualEntries[index]?.type === 'child' ? 36 : 30),
    overscan: 8,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 py-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
        <p className="text-sm font-medium text-foreground">Todos os estabelecimentos já foram categorizados!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Barra de progresso */}
      <div className="shrink-0 mb-4 space-y-1">
        <p className="text-sm text-muted-foreground">
          {categorizados} de {totalEstabelecimentos} estabelecimentos confirmados · {pendingCount} pendentes
        </p>
        <Progress value={totalEstabelecimentos > 0 ? (categorizados / totalEstabelecimentos) * 100 : 0} className="h-2" />
        {dirtyCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {totalPendentesToUpdate} lançamentos serão atualizados ao salvar
          </p>
        )}
      </div>

      {/* Filtros */}
      <div className="shrink-0 mb-3 flex flex-wrap items-center gap-2 lg:hidden">
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
                  {b}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex gap-1 flex-wrap items-center">
          <Button
            type="button"
            variant={filters.fonte.length === 0 ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setFilters((prev) => ({ ...prev, fonte: [] }))}
          >
            Todos
          </Button>
          {(['bank', 'card', 'mixed'] as const).map((f) => (
            <Button
              key={f}
              variant={filters.fonte.includes(f) ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  fonte: prev.fonte.includes(f) ? prev.fonte.filter((x) => x !== f) : [...prev.fonte, f],
                }))
              }
            >
              {f === 'bank' ? 'Conta' : f === 'card' ? 'Cartão' : 'Misto'}
            </Button>
          ))}
        </div>
        <Select
          value={filters.grupoCategoria ?? ''}
          onValueChange={(v) => setFilters((f) => ({ ...f, grupoCategoria: v || null }))}
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((g) => (
              <SelectItem key={g.id} value={g.name}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        {(hasActiveFilters || selectedEstabelecimentos.size > 0) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="h-8 text-xs">
                Ação nos selecionados
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => {
                  selectedEstabelecimentos.forEach((est) => {
                    const state = rowStates[est];
                    if (state?.categoria_id || state?.grupo_id) {
                      setCategory(est, state.grupo_id, state.grupo_nome, state.categoria_id, state.categoria_nome);
                    }
                  });
                  handleSaveAll();
                }}
              >
                Marcar todos como validados
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Tabela */}
      <div ref={parentRef} className="flex-1 min-h-0 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 sticky top-0 z-20">
              <th className="w-8 px-1 py-2 shrink-0">
                <Checkbox
                  checked={sortedRows.length > 0 && selectedEstabelecimentos.size === sortedRows.length}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="w-8 px-1 py-2 shrink-0" />
              <th className="text-left px-2 py-2 font-medium min-w-[240px] max-w-[340px]">Estabelecimento</th>
              <th className="text-left px-2 py-2 font-medium w-[110px] shrink-0">Última compra</th>
              <th className="text-left px-2 py-2 font-medium w-[60px] shrink-0">Ocorrências</th>
              <th className="text-left px-2 py-2 font-medium w-[110px] shrink-0">Valor médio</th>
              <th className="text-left px-2 py-2 font-medium w-[80px] shrink-0">Fonte</th>
              <th className="text-left px-2 py-2 font-medium w-[140px] shrink-0">Banco</th>
              <th className="text-left px-2 py-2 font-medium w-[160px] shrink-0">Grupo (L1)</th>
              <th className="text-left px-2 py-2 font-medium min-w-[180px] shrink-0">Categoria (L2)</th>
              <th className="text-left px-2 py-2 font-medium w-20 shrink-0">Status</th>
            </tr>
            <tr className="border-b border-border/50 bg-muted/10 hidden lg:table-row sticky top-[37px] z-10">
              <td className="px-1 py-1" />
              <td className="px-1 py-1" />
              <td className="px-2 py-1">
                <Input
                  placeholder="Buscar..."
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  className="h-6 text-xs border-border/50 bg-background"
                />
              </td>
              <td className="px-2 py-1">
                <Input
                  type="date"
                  value={filters.dateFrom ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || null }))}
                  className="h-6 text-xs w-full border-border/50"
                  title="A partir de"
                />
              </td>
              <td className="px-2 py-1" />
              <td className="px-2 py-1" />
              <td className="px-2 py-1">
                <select
                  value={filters.fonte[0] ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, fonte: e.target.value ? [e.target.value as 'bank' | 'card' | 'mixed'] : [] }))}
                  className="h-6 text-xs w-full rounded border border-border/50 bg-background px-1"
                >
                  <option value="">Todos</option>
                  <option value="bank">Conta</option>
                  <option value="card">Cartão</option>
                  <option value="mixed">Misto</option>
                </select>
              </td>
              <td className="px-2 py-1">
                <select
                  value={filters.bancos[0] ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, bancos: e.target.value ? [e.target.value] : [] }))}
                  className="h-6 text-xs w-full rounded border border-border/50 bg-background px-1"
                >
                  <option value="">Todos</option>
                  {uniqueBancos.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-1">
                <select
                  value={filters.grupoCategoria ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, grupoCategoria: e.target.value || null }))}
                  className="h-6 text-xs w-full rounded border border-border/50 bg-background px-1"
                >
                  <option value="">Todos</option>
                  {categories.map((g) => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-1" />
              <td className="px-2 py-1">
                <select
                  className="h-6 text-xs w-full rounded border border-border/50 bg-background px-1"
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilters((f) => ({ ...f, semCategoria: v === 'pending', naoConfirmados: v === 'unconfirmed' }));
                  }}
                >
                  <option value="">Todos</option>
                  <option value="pending">Pendentes</option>
                  <option value="unconfirmed">Não confirmados</option>
                </select>
              </td>
            </tr>
          </thead>
          <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const entry = virtualEntries[virtualRow.index];
              if (!entry) return null;
              const row = sortedRows[entry.rowIndex];
              if (!row) return null;
              const state = rowStates[row.estabelecimento];
              const isIncome = row.transaction_type === 'receita';
              const isDespesa = row.transaction_type === 'despesa';
              const borderClass =
                row.total_pendentes > 0
                  ? 'border-l-2 border-l-red-400'
                  : state?.dirty
                    ? 'border-l-2 border-l-yellow-400'
                    : 'border-l-2 border-l-emerald-400';
              const grupoNomeEfetivo =
                state?.grupo_nome ?? categories.find((c) => c.id === state?.grupo_id)?.name ?? null;
              const itemsForGroup = getItemsForGroup(grupoNomeEfetivo);

              if (entry.type === 'parent') {
                return (
                  <tr
                    key={entry.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}
                    className={cn('border-b border-border/50 hover:bg-muted/20 bg-background', borderClass)}
                  >
                    <td className="px-1 py-1.5 shrink-0">
                      <Checkbox
                        checked={selectedEstabelecimentos.has(row.estabelecimento)}
                        onCheckedChange={() => toggleSelect(row.estabelecimento)}
                      />
                    </td>
                    <td className="px-1 py-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleExpand(row.estabelecimento)}
                        className="p-0.5 rounded hover:bg-muted"
                      >
                        {expanded[row.estabelecimento] ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                    <td className="px-2 py-1.5 min-w-[240px] max-w-[340px]">
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
                    <td className="px-2 py-1.5 text-muted-foreground shrink-0 text-xs">{formatDate(row.ultima_compra)}</td>
                    <td className="px-2 py-1.5 shrink-0 text-xs">{row.total_ocorrencias}x</td>
                    <td
                      className={cn(
                        'px-2 py-1.5 font-medium shrink-0 text-xs',
                        isDespesa ? 'text-red-500' : 'text-emerald-600'
                      )}
                    >
                      {formatCurrency(row.valor_medio)}
                    </td>
                    <td className="px-2 py-1.5 shrink-0">
                      {row.fonte === 'bank' && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Landmark className="h-3.5 w-3.5" /> Conta
                        </span>
                      )}
                      {row.fonte === 'card' && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <CreditCard className="h-3.5 w-3.5" /> Cartão
                        </span>
                      )}
                      {row.fonte === 'mixed' && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                          <Shuffle className="h-3.5 w-3.5" /> Misto
                        </span>
                      )}
                    </td>
                    {/* Coluna Banco — linha agrupada: só logo, nome no tooltip */}
                    <td className="px-3 py-1.5 w-[140px] shrink-0">
                      {row.bancos_detalhe && row.bancos_detalhe.length > 0 ? (
                        <div className="flex items-center gap-1">
                          {row.bancos_detalhe.slice(0, 3).map((b, i) => (
                            <BancoLogo
                              key={i}
                              connector_name={b.connector_name}
                              connector_image_url={b.connector_image_url}
                              account_name={b.account_name}
                              size={20}
                            />
                          ))}
                          {row.bancos_detalhe.length > 3 && (
                            <span
                              className="text-[10px] text-muted-foreground font-medium"
                              title={row.bancos_detalhe.slice(3).map((b) => b.connector_name).join(', ')}
                            >
                              +{row.bancos_detalhe.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 shrink-0">
                      {isIncome ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Select
                          value={state?.grupo_id ?? categories.find((g) => g.name === state?.grupo_nome)?.id ?? ''}
                          onValueChange={(val) => {
                            const g = categories.find((x) => x.id === val);
                            if (g) setCategory(row.estabelecimento, g.id, g.name, null, null);
                          }}
                        >
                          <SelectTrigger className="h-6 text-xs w-full min-w-[140px]">
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
                      )}
                    </td>
                    <td className="px-2 py-1.5 shrink-0 min-w-[180px]">
                      <div className="space-y-1">
                        {isIncome ? (
                          <Select
                            value={state?.categoria_id ?? ''}
                            onValueChange={(val) => {
                              const it = userCats?.incomeItems.find((i) => i.id === val);
                              if (it) setCategory(row.estabelecimento, null, null, it.id, it.name);
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
                          <Select
                            value={state?.categoria_id ?? ''}
                            onValueChange={(val) => {
                              const item = itemsForGroup.find((i) => i.id === val);
                              if (item) {
                                const g = grupoForExpenseItemId(item.id);
                                setCategory(
                                  row.estabelecimento,
                                  g?.id ?? state?.grupo_id ?? null,
                                  g?.name ?? state?.grupo_nome ?? null,
                                  item.id,
                                  item.name
                                );
                              }
                            }}
                            disabled={!state?.grupo_id && !grupoNomeEfetivo}
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
                        )}
                        {row.ai_sugestao_id && !state?.categoria_id && (isIncome || !state?.grupo_id) && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <span className="inline-flex gap-1 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] px-1.5 py-0.5">
                              ✨ {row.ai_sugestao_categoria ?? ''}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px]"
                              onClick={() =>
                                row.ai_sugestao_id &&
                                row.ai_sugestao_categoria &&
                                setCategory(
                                  row.estabelecimento,
                                  isIncome ? null : state?.grupo_id ?? null,
                                  isIncome ? null : state?.grupo_nome ?? null,
                                  row.ai_sugestao_id,
                                  row.ai_sugestao_categoria
                                )
                              }
                            >
                              Aceitar
                            </Button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 shrink-0">
                      <button
                        type="button"
                        title={state?.confirmada ? 'Confirmado — clique para desconfirmar' : 'Clique para confirmar'}
                        onClick={() => toggleConfirmada(row.estabelecimento)}
                        disabled={!state?.categoria_id && !state?.grupo_id}
                        className={cn(
                          'flex items-center justify-center w-6 h-6 rounded-full transition-colors',
                          state?.confirmada ? 'text-emerald-600 hover:text-emerald-700' : state?.dirty ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground hover:text-foreground',
                          (!state?.categoria_id && !state?.grupo_id) && 'opacity-30 cursor-not-allowed'
                        )}
                      >
                        {state?.confirmada ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : state?.dirty ? (
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                        ) : (
                          <span className="inline-block w-3 h-3 rounded-full border border-current" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              }

              if (entry.type === 'child') {
                const oc = (showAllMap[row.estabelecimento] ? row.ocorrencias_detalhe : row.ocorrencias_detalhe.slice(0, 5))[entry.childIndex];
                if (!oc) return null;
                const bancoDetalhe = row.bancos_detalhe?.find((b) => b.connector_name === oc.banco);
                const imgUrl = oc.connector_image_url ?? bancoDetalhe?.connector_image_url ?? null;
                const accName = oc.account_name ?? bancoDetalhe?.account_name ?? null;
                const ocOverride = state?.ocorrenciaOverrides?.[entry.ocKey];
                const grupoIdEfetivo = ocOverride?.grupo_id ?? state?.grupo_id ?? undefined;
                const grupoNomeEfetivoOc = ocOverride?.grupo_nome ?? state?.grupo_nome ?? undefined;
                const catIdEfetivo = ocOverride?.categoria_id ?? state?.categoria_id ?? undefined;
                const itemsForOc = getItemsForGroup(grupoNomeEfetivoOc ?? null);
                const hasOverride = !!ocOverride?.categoria_id || !!ocOverride?.grupo_id;
                return (
                  <tr
                    key={entry.key}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}
                    className="bg-muted/10 border-b border-border/30 hover:bg-muted/20"
                  >
                          <td className="px-1 py-1.5 w-8 shrink-0" />
                          <td className="px-1 py-1.5 w-8 shrink-0" />
                          <td className="px-2 py-1.5 min-w-[240px] max-w-[340px]">
                            <div className="flex items-center gap-2 pl-4">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="shrink-0 inline-flex">
                                      {oc.transaction_type === 'despesa' ? (
                                        <ArrowDownLeft className="w-3.5 h-3.5 text-red-500" />
                                      ) : (
                                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                                      )}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    {oc.transaction_type === 'despesa' ? 'Saída' : 'Entrada'}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <span className="text-[11px] text-muted-foreground/50 truncate leading-tight">
                                {row.estabelecimento}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 w-[110px] text-xs text-muted-foreground tabular-nums shrink-0">
                            {oc.date ? formatOcorrenciaDate(oc.date) : '—'}
                          </td>
                          <td className="px-2 py-1.5 w-[60px] shrink-0 text-xs text-muted-foreground/50">
                            1x
                          </td>
                          <td
                            className={cn(
                              'px-2 py-1.5 w-[110px] text-left tabular-nums font-medium text-xs shrink-0',
                              oc.transaction_type === 'despesa' ? 'text-red-500' : 'text-emerald-600'
                            )}
                          >
                            {oc.transaction_type === 'despesa' ? '- ' : '+ '}
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              minimumFractionDigits: 2,
                            }).format(Math.abs(Number(oc.amount)))}
                          </td>
                          <td className="px-2 py-1.5 w-[80px] shrink-0">
                            {oc.fonte === 'card' ? (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <CreditCard className="h-3.5 w-3.5 shrink-0" /> Cartão
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Landmark className="h-3.5 w-3.5 shrink-0" /> Conta
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 w-[140px] shrink-0">
                            <BancoLogo
                              connector_name={String(oc.banco ?? '')}
                              connector_image_url={imgUrl}
                              account_name={accName}
                              size={20}
                            />
                          </td>
                          <td className="px-2 py-1.5 w-[160px] shrink-0">
                            {oc.transaction_type === 'receita' ? (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            ) : (
                              <Select
                                value={grupoIdEfetivo ?? ''}
                                onValueChange={(val) => {
                                  const g = categories.find((x) => x.id === val);
                                  if (!g) return;
                                  setRowStates((prev) => ({
                                    ...prev,
                                    [row.estabelecimento]: {
                                      ...prev[row.estabelecimento],
                                      dirty: true,
                                      ocorrenciaOverrides: {
                                        ...prev[row.estabelecimento]?.ocorrenciaOverrides,
                                        [entry.ocKey]: {
                                          ...(prev[row.estabelecimento]?.ocorrenciaOverrides?.[entry.ocKey] ?? {}),
                                          transaction_id: (oc as { transaction_id?: string | null }).transaction_id ?? null,
                                          grupo_id: g.id,
                                          grupo_nome: g.name,
                                        },
                                      },
                                    },
                                  }));
                                }}
                              >
                                <SelectTrigger className={cn('h-6 text-xs w-full min-w-[130px]', !hasOverride && grupoIdEfetivo && 'text-muted-foreground/60 border-dashed')}>
                                  <SelectValue placeholder="Herdado..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((g) => (
                                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                          <td className="px-2 py-1.5 min-w-[180px] shrink-0">
                            {oc.transaction_type === 'receita' ? (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            ) : (
                              <Select
                                value={catIdEfetivo ?? ''}
                                disabled={!grupoIdEfetivo && !grupoNomeEfetivoOc}
                                onValueChange={(val) => {
                                  const item = itemsForOc.find((i) => i.id === val);
                                  if (!item) return;
                                  setRowStates((prev) => ({
                                    ...prev,
                                    [row.estabelecimento]: {
                                      ...prev[row.estabelecimento],
                                      dirty: true,
                                      ocorrenciaOverrides: {
                                        ...prev[row.estabelecimento]?.ocorrenciaOverrides,
                                        [entry.ocKey]: {
                                          ...(prev[row.estabelecimento]?.ocorrenciaOverrides?.[entry.ocKey] ?? {}),
                                          transaction_id: (oc as { transaction_id?: string | null }).transaction_id ?? null,
                                          categoria_id: item.id,
                                          categoria_nome: item.name,
                                        },
                                      },
                                    },
                                  }));
                                }}
                              >
                                <SelectTrigger className={cn('h-6 text-xs w-full', !hasOverride && catIdEfetivo && 'text-muted-foreground/60 border-dashed')}>
                                  <SelectValue placeholder="Herdado..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {itemsForOc.map((i) => (
                                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                          <td className="px-2 py-1.5 w-20 shrink-0" />
                        </tr>
                );
              }

              return (
                <tr
                  key={entry.key}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}
                  className="bg-muted/5"
                >
                      <td colSpan={11} className="px-2 py-1">
                        {!showAllMap[row.estabelecimento] ? (
                          <button
                            type="button"
                            onClick={() => setShowAllMap((prev) => ({ ...prev, [row.estabelecimento]: true }))}
                            className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                          >
                            + {row.ocorrencias_detalhe.length - 5} mais
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowAllMap((prev) => ({ ...prev, [row.estabelecimento]: false }))}
                            className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                          >
                            Mostrar menos
                          </button>
                        )}
                      </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Barra flutuante de seleção múltipla — só quando >= 2 selecionados */}
      {selectedEstabelecimentos.size >= 2 && (
        <div className="mx-0 mb-3 rounded-lg border border-primary/30 bg-primary/5 dark:bg-primary/10 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4" />
              {selectedEstabelecimentos.size} estabelecimentos selecionados
            </span>
            <button
              type="button"
              onClick={() => setSelectedEstabelecimentos(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Limpar seleção
            </button>
          </div>
          {(() => {
            const selectedRows = sortedRows.filter((r) => selectedEstabelecimentos.has(r.estabelecimento));
            const selectionAllIncome = selectedRows.length > 0 && selectedRows.every((r) => r.transaction_type === 'receita');
            const selectionAllExpense = selectedRows.length > 0 && selectedRows.every((r) => r.transaction_type !== 'receita');

            if (!selectionAllIncome && !selectionAllExpense) {
              return (
                <p className="text-xs text-muted-foreground">
                  Seleção mista (receitas e despesas). Selecione apenas um tipo para aplicar em massa.
                </p>
              );
            }

            if (selectionAllIncome) {
              return (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground shrink-0">Receita:</span>
                  <Select value={massIncomeId} onValueChange={setMassIncomeId}>
                    <SelectTrigger className="h-7 text-xs min-w-[170px] w-auto">
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
                    className="h-7 px-3 text-xs font-medium gap-1.5"
                    disabled={!massIncomeId || isMassAssigning}
                    onClick={handleMassAssign}
                  >
                    {isMassAssigning ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    Aplicar a todos selecionados
                  </Button>
                </div>
              );
            }

            return (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground shrink-0">Despesa:</span>
                <Select
                  value={massGrupoId}
                  onValueChange={(val) => {
                    setMassGrupoId(val);
                    setMassCatId('');
                  }}
                >
                  <SelectTrigger className="h-7 text-xs min-w-[130px] w-auto">
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
                <Select value={massCatId} onValueChange={setMassCatId} disabled={!massGrupoId}>
                  <SelectTrigger className="h-7 text-xs min-w-[150px] w-auto disabled:opacity-40">
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
                  className="h-7 px-3 text-xs font-medium gap-1.5"
                  disabled={!massGrupoId || isMassAssigning}
                  onClick={handleMassAssign}
                >
                  {isMassAssigning ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  Aplicar a todos selecionados
                </Button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Barra simples quando 1 selecionado — só limpar */}
      {selectedEstabelecimentos.size === 1 && (
        <div className="mb-3 py-1.5 px-2 rounded border border-border bg-muted/30 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">1 selecionado</span>
          <button
            type="button"
            onClick={() => setSelectedEstabelecimentos(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Limpar seleção
          </button>
        </div>
      )}

      {/* Rodapé sticky */}
      <div className="sticky bottom-0 mt-4 pt-4 border-t border-border bg-background px-0 py-3 flex items-center justify-end gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-4 text-sm"
          onClick={handleRequestClose}
        >
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
          onClick={handleSaveAll}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {dirtyCount > 0 ? `Salvar tudo (${dirtyCount})` : 'Salvar tudo'}
        </Button>
      </div>

      {/* Dialog de confirmação ao sair com alterações pendentes */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Alterações não salvas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você tem <strong>{dirtyCount} estabelecimento{dirtyCount > 1 ? 's' : ''}</strong> com
              categorias alteradas mas não salvas. O que deseja fazer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              className="w-full h-9 gap-1.5"
              onClick={async () => {
                setShowExitDialog(false);
                setSaving(true);
                try {
                  const { totalUpdated } = await saveAll();
                  onSaveComplete(dirtyCount, totalUpdated);
                  onClose?.();
                } finally {
                  setSaving(false);
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
                setShowExitDialog(false);
                reset();
                setSelectedEstabelecimentos(new Set());
                onClose?.();
              }}
            >
              <Trash2 className="w-4 h-4" />
              Descartar alterações e fechar
            </Button>
            <Button
              variant="outline"
              className="w-full h-9 text-muted-foreground hover:bg-muted/50"
              onClick={() => setShowExitDialog(false)}
            >
              Voltar e continuar editando
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
