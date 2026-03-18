import React, { useMemo, useState } from 'react';
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
  Building2,
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
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { ConsolidarFilters } from '@/types/consolidar';

interface ConsolidarTabProps {
  sourceFilter: 'bank' | 'card' | null;
  categories: { id: string; name: string }[];
  onSaveComplete: (establishmentsUpdated: number, transactionsUpdated: number) => void;
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);

export function ConsolidarTab({ sourceFilter, categories, onSaveComplete }: ConsolidarTabProps) {
  const [filters, setFilters] = useState<ConsolidarFilters>(defaultFilters);
  const [selectedEstabelecimentos, setSelectedEstabelecimentos] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [bulkCategoryName, setBulkCategoryName] = useState<string>('');

  const {
    filteredData,
    data,
    rowStates,
    pendingCount,
    dirtyCount,
    isLoading,
    setCategory,
    saveAll,
  } = useConsolidarEstabelecimentos(sourceFilter, filters);

  const { data: expenseGroups = [] } = useQuery({
    queryKey: ['expense-categories-groups'],
    queryFn: async () => {
      const { data: d, error } = await supabase
        .from('expense_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      return (d ?? []) as { id: string; name: string }[];
    },
  });

  const { data: expenseItemsByGroup = [] } = useQuery({
    queryKey: ['default-expense-items'],
    queryFn: async () => {
      const { data: d, error } = await supabase
        .from('default_expense_items')
        .select('id, name, category_name')
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      return (d ?? []) as { id: string; name: string; category_name: string | null }[];
    },
  });

  const uniqueBancos = useMemo(() => {
    const set = new Set<string>();
    data.forEach((r) => r.bancos.forEach((b) => set.add(b)));
    return Array.from(set).sort();
  }, [data]);

  const totalEstabelecimentos = data.length;
  const categorizados = data.filter(
    (r) => (rowStates[r.estabelecimento]?.categoria_id ?? rowStates[r.estabelecimento]?.grupo_id ?? null) !== null
  ).length;
  const totalPendentesToUpdate = data
    .filter((r) => rowStates[r.estabelecimento]?.dirty)
    .reduce((acc, r) => acc + r.total_ocorrencias, 0);

  const sortedRows = useMemo(() => {
    const list = [...filteredData];
    list.sort((a, b) => {
      const stateA = rowStates[a.estabelecimento];
      const stateB = rowStates[b.estabelecimento];
      const pendentesA = a.total_pendentes > 0 ? 1 : 0;
      const pendentesB = b.total_pendentes > 0 ? 1 : 0;
      if (pendentesA !== pendentesB) return pendentesB - pendentesA;
      const dirtyA = stateA?.dirty ? 1 : 0;
      const dirtyB = stateB?.dirty ? 1 : 0;
      if (dirtyA !== dirtyB) return dirtyB - dirtyA;
      return (stateB?.confirmada ? 1 : 0) - (stateA?.confirmada ? 1 : 0);
    });
    return list;
  }, [filteredData, rowStates]);

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
    if (!grupoNome) return [];
    return expenseItemsByGroup.filter((i) => i.category_name === grupoNome);
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
          {categorizados} de {totalEstabelecimentos} estabelecimentos categorizados
        </p>
        <Progress value={totalEstabelecimentos > 0 ? (categorizados / totalEstabelecimentos) * 100 : 0} className="h-2" />
        {dirtyCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {totalPendentesToUpdate} lançamentos serão atualizados ao salvar
          </p>
        )}
      </div>

      {/* Filtros */}
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
                  {b}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex gap-1">
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
            {expenseGroups.map((g) => (
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
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-8 px-1 py-3 shrink-0">
                <Checkbox
                  checked={sortedRows.length > 0 && selectedEstabelecimentos.size === sortedRows.length}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="w-8 px-1 py-3 shrink-0" />
              <th className="text-left px-2 py-3 font-medium min-w-[240px] max-w-[340px]">Estabelecimento</th>
              <th className="text-left px-2 py-3 font-medium w-[110px] shrink-0">Última compra</th>
              <th className="text-left px-2 py-3 font-medium w-[60px] shrink-0">Ocorrências</th>
              <th className="text-left px-2 py-3 font-medium w-[110px] shrink-0">Valor médio</th>
              <th className="text-left px-2 py-3 font-medium w-[80px] shrink-0">Fonte</th>
              <th className="text-left px-2 py-3 font-medium w-[140px] shrink-0">Banco</th>
              <th className="text-left px-2 py-3 font-medium w-[160px] shrink-0">Grupo (L1)</th>
              <th className="text-left px-2 py-3 font-medium min-w-[180px] shrink-0">Categoria (L2)</th>
              <th className="text-left px-2 py-3 font-medium w-20 shrink-0">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const state = rowStates[row.estabelecimento];
              const isExpanded = expanded[row.estabelecimento];
              const isDespesa = row.transaction_type === 'despesa';
              const borderClass =
                row.total_pendentes > 0
                  ? 'border-l-2 border-red-400'
                  : state?.dirty
                    ? 'border-l-2 border-yellow-400'
                    : 'border-l-2 border-emerald-400';
              const itemsForGroup = getItemsForGroup(state?.grupo_nome ?? null);

              return (
                <React.Fragment key={row.estabelecimento}>
                  <tr className={cn('border-b border-border/50 hover:bg-muted/20', borderClass)}>
                    <td className="px-1 py-2 shrink-0">
                      <Checkbox
                        checked={selectedEstabelecimentos.has(row.estabelecimento)}
                        onCheckedChange={() => toggleSelect(row.estabelecimento)}
                      />
                    </td>
                    <td className="px-1 py-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleExpand(row.estabelecimento)}
                        className="p-0.5 rounded hover:bg-muted"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                    <td className="px-2 py-2 min-w-[240px] max-w-[340px] align-top">
                      <div className="flex flex-col gap-1">
                        {isDespesa ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-500 bg-red-50 dark:bg-red-950/30 rounded px-1 py-0.5 shrink-0 w-fit">
                            <ArrowDownLeft className="w-2.5 h-2.5" /> Saída
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded px-1 py-0.5 shrink-0 w-fit">
                            <ArrowUpRight className="w-2.5 h-2.5" /> Entrada
                          </span>
                        )}
                        <span className="text-xs leading-tight break-words whitespace-normal">{row.estabelecimento}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground shrink-0">{formatDate(row.ultima_compra)}</td>
                    <td className="px-2 py-2 shrink-0">{row.total_ocorrencias}x</td>
                    <td
                      className={cn(
                        'px-2 py-2 font-medium shrink-0',
                        isDespesa ? 'text-red-500' : 'text-emerald-600'
                      )}
                    >
                      {formatCurrency(row.valor_medio)}
                    </td>
                    <td className="px-2 py-2 shrink-0">
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
                    <td className="px-2 py-2 shrink-0">
                      {row.bancos_detalhe.length > 0 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5">
                                <div className="flex -space-x-2">
                                  {row.bancos_detalhe.slice(0, 3).map((b, i) => (
                                    <span key={i} className="flex h-4 w-4 rounded-full overflow-hidden bg-muted border border-background shrink-0">
                                      {b.connector_image_url ? (
                                        <img src={b.connector_image_url} alt="" className="h-full w-full object-cover" width={16} height={16} />
                                      ) : (
                                        <Building2 className="h-full w-full p-0.5 text-muted-foreground" />
                                      )}
                                    </span>
                                  ))}
                                </div>
                                {row.bancos_detalhe.length > 3 && (
                                  <span className="text-[10px] text-muted-foreground shrink-0">+{row.bancos_detalhe.length - 3}</span>
                                )}
                                {row.bancos_detalhe.length === 1 && (
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                                    {row.bancos_detalhe[0].account_name || row.bancos_detalhe[0].connector_name}
                                  </span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {row.bancos_detalhe.map((b, i) => (
                                <p key={i} className="text-xs">
                                  {b.account_name || b.connector_name} ({b.connector_name})
                                </p>
                              ))}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {row.bancos[0] ?? '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 shrink-0">
                      <Select
                        value={state?.grupo_id ?? expenseGroups.find((g) => g.name === state?.grupo_nome)?.id ?? ''}
                        onValueChange={(val) => {
                          const g = expenseGroups.find((x) => x.id === val);
                          if (g) setCategory(row.estabelecimento, g.id, g.name, null, null);
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-full min-w-[140px]">
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
                    </td>
                    <td className="px-2 py-2 shrink-0 min-w-[180px]">
                      <div className="space-y-1">
                        <Select
                          value={state?.categoria_id ?? ''}
                          onValueChange={(val) => {
                            const item = itemsForGroup.find((i) => i.id === val) ?? expenseItemsByGroup.find((i) => i.id === val);
                            if (item) setCategory(row.estabelecimento, state?.grupo_id ?? null, state?.grupo_nome ?? null, item.id, item.name);
                          }}
                          disabled={!state?.grupo_nome && expenseGroups.length > 0}
                        >
                          <SelectTrigger className="h-7 text-xs w-full">
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
                        {row.ai_sugestao_id && !state?.categoria_id && !state?.grupo_id && (
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
                                setCategory(row.estabelecimento, null, null, row.ai_sugestao_id, row.ai_sugestao_categoria)
                              }
                            >
                              Aceitar
                            </Button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 shrink-0">
                      {state?.confirmada ? (
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
                  {isExpanded && row.ocorrencias_detalhe?.length > 0 && (
                    <tr className="border-b border-border/50 bg-muted/10">
                      <td colSpan={11} className="px-3 py-2">
                        <div className="space-y-1 pl-6">
                          {row.ocorrencias_detalhe.map((occ, idx) => (
                            <div key={idx} className="flex items-center gap-4 text-xs">
                              <span className="text-muted-foreground w-24">{formatDate(occ.date)}</span>
                              <span className={occ.transaction_type === 'despesa' ? 'text-red-500' : 'text-emerald-600'}>
                                {formatCurrency(occ.amount)}
                              </span>
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                {occ.fonte === 'bank' && <Landmark className="h-3 w-3" />}
                                {occ.fonte === 'card' && <CreditCard className="h-3 w-3" />}
                                {occ.banco}
                              </span>
                              {occ.transaction_type === 'despesa' ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-red-500 bg-red-50 dark:bg-red-950/30 rounded px-1 py-0.5">
                                  <ArrowDownLeft className="w-2 h-2" /> Saída
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded px-1 py-0.5">
                                  <ArrowUpRight className="w-2 h-2" /> Entrada
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Barra de ação em lote quando há seleção */}
      {selectedEstabelecimentos.size > 0 && (
        <div className="sticky bottom-0 mt-3 py-2 px-3 rounded-lg border border-border bg-muted/50 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium">
            {selectedEstabelecimentos.size} selecionado(s)
          </span>
          <Select
            value={bulkCategoryId}
            onValueChange={(val) => {
              const g = expenseGroups.find((x) => x.id === val);
              if (g) {
                setBulkCategoryId(g.id);
                setBulkCategoryName(g.name);
              } else {
                const item = expenseItemsByGroup.find((x) => x.id === val);
                if (item) {
                  setBulkCategoryId(item.id);
                  setBulkCategoryName(item.name);
                }
              }
            }}
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {expenseGroups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
              {expenseItemsByGroup.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.category_name} → {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 text-xs"
            disabled={!bulkCategoryId}
            onClick={() => {
              selectedEstabelecimentos.forEach((est) => {
                setCategory(est, null, null, bulkCategoryId, bulkCategoryName);
              });
              setBulkCategoryId('');
              setBulkCategoryName('');
            }}
          >
            Aplicar a selecionados
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setSelectedEstabelecimentos(new Set())}
          >
            Limpar
          </Button>
        </div>
      )}

      {/* Rodapé sticky */}
      <div className="sticky bottom-0 mt-4 pt-4 border-t border-border bg-background flex justify-end">
        <Button
          onClick={handleSaveAll}
          disabled={dirtyCount === 0 || saving}
          className="gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {dirtyCount === 0 ? 'Salvar tudo' : `Salvar tudo (${dirtyCount} alterações)`}
        </Button>
      </div>
    </div>
  );
}
