import React, { useMemo, useCallback, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { CollapsibleModule } from '@/components/shared/CollapsibleModule';
import { AnimatedChartContainer } from '@/components/charts/AnimatedChartContainer';
import { InteractiveTreemap, type TreemapItem } from '@/components/charts/InteractiveTreemap';
import {
  premiumXAxis,
  premiumTooltipStyle,
  chartColors,
  CHART_PALETTE,
} from '@/components/charts/premiumChartTheme';
import { useLancamentosSummary } from '@/hooks/useLancamentosSummary';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useVisibility } from '@/contexts/VisibilityContext';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function monthKeysEndingAt(endYm: string, count: number): string[] {
  const [y, m] = endYm.split('-').map(Number);
  const keys: string[] = [];
  let cy = y;
  let cm = m;
  for (let i = 0; i < count; i++) {
    keys.unshift(`${cy}-${String(cm).padStart(2, '0')}`);
    cm -= 1;
    if (cm < 1) {
      cm = 12;
      cy -= 1;
    }
  }
  return keys;
}

function shortLabel(ym: string): string {
  const [, m] = ym.split('-').map(Number);
  return MONTH_LABELS[m - 1] ?? ym;
}

export interface LancamentosAnalyticsSectionProps {
  selectedMonth: string;
  /** Filtro de categoria (controlado pela página — treemap e badge) */
  categoryFilter?: string | null;
  onCategoryFilter?: (category: string | null) => void;
}

export const LancamentosAnalyticsSection: React.FC<LancamentosAnalyticsSectionProps> = ({
  selectedMonth,
  categoryFilter = null,
  onCategoryFilter,
}) => {
  const { isHidden } = useVisibility();
  const { data: summary, loading: loadingSummary } = useLancamentosSummary(selectedMonth);
  const { lancamentos: allLancamentos, loading: loadingAll } = useLancamentosRealizados({
    paginated: false,
  });

  const handleCategoryClick = useCallback(
    (categoryName: string) => {
      const next = categoryFilter === categoryName ? null : categoryName;
      onCategoryFilter?.(next);
    },
    [categoryFilter, onCategoryFilter]
  );

  useEffect(() => {
    onCategoryFilter?.(null);
  }, [selectedMonth, onCategoryFilter]);

  const summaryTotals = summary?.summary;
  const totalIncome = summaryTotals?.total_income ?? 0;
  const totalExpense = summaryTotals?.total_expense ?? 0;
  const topCategories =
    summary?.top_categories ??
    summary?.by_category?.map((c) => ({ category: c.category, total: c.total, count: c.count })) ??
    [];
  const byPaymentMethod = summary?.by_payment_method ?? [];

  const PAYMENT_LABELS: Record<string, string> = {
    pix: 'PIX',
    cartao_credito: 'Cartão',
    debito_auto: 'Débito automático',
    boleto: 'Boleto',
    transferencia: 'Transferência',
    dinheiro: 'Dinheiro',
  };

  const evolutionData = useMemo(() => {
    const keys = monthKeysEndingAt(selectedMonth, 12);
    const byMonth = new Map<string, { receitas: number; despesas: number }>();
    keys.forEach((k) => byMonth.set(k, { receitas: 0, despesas: 0 }));
    for (const l of allLancamentos) {
      if (!byMonth.has(l.mes_referencia)) continue;
      const v = Math.abs(Number(l.valor_realizado ?? l.valor_previsto) || 0);
      const row = byMonth.get(l.mes_referencia)!;
      if (l.tipo === 'receita') row.receitas += v;
      else row.despesas += v;
    }
    return keys.map((ym) => ({
      mes: shortLabel(ym),
      receitas: byMonth.get(ym)!.receitas,
      despesas: byMonth.get(ym)!.despesas,
    }));
  }, [allLancamentos, selectedMonth]);

  const treemapData: TreemapItem[] = useMemo(() => {
    return topCategories
      .filter((c) => c.total > 0)
      .map((c, i) => ({
        id: c.category,
        name: c.category,
        value: c.total,
        count: c.count,
        color: CHART_PALETTE[i % CHART_PALETTE.length] as string,
      }));
  }, [topCategories]);

  const piePaymentData = useMemo(() => {
    return byPaymentMethod
      .filter((p) => p.total > 0)
      .map((p) => ({
        name: PAYMENT_LABELS[p.method] ?? p.method,
        value: p.total,
      }));
  }, [byPaymentMethod]);

  const loading = loadingSummary || loadingAll;
  const formatVal = (n: number) => (isHidden ? '••••' : formatCurrency(n));

  return (
    <CollapsibleModule
      title="Análises"
      description="Evolução mensal, categorias e formas de pagamento"
      icon={<BarChart3 className="h-4 w-4 text-primary" />}
      defaultOpen
    >
      {loading && !summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[260px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          <AnimatedChartContainer className="rounded-xl border border-border/80 bg-card overflow-hidden">
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold">Evolução Mensal</CardTitle>
                <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
              </CardHeader>
              <CardContent className="h-[240px] pb-4 px-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evolutionData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border-default))" vertical={false} />
                    <XAxis dataKey="mes" tick={premiumXAxis.tick} axisLine={premiumXAxis.axisLine} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'hsl(var(--color-text-tertiary))' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (isHidden ? '••' : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                    />
                    <RechartsTooltip
                      formatter={(v: number) => [isHidden ? '••••' : formatCurrency(v), '']}
                      contentStyle={premiumTooltipStyle.contentStyle}
                    />
                    <Bar dataKey="receitas" name="Receitas" fill={chartColors.income} radius={[2, 2, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="despesas" name="Despesas" fill={chartColors.expense} radius={[2, 2, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </AnimatedChartContainer>

          <AnimatedChartContainer delay={0.05} className="rounded-xl border border-border/80 bg-card overflow-hidden">
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold">Distribuição por Categoria</CardTitle>
                <p className="text-xs text-muted-foreground">Clique para filtrar</p>
              </CardHeader>
              <CardContent className="pb-4 min-h-[200px]">
                {treemapData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Sem despesas por categoria neste mês</p>
                ) : (
                  <InteractiveTreemap
                    data={treemapData}
                    formatValue={(v) => formatVal(v)}
                    isHidden={isHidden}
                    height={220}
                    selectedLeafName={categoryFilter}
                    onLeafClick={handleCategoryClick}
                    groupSmallItems
                  />
                )}
              </CardContent>
            </Card>
          </AnimatedChartContainer>

          <AnimatedChartContainer delay={0.1} className="rounded-xl border border-border/80 bg-card overflow-hidden">
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold">Receita vs Despesa</CardTitle>
              </CardHeader>
              <CardContent className="h-[200px] pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Receitas', valor: totalIncome, fill: chartColors.income },
                      { name: 'Despesas', valor: totalExpense, fill: chartColors.expense },
                    ]}
                    margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                  >
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis hide tickFormatter={() => ''} />
                    <RechartsTooltip
                      formatter={(v: number) => [formatVal(v), '']}
                      contentStyle={premiumTooltipStyle.contentStyle}
                    />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      {[
                        { name: 'Receitas', valor: totalIncome, fill: chartColors.income },
                        { name: 'Despesas', valor: totalExpense, fill: chartColors.expense },
                      ].map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </AnimatedChartContainer>

          <AnimatedChartContainer delay={0.15} className="rounded-xl border border-border/80 bg-card overflow-hidden">
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold">Por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="h-[240px] pb-4">
                {piePaymentData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={piePaymentData}
                        cx="50%"
                        cy="45%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {piePaymentData.map((_, i) => (
                          <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length] as string} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(v: number) => formatVal(v)}
                        contentStyle={premiumTooltipStyle.contentStyle}
                      />
                      <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </AnimatedChartContainer>
        </div>
      )}
    </CollapsibleModule>
  );
};

export default LancamentosAnalyticsSection;
