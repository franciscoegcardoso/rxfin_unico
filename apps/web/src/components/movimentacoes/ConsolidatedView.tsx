import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LayoutDashboard, List, X, CreditCard, Landmark } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { CollapsibleModule } from '@/components/shared/CollapsibleModule';
import { MonthSelector } from '@/components/lancamentos/MonthSelector';
import { InteractiveTreemap, type TreemapItem } from '@/components/charts/InteractiveTreemap';
import { EmptyState } from '@/components/shared/EmptyState';
import { useConsolidatedExpenses, type ConsolidatedCategory } from '@/hooks/useConsolidatedExpenses';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { useCreditCardTransactions } from '@/hooks/useCreditCardTransactions';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { CHART_PALETTE } from '@/components/charts/premiumChartTheme';

function KPICard({
  label,
  value,
  color,
}: {
  label: string;
  value?: number;
  color?: 'success' | 'destructive';
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-lg font-semibold tabular-nums',
          color === 'success' && 'text-emerald-600 dark:text-emerald-400',
          color === 'destructive' && 'text-destructive'
        )}
      >
        {value == null ? '—' : formatCurrency(value)}
      </p>
    </div>
  );
}

function ConsolidatedTransactionList({
  monthRef,
  categoryFilter,
  sourceFilter,
}: {
  monthRef: string;
  categoryFilter: string | null;
  sourceFilter: 'all' | 'debito' | 'credito';
}) {
  const { lancamentos } = useLancamentosRealizados({ paginated: false });
  const { transactions } = useCreditCardTransactions();

  const rows = useMemo(() => {
    const list: { id: string; date: string; description: string; category: string; source: 'conta' | 'cartao'; value: number }[] = [];

    if (sourceFilter === 'credito') {
      // só cartão
    } else {
      for (const l of lancamentos) {
        if (l.mes_referencia !== monthRef || l.tipo !== 'despesa') continue;
        if (categoryFilter != null && l.categoria !== categoryFilter) continue;
        list.push({
          id: l.id,
          date: l.data_pagamento || l.data_vencimento || l.mes_referencia,
          description: l.friendly_name || l.nome,
          category: l.categoria,
          source: 'conta',
          value: -(l.valor_realizado ?? l.valor_previsto ?? 0),
        });
      }
    }

    if (sourceFilter === 'debito') {
      // só conta — já adicionado acima
    } else {
      for (const t of transactions) {
        const txMonth = t.transaction_date.slice(0, 7);
        if (txMonth !== monthRef) continue;
        if (categoryFilter != null && (t.category || '') !== categoryFilter) continue;
        list.push({
          id: t.id,
          date: t.transaction_date,
          description: t.friendly_name || t.store_name,
          category: t.category || 'Outros',
          source: 'cartao',
          value: t.value,
        });
      }
    }

    list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [lancamentos, transactions, monthRef, categoryFilter, sourceFilter]);

  if (rows.length === 0) {
    return (
      <EmptyState
        description={
          categoryFilter
            ? `Nenhuma transação na categoria "${categoryFilter}" neste mês.`
            : 'Nenhuma transação neste mês.'
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Data</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Descrição</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Categoria</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Fonte</th>
            <th className="text-right py-2 px-2 font-medium text-muted-foreground">Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.source}-${r.id}`} className="border-b border-border/60 hover:bg-muted/30">
              <td className="py-2 px-2 whitespace-nowrap text-muted-foreground">
                {r.date ? format(new Date(r.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
              </td>
              <td className="py-2 px-2 max-w-[200px] truncate" title={r.description}>
                {r.description}
              </td>
              <td className="py-2 px-2">{r.category}</td>
              <td className="py-2 px-2">
                {r.source === 'conta' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    <Landmark className="h-3 w-3" />
                    Conta
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    <CreditCard className="h-3 w-3" />
                    Cartão
                  </span>
                )}
              </td>
              <td className="py-2 px-2 text-right tabular-nums font-medium text-destructive">
                {formatCurrency(r.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ConsolidatedView() {
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'debito' | 'credito'>('all');
  const { data, loading, error } = useConsolidatedExpenses(selectedMonth);

  const treemapData = useMemo((): TreemapItem[] => {
    const byCategory = data?.by_category ?? [];
    return byCategory
      .map((row: ConsolidatedCategory, i: number) => {
        let value = row.total_combined;
        if (sourceFilter === 'debito') value = row.total_debito;
        else if (sourceFilter === 'credito') value = row.total_credito;
        if (value <= 0) return null;
        return {
          id: row.category,
          name: row.category,
          value,
          color: (CHART_PALETTE[i % CHART_PALETTE.length] as string) ?? undefined,
        };
      })
      .filter((item): item is TreemapItem => item != null);
  }, [data?.by_category, sourceFilter]);

  const handleCategoryClick = (name: string) => {
    setCategoryFilter((prev) => (prev === name ? null : name));
  };

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Período</Label>
        <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard label="Total despesas" value={data?.kpis.total_despesas} color="destructive" />
        <KPICard label="Débito (conta)" value={data?.kpis.total_debito} />
        <KPICard label="Crédito (cartão)" value={data?.kpis.total_credito} />
        <KPICard label="Receitas" value={data?.kpis.total_receitas} color="success" />
        <KPICard
          label="Saldo real"
          value={data?.kpis.saldo_real}
          color={data?.kpis.saldo_real != null && data.kpis.saldo_real >= 0 ? 'success' : 'destructive'}
        />
      </div>

      <CollapsibleModule
        title="Análises consolidadas"
        description="Despesas por categoria — débito + crédito"
        icon={<LayoutDashboard className="h-4 w-4 text-primary" />}
        defaultOpen
      >
        <div className="flex gap-2 mb-4">
          {(['all', 'debito', 'credito'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSourceFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                sourceFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {s === 'all' ? 'Tudo' : s === 'debito' ? 'Só débito' : 'Só crédito'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-[220px] rounded-lg bg-muted/50 animate-pulse" />
        ) : treemapData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sem despesas por categoria neste mês.</p>
        ) : (
          <InteractiveTreemap
            data={treemapData}
            formatValue={(v) => formatCurrency(v)}
            height={220}
            selectedLeafName={categoryFilter}
            onLeafClick={handleCategoryClick}
            groupSmallItems
          />
        )}
      </CollapsibleModule>

      <CollapsibleModule
        title="Todas as transações"
        description="Débito e crédito combinados"
        icon={<List className="h-4 w-4 text-primary" />}
      >
        {categoryFilter != null && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-muted/50 rounded-lg text-sm">
            <span>
              Filtrando por: <strong>{categoryFilter}</strong>
            </span>
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className="ml-auto text-muted-foreground hover:text-foreground p-1 rounded-md"
              aria-label="Remover filtro"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <ConsolidatedTransactionList
          monthRef={selectedMonth}
          categoryFilter={categoryFilter}
          sourceFilter={sourceFilter}
        />
      </CollapsibleModule>
    </div>
  );
}
