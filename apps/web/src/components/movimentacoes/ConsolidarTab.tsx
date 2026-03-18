import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface ConsolidarTabProps {
  sourceFilter: 'bank' | 'card' | null;
  categories: { id: string; name: string }[];
  onSaveComplete: (establishmentsUpdated: number, transactionsUpdated: number) => void;
}

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export function ConsolidarTab({ sourceFilter, categories, onSaveComplete }: ConsolidarTabProps) {
  const {
    data,
    rowStates,
    pendingCount,
    dirtyCount,
    isLoading,
    setCategory,
    saveAll,
  } = useConsolidarEstabelecimentos(sourceFilter);

  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const totalEstabelecimentos = data.length;
  const categorizados = data.filter((r) => (rowStates[r.estabelecimento]?.categoria_id ?? null) !== null).length;
  const totalPendentesToUpdate = data
    .filter((r) => rowStates[r.estabelecimento]?.dirty)
    .reduce((acc, r) => acc + r.total_ocorrencias, 0);

  const sortedRows = useMemo(() => {
    const list = [...data];
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
  }, [data, rowStates]);

  const toggleExpand = (estabelecimento: string) => {
    setExpanded((prev) => ({ ...prev, [estabelecimento]: !prev[estabelecimento] }));
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

      {/* Tabela */}
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-8 px-2 py-3" />
              <th className="text-left px-3 py-3 font-medium">Estabelecimento</th>
              <th className="text-left px-3 py-3 font-medium">Última compra</th>
              <th className="text-left px-3 py-3 font-medium">Ocorrências</th>
              <th className="text-left px-3 py-3 font-medium">Categoria</th>
              <th className="text-left px-3 py-3 font-medium w-20">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const state = rowStates[row.estabelecimento];
              const isExpanded = expanded[row.estabelecimento];
              const borderClass =
                row.total_pendentes > 0
                  ? 'border-l-2 border-red-400'
                  : state?.dirty
                    ? 'border-l-2 border-yellow-400'
                    : 'border-l-2 border-emerald-400';
              return (
                <React.Fragment key={row.estabelecimento}>
                  <tr className={cn('border-b border-border/50 hover:bg-muted/20', borderClass)}>
                    <td className="px-2 py-2">
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
                    <td className="px-3 py-2" title={row.estabelecimento}>
                      <span className="truncate max-w-[220px] block">{row.estabelecimento}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDate(row.ultima_compra)}</td>
                    <td className="px-3 py-2">{row.total_ocorrencias}x</td>
                    <td className="px-3 py-2">
                      <Select
                        value={state?.categoria_id ?? ''}
                        onValueChange={(val) => {
                          const cat = categories.find((c) => c.id === val);
                          if (cat) setCategory(row.estabelecimento, cat.id, cat.name);
                        }}
                      >
                        <SelectTrigger className="h-9 w-full max-w-[200px]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {row.ai_sugestao_id && !state?.categoria_id && (
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs px-2 py-1">
                            ✨ Sugestão IA: {row.ai_sugestao_categoria ?? ''}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              row.ai_sugestao_id &&
                              row.ai_sugestao_categoria &&
                              setCategory(row.estabelecimento, row.ai_sugestao_id, row.ai_sugestao_categoria)
                            }
                          >
                            Aceitar
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
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
                  {isExpanded && (
                    <tr className="border-b border-border/50 bg-muted/10">
                      <td colSpan={6} className="px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {(row.total_ocorrencias > 5 ? row.todas_as_datas.slice(0, 5) : row.todas_as_datas).map(
                            (d) => (
                              <span
                                key={d}
                                className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                              >
                                {formatDate(d)}
                              </span>
                            )
                          )}
                          {row.total_ocorrencias > 5 && (
                            <span className="text-xs text-muted-foreground">e mais {row.total_ocorrencias - 5}</span>
                          )}
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

      {/* Rodapé sticky */}
      <div className="sticky bottom-0 mt-4 pt-4 border-t border-border bg-background flex justify-end">
        <Button
          onClick={handleSaveAll}
          disabled={dirtyCount === 0 || saving}
          className="gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {dirtyCount === 0 ? 'Salvar tudo' : `Salvar tudo (${dirtyCount} alterações)`}
        </Button>
      </div>
    </div>
  );
}
