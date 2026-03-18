import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  PiggyBank,
  TrendingUp,
  BarChart3,
  Building2,
  Layers,
  ChevronDown,
  ChevronUp,
  Wallet,
  RefreshCw,
  Filter,
  X,
  User,
  TreesIcon,
  PieChartIcon,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePluggyInvestments, InvestmentCategory, InvestmentCategoryData } from '@/hooks/usePluggyInvestments';
import { useInvestmentsList } from '@/hooks/useInvestmentsList';
import { groupInvestments } from '@/utils/groupInvestments';
import { InvestmentGroupHeader } from '@/components/bens-investimentos/InvestmentGroupHeader';
import { InvestmentListItemRow } from '@/components/bens-investimentos/InvestmentListItemRow';
import { InvestmentSyncAlert } from '@/components/investimentos/InvestmentSyncAlert';
import { InvestmentOnboardingCard } from '@/components/investimentos/InvestmentOnboardingCard';
import { InteractiveTreemap, TreemapItem } from '@/components/charts/InteractiveTreemap';
import { AssetLogo } from '@/components/ui/AssetLogo';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatPercent = (value: number | null) =>
  value != null ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%` : '—';

function pluggyCategoryForGroupLabel(label: string): InvestmentCategory {
  const m: Record<string, InvestmentCategory> = {
    Ações: 'Ações',
    FIIs: 'FIIs',
    ETFs: 'ETFs',
    'Renda Fixa': 'Renda Fixa',
    Fundos: 'Fundos',
    Previdência: 'Outros',
    Outros: 'Outros',
  };
  return m[label] ?? 'Outros';
}

const categoryConfig: Record<InvestmentCategory, { icon: React.ReactNode; color: string; chartColor: string }> = {
  'Renda Fixa': { icon: <PiggyBank className="h-5 w-5" />, color: 'bg-blue-500', chartColor: '#3b82f6' },
  'Ações': { icon: <TrendingUp className="h-5 w-5" />, color: 'bg-green-500', chartColor: '#22c55e' },
  'Fundos': { icon: <BarChart3 className="h-5 w-5" />, color: 'bg-purple-500', chartColor: '#a855f7' },
  'FIIs': { icon: <Building2 className="h-5 w-5" />, color: 'bg-orange-500', chartColor: '#f97316' },
  'ETFs': { icon: <Layers className="h-5 w-5" />, color: 'bg-teal-500', chartColor: '#14b8a6' },
  'Outros': { icon: <Wallet className="h-5 w-5" />, color: 'bg-gray-500', chartColor: '#6b7280' },
};


export interface PluggyInvestmentsSectionProps {
  /** Incrementar após salvar investimento manual para atualizar totais v2 */
  refreshTrigger?: number;
  onAddManual?: () => void;
}

export const PluggyInvestmentsSection: React.FC<PluggyInvestmentsSectionProps> = ({
  refreshTrigger = 0,
  onAddManual,
}) => {
  const { user } = useAuth();
  const {
    categories,
    totalBalance,
    totals,
    summaryByCategory,
    isLoading,
    refetch,
    investments,
    filters,
    setFilters,
    filterOptions,
    hasActiveFilters,
    allInvestments,
    syncAlertRows,
    onboardingStatus,
  } = usePluggyInvestments();

  const queryClient = useQueryClient();
  const investmentsListQuery = useInvestmentsList();

  const rpcItems = investmentsListQuery.data;
  const rpcGrouped = useMemo(() => {
    if (!rpcItems?.length) return null;
    return groupInvestments(rpcItems);
  }, [rpcItems]);

  const hasPluggyListData =
    allInvestments.length > 0 ||
    totalBalance > 0 ||
    categories.some((c) => c.items.length > 0);
  /** Evita lista legada (nome/logo errados) enquanto get_investments_list carrega */
  const showRpcListSkeleton =
    !!user?.id &&
    !rpcItems?.length &&
    investmentsListQuery.isLoading &&
    hasPluggyListData;

  const useRpcListLayout = !!rpcGrouped && rpcGrouped.length > 0;

  const [showOnboardingCard, setShowOnboardingCard] = useState(true);
  const showOnboarding = showOnboardingCard && onboardingStatus?.should_show === true;

  const handleOnboardingDismiss = React.useCallback(async () => {
    setShowOnboardingCard(false);
    if (user?.id) {
      await supabase.rpc('mark_investment_onboarding_seen', { p_user_id: user.id });
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ['investments-list'] });
    }
  }, [user?.id, refetch, queryClient]);

  React.useEffect(() => {
    if (refreshTrigger > 0) {
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ['investments-list'] });
    }
  }, [refreshTrigger, refetch, queryClient]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [chartType, setChartType] = useState<'treemap' | 'pie'>('treemap');

  const treemapData: TreemapItem[] = useMemo(() => {
    if (rpcGrouped && rpcGrouped.length > 0) {
      return rpcGrouped.map((g) => {
        const catKey = pluggyCategoryForGroupLabel(g.label);
        const color = categoryConfig[catKey]?.chartColor ?? '#6b7280';
        return {
          id: g.label,
          name: g.label,
          value: g.totalBalance,
          color,
          children: g.items.map((item) => ({
            id: item.id,
            name: item.display_name,
            value: item.balance,
            color,
          })),
        };
      });
    }
    return categories.map((cat) => ({
      id: cat.category,
      name: cat.category,
      value: cat.totalBalance,
      color: categoryConfig[cat.category]?.chartColor,
      children: cat.items.map((inv) => ({
        id: inv.id,
        name: inv.name || inv.code || 'Sem nome',
        value: inv.balance,
        color: categoryConfig[cat.category]?.chartColor,
      })),
    }));
  }, [categories, rpcGrouped]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const manualCount = totals?.manual_count ?? 0;
  if (allInvestments.length === 0 && !isLoading && syncAlertRows.length === 0 && manualCount === 0) {
    return null;
  }

  if (allInvestments.length === 0 && !isLoading && syncAlertRows.length > 0 && manualCount === 0) {
    return (
      <div className="space-y-4">
        {showOnboarding && onboardingStatus && (
          <InvestmentOnboardingCard onboarding={onboardingStatus} onDismiss={handleOnboardingDismiss} />
        )}
        <InvestmentSyncAlert
          rows={syncAlertRows}
          onRefresh={() => {
            void refetch();
            void queryClient.invalidateQueries({ queryKey: ['investments-list'] });
          }}
        />
      </div>
    );
  }

  const showUserFilter = filterOptions.users.length > 1;
  const showInstitutionFilter = filterOptions.institutions.length > 1;
  const showCategoryFilter = filterOptions.categories.length > 1;
  const hasFiltersAvailable = showUserFilter || showInstitutionFilter || showCategoryFilter;

  return (
    <div className="space-y-4">
      {showOnboarding && onboardingStatus && (
        <InvestmentOnboardingCard onboarding={onboardingStatus} onDismiss={handleOnboardingDismiss} />
      )}
      <InvestmentSyncAlert rows={syncAlertRows} onRefresh={refetch} />

      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Open Finance — Investimentos</p>
              {totals != null ? (
                <TooltipProvider>
                  <div className="space-y-0.5 mt-1">
                    <p className="text-[11px] text-muted-foreground">Valor estimado líquido</p>
                    <p className="text-[10px] text-muted-foreground/90">Inclui ajuste IR est. + lag de cota</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(totals.net_total)}</p>
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-primary/20">
                      <span className="text-[11px] text-muted-foreground">Saldo Open Finance</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex text-muted-foreground hover:text-foreground cursor-help" aria-label="Explicação">
                            <Info className="h-3.5 w-3.5" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[280px]">
                          Saldo reportado pelo banco em tempo real. O valor estimado aplica desconto de IR e defasagem de cota, e pode diferir do valor real de resgate.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">{formatCurrency(totals.gross_total)}</p>
                    {totals.sync_coverage_pct != null && totals.sync_coverage_pct < 100 && (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1" style={{ marginTop: '4px' }}>
                        ⚠ Cobertura Open Finance: {totals.sync_coverage_pct}%
                        {' '}— alguns ativos podem não estar aparecendo.
                      </div>
                    )}
                    {(totals.manual_count ?? 0) > 0 && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1.5 mt-2 pt-2 border-t border-primary/10">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                        Inclui {formatCurrency(totals.manual_gross ?? 0)} em {totals.manual_count} item(ns) cadastrado(s) manualmente
                      </p>
                    )}
                  </div>
                </TooltipProvider>
              ) : (
                <p className="text-3xl font-bold text-primary">{formatCurrency(totalBalance)}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {investments.length} ativos{hasActiveFilters ? ` (de ${allInvestments.length})` : ' sincronizados'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasFiltersAvailable && (
                <Button
                  variant={hasActiveFilters ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filtros
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary-foreground text-primary">
                      {[filters.userId, filters.institution, filters.category].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              )}
              {onAddManual && (
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={onAddManual}>
                  + Adicionar manual
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Filter bar */}
          {showFilters && (
            <div className="mb-4 p-3 rounded-lg bg-background/60 border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Filtrar investimentos</span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({ userId: null, institution: null, category: null })}
                    className="h-6 px-2 text-xs text-muted-foreground gap-1"
                  >
                    <X className="h-3 w-3" />
                    Limpar filtros
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {showUserFilter && (
                  <Select
                    value={filters.userId || 'all'}
                    onValueChange={(v) => setFilters(prev => ({ ...prev, userId: v === 'all' ? null : v }))}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <User className="h-3 w-3 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="Usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      {filterOptions.users.map(u => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {showInstitutionFilter && (
                  <Select
                    value={filters.institution || 'all'}
                    onValueChange={(v) => setFilters(prev => ({ ...prev, institution: v === 'all' ? null : v }))}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <Building2 className="h-3 w-3 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="Instituição" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as instituições</SelectItem>
                      {filterOptions.institutions.map(i => (
                        <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {showCategoryFilter && (
                  <Select
                    value={filters.category || 'all'}
                    onValueChange={(v) => setFilters(prev => ({ ...prev, category: v === 'all' ? null : (v as InvestmentCategory) }))}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <Layers className="h-3 w-3 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {filterOptions.categories.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          {/* Chart type toggle */}
          {treemapData.length > 0 && (
            <div className="flex items-center justify-end mb-2">
              <ToggleGroup
                type="single"
                value={chartType}
                onValueChange={(v) => v && setChartType(v as 'treemap' | 'pie')}
                size="sm"
                className="bg-background/60 border border-border/50 rounded-md p-0.5"
              >
                <ToggleGroupItem value="treemap" aria-label="Treemap" className="h-7 w-7 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  <TreesIcon className="h-3.5 w-3.5" />
                </ToggleGroupItem>
                <ToggleGroupItem value="pie" aria-label="Pizza" className="h-7 w-7 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  <PieChartIcon className="h-3.5 w-3.5" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}

          {/* Chart */}
          {treemapData.length > 0 && chartType === 'treemap' && (
            <InteractiveTreemap
              data={treemapData}
              formatValue={formatCurrency}
              height={200}
              groupSmallItems={false}
            />
          )}

          {treemapData.length > 0 && chartType === 'pie' && (
            <div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={treemapData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      animationDuration={400}
                    >
                      {treemapData.map((entry, index) => (
                        <Cell key={entry.id} fill={entry.color || `hsl(${index * 60}, 70%, 50%)`} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0].payload;
                        const total = treemapData.reduce((s, d) => s + d.value, 0);
                        const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                        return (
                          <div className="bg-card border rounded-lg shadow-lg p-2.5 text-xs">
                            <p className="font-semibold text-sm">{item.name}</p>
                            <p className="text-muted-foreground mt-1">{formatCurrency(item.value)}</p>
                            <p className="text-muted-foreground">{pct}%</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Pie legend */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 text-xs mt-3">
                {treemapData.map((item) => {
                  const total = treemapData.reduce((s, d) => s + d.value, 0);
                  const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
                  return (
                    <div key={item.id} className="flex items-center gap-1.5 p-1.5 rounded">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate flex-1 font-medium">{item.name}</span>
                      <span className="text-muted-foreground shrink-0">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category list — RPC compact layout quando disponível */}
      {showRpcListSkeleton ? (
        <div className="w-full md:max-w-3xl md:mx-auto lg:max-w-4xl rounded-xl border border-border bg-card overflow-hidden shadow-sm animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-b border-border p-4 space-y-2">
              <div className="h-5 bg-muted rounded w-1/3" />
              <div className="h-12 bg-muted/60 rounded" />
            </div>
          ))}
        </div>
      ) : useRpcListLayout && rpcGrouped ? (
        <div className="w-full md:max-w-3xl md:mx-auto lg:max-w-4xl rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          {rpcGrouped.map((g) => {
            const catKey = pluggyCategoryForGroupLabel(g.label);
            const summaryRow = summaryByCategory[catKey];
            const pluggyCat = categories.find((c) => c.category === catKey);
            const netTotal = totals?.net_total ?? totalBalance;
            const allocationPct = netTotal > 0 ? (g.totalBalance / netTotal) * 100 : null;
            const isExpanded = expandedCategories.has(g.label);
            const coverageBadge =
              summaryRow?.sync_coverage_pct != null && summaryRow.sync_coverage_pct < 100
                ? `${summaryRow.sync_coverage_pct}% coberto`
                : undefined;

            return (
              <div key={g.label}>
                <InvestmentGroupHeader
                  label={g.label}
                  count={g.items.length}
                  totalBalance={g.totalBalance}
                  isExpanded={isExpanded}
                  onToggle={() => toggleCategory(g.label)}
                  badge={summaryRow?.has_stale_data ? 'Cota desatualizada' : undefined}
                  coverageBadge={coverageBadge}
                  allocationPercent={allocationPct}
                  avgLast12MonthsRate={pluggyCat?.avgLast12MonthsRate ?? null}
                />
                {isExpanded && (
                  <div className="bg-card">
                    {g.items.map((item) => (
                      <InvestmentListItemRow key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        categories.map((cat) => {
          const config = categoryConfig[cat.category];
          const isExpanded = expandedCategories.has(cat.category);
          const summaryRow = summaryByCategory[cat.category];
          const showGrossNet = summaryRow && summaryRow.gross_net_spread > 0;
          const deltaLabel =
            cat.category === 'Renda Fixa' ? 'IR est.' : cat.category === 'Fundos' ? 'lag de cota' : '';

          return (
            <Card key={cat.category}>
              <button
                onClick={() => toggleCategory(cat.category)}
                className="w-full text-left"
                type="button"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center text-white',
                          config.color
                        )}
                      >
                        {config.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{cat.category}</CardTitle>
                          {summaryRow?.sync_coverage_pct != null && summaryRow.sync_coverage_pct < 100 && (
                            <span
                              title={`${summaryRow.sync_coverage_pct}% dos ativos desta classe foram retornados pelo Open Finance. Verifique o app do banco.`}
                              className="text-[10px] px-1.5 py-0.5 rounded ml-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-400/40"
                              style={{ cursor: 'default' }}
                            >
                              {summaryRow.sync_coverage_pct}% coberto
                            </span>
                          )}
                          {summaryRow?.has_stale_data && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded ml-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-400/40">
                              Cota desatualizada
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {cat.items.length} {cat.items.length === 1 ? 'ativo' : 'ativos'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {showGrossNet && summaryRow ? (
                          <>
                            <p className="text-[11px] text-muted-foreground">Bruto</p>
                            <p className="font-semibold text-sm">{formatCurrency(summaryRow.gross_balance)}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Líq.</p>
                            <p className="font-semibold text-sm">{formatCurrency(summaryRow.net_balance)}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              (−{formatCurrency(summaryRow.gross_net_spread)} {deltaLabel})
                            </p>
                          </>
                        ) : (
                          <p className="font-semibold text-lg">{formatCurrency(cat.totalBalance)}</p>
                        )}
                        <div className="flex items-center gap-2 justify-end mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {cat.allocationPercent.toFixed(1)}%
                          </Badge>
                          {cat.avgLast12MonthsRate != null && (
                            <span
                              className={cn(
                                'text-xs font-medium',
                                cat.avgLast12MonthsRate >= 0 ? 'text-income' : 'text-expense'
                              )}
                            >
                              12m: {formatPercent(cat.avgLast12MonthsRate)}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </button>

              {isExpanded && (
                <CardContent className="pt-0">
                  <Separator className="mb-3" />
                  <div className="space-y-2">
                    {cat.items.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <AssetLogo
                            ticker={inv.code ?? undefined}
                            assetType={inv.type}
                            logoUrl={inv.logo_url}
                            name={inv.name}
                            size="md"
                            showTooltip
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{inv.name}</p>
                            {inv.code && <p className="text-xs text-muted-foreground">{inv.code}</p>}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {inv.issuer && <span>{inv.issuer}</span>}
                              {inv.quantity && inv.unit_value && (
                                <span>
                                  {inv.quantity.toLocaleString('pt-BR')} × {formatCurrency(inv.unit_value)}
                                </span>
                              )}
                              {inv.fixed_annual_rate != null && (
                                <span>Taxa: {inv.fixed_annual_rate.toFixed(2)}% a.a.</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="font-semibold text-sm">{formatCurrency(inv.balance)}</p>
                          <div className="flex items-center gap-2 justify-end text-xs">
                            {inv.last_month_rate != null && (
                              <span
                                className={cn(
                                  inv.last_month_rate >= 0 ? 'text-income' : 'text-expense'
                                )}
                              >
                                1m: {formatPercent(inv.last_month_rate)}
                              </span>
                            )}
                            {inv.last_twelve_months_rate != null && (
                              <span
                                className={cn(
                                  inv.last_twelve_months_rate >= 0 ? 'text-income' : 'text-expense'
                                )}
                              >
                                12m: {formatPercent(inv.last_twelve_months_rate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })
      )}

      {/* Alerta global de posições suspeitas */}
      {totals != null && totals.suspect_zero_total > 0 && (
        <div className="rounded-lg p-3 mt-3 text-[13px] bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-400/50">
          <strong>{totals.suspect_zero_total} posição{totals.suspect_zero_total > 1 ? 'ões' : ''} a confirmar</strong>
          {' '}— A sincronização retornou {totals.suspect_zero_total} ativo{totals.suspect_zero_total > 1 ? 's' : ''} com
          saldo zero que podem ainda ter posição aberta no seu banco. Verifique diretamente no
          app da XP e adicione manualmente se necessário.
        </div>
      )}
    </div>
  );
};
