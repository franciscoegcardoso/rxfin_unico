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
  GitCompare,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePluggyInvestments, InvestmentCategory, InvestmentCategoryData } from '@/hooks/usePluggyInvestments';
import { useInvestmentsList } from '@/hooks/useInvestmentsList';
import { usePortfolioPerformance } from '@/hooks/usePortfolioPerformance';
import { groupInvestments } from '@/utils/groupInvestments';
import { InvestmentSyncAlert } from '@/components/investimentos/InvestmentSyncAlert';
import { InvestmentOnboardingCard } from '@/components/investimentos/InvestmentOnboardingCard';
import { InteractiveTreemap, TreemapItem } from '@/components/charts/InteractiveTreemap';
import { InvestimentoGrupoHeader } from '@/components/investimentos/InvestimentoGrupoHeader';
import { InvestimentoTabela } from '@/components/investimentos/InvestimentoTabela';
import { InvestimentoRowMobile } from '@/components/investimentos/InvestimentoRowMobile';
import { PainelFiscal } from '@/components/investimentos/PainelFiscal';
import { PainelIndexador } from '@/components/investimentos/PainelIndexador';
import { PainelMoedas } from '@/components/investimentos/PainelMoedas';
import { GraficoEvolucao } from '@/components/investimentos/GraficoEvolucao';
import { TabelaEvolucaoAnual } from '@/components/investimentos/TabelaEvolucaoAnual';
import { RentabilidadeComparada } from '@/components/investimentos/RentabilidadeComparada';
import { VisoesComplementares } from '@/components/investimentos/VisoesComplementares';
import type { PluggyInvestment } from '@/hooks/useBensInvestimentos';
import type { BensInvestimentosSummary } from '@/hooks/useBensInvestimentos';
import type { InvestmentGroupView } from '@/components/investimentos/types';
import {
  collectFundamentalAssetCodes,
  useAssetFundamentalsByCodes,
} from '@/hooks/useAssetFundamentals';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatPercent = (value: number | null) =>
  value != null ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%` : '—';

function mapManualInvestmentToListItem(
  item: {
    id: string;
    name: string;
    type: string;
    subtype?: string | null;
    gross_balance?: number | null;
    net_balance?: number | null;
    balance_date?: string | null;
    maturity_date?: string | null;
    institution?: string | null;
    ticker?: string | null;
    logo_url?: string | null;
    company_domain?: string | null;
  }
): PluggyInvestment {
  const type = (item.type ?? 'OTHER').toUpperCase();
  const balance = item.net_balance ?? item.gross_balance ?? 0;
  return {
    id: `manual-${item.id}`,
    display_name: item.name,
    full_name: item.name,
    ticker: item.ticker ?? undefined,
    name: item.name,
    type,
    subtype: item.subtype ?? null,
    balance,
    amount_original: 0,
    amount_profit: null,
    fixed_annual_rate: null,
    annual_rate: null,
    index_name: null,
    due_date: item.maturity_date ?? null,
    issue_date: item.balance_date ?? null,
    issuer: item.institution ?? 'Manual',
    taxes: null,
    status: 'ACTIVE',
    code: item.ticker ?? null,
    logo_url: item.logo_url ?? null,
    company_domain: item.company_domain ?? null,
    isin: null,
    quantity: 1,
    unit_value: null,
    currency_code: 'BRL',
    balance_updated_at: item.balance_date ?? null,
    suspect_zero: false,
    source: 'pluggy',
    connector_name: 'Manual',
    connector_image_url: null,
    ir_retido: 0,
    iof_retido: 0,
    ir_exempt: type === 'PENSION_VGBL' || type === 'PENSION_PGBL',
    ir_regime: null,
    ir_rate_pct: null,
    rate_type: null,
    last_twelve_months_rate: null,
    last_month_rate: null,
  };
}

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

function getGroupMeta(label: string): { colorKey: InvestmentGroupView['colorKey'] } {
  if (label === 'Renda Fixa') return { colorKey: 'emerald' };
  if (label === 'Ações') return { colorKey: 'blue' };
  if (label === 'FIIs') return { colorKey: 'amber' };
  if (label === 'Fundos') return { colorKey: 'purple' };
  if (label === 'ETFs') return { colorKey: 'cyan' };
  if (label === 'BDRs') return { colorKey: 'rose' };
  if (label === 'Previdência') return { colorKey: 'pink' };
  return { colorKey: 'gray' };
}


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
    snapshotHistory,
    annualEvolution,
    benchmarks,
    performanceSummary,
    pluggyInvestments,
    manualInvestments,
    byIndexador,
    byCurrency,
    fxRates,
  } = usePluggyInvestments();

  const queryClient = useQueryClient();
  const investmentsListQuery = useInvestmentsList();
  const portfolioPerformanceQuery = usePortfolioPerformance();

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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [chartType, setChartType] = useState<'treemap' | 'pie'>('treemap');
  const [showPerformance, setShowPerformance] = useState(false);

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

  const listItemsForGroupedView = useMemo(() => {
    const pluggyItems = pluggyInvestments as PluggyInvestment[];
    const manualItems = manualInvestments.map(mapManualInvestmentToListItem);
    return [...pluggyItems, ...manualItems];
  }, [pluggyInvestments, manualInvestments]);

  const fundamentalCodes = useMemo(
    () => collectFundamentalAssetCodes(listItemsForGroupedView),
    [listItemsForGroupedView],
  );
  const { data: fundamentalsByCode } = useAssetFundamentalsByCodes(fundamentalCodes);

  const redesignedGroups = useMemo<InvestmentGroupView[]>(() => {
    const items = listItemsForGroupedView;
    if (!items.length) return []
    const map = new Map<string, PluggyInvestment[]>()
    for (const item of items) {
      const type = (item.type ?? '').toUpperCase()
      const subtype = (item.subtype ?? '').toUpperCase()
      let key = 'Outros'
      if (type === 'FIXED_INCOME') key = 'Renda Fixa'
      else if (type === 'ETF') key = 'ETFs'
      else if (type === 'MUTUAL_FUND') key = 'Fundos'
      else if (type === 'EQUITY') {
        if (subtype === 'REAL_ESTATE_FUND') key = 'FIIs'
        else if (subtype === 'BDR') key = 'BDRs'
        else key = 'Ações'
      } else if (type.includes('PENSION')) key = 'Previdência'
      else if (type === 'INCOME') key = 'Outros'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return Array.from(map.entries())
      .map(([label, groupItems]) => {
        const totalBalance = groupItems.reduce((sum, i) => sum + (i.balance ?? 0), 0)
        const perfCandidates = groupItems.map((i) => i.last_twelve_months_rate).filter((v): v is number => v != null)
        const perf12m = perfCandidates.length ? perfCandidates.reduce((a, b) => a + b, 0) / perfCandidates.length : null
        const isStale = groupItems.some((i) => !!i.suspect_zero)
        return {
          label: label as InvestmentGroupView['label'],
          items: groupItems,
          totalBalance,
          perf12m,
          isStale,
          colorKey: getGroupMeta(label).colorKey,
        }
      })
      .sort((a, b) => b.totalBalance - a.totalBalance)
  }, [listItemsForGroupedView]);

  const fiscalSummary = useMemo<BensInvestimentosSummary | null>(() => {
    const total_ir_retido = pluggyInvestments.reduce((sum, i) => sum + Number(i.ir_retido ?? i.taxes ?? 0), 0);
    const total_iof_retido = pluggyInvestments.reduce((sum, i) => sum + Number(i.iof_retido ?? i.taxes2 ?? 0), 0);
    const total_pluggy_balance = pluggyInvestments.reduce((sum, i) => sum + Number(i.balance ?? 0), 0);
    if (total_ir_retido === 0 && total_iof_retido === 0) return null;
    return {
      total_pluggy_balance,
      total_pluggy_profit: 0,
      total_manual_value: totals?.manual_gross ?? 0,
      pluggy_count: pluggyInvestments.length,
      manual_count: totals?.manual_count ?? 0,
      last_pluggy_sync: null,
      has_stale_data: Boolean(totals?.has_stale_data),
      total_ir_retido,
      total_iof_retido,
    };
  }, [pluggyInvestments, totals]);

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

      {fiscalSummary && <PainelFiscal summary={fiscalSummary} />}
      {byIndexador.length > 0 && <PainelIndexador byIndexador={byIndexador} />}
      {byCurrency.length > 1 && <PainelMoedas byCurrency={byCurrency} fxRates={fxRates ?? undefined} />}
      {portfolioPerformanceQuery.data && (
        <SectionErrorBoundary fallbackTitle="Graficos de Bens e Investimentos">
          <Card className="border border-border/80">
            <CardHeader className="pb-2">
              <button
                className="w-full flex items-center justify-between gap-3"
                onClick={() => setShowPerformance((prev) => !prev)}
              >
                <CardTitle className="text-base flex items-center gap-2">
                  <GitCompare className="h-4 w-4 text-primary" />
                  Performance da carteira
                </CardTitle>
                {showPerformance ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {showPerformance && (
              <CardContent className="space-y-4">
                <GraficoEvolucao data={portfolioPerformanceQuery.data} />
                <TabelaEvolucaoAnual data={portfolioPerformanceQuery.data} />
                <RentabilidadeComparada data={portfolioPerformanceQuery.data} />
                <p className="text-[11px] text-muted-foreground">
                  Benchmarks a partir de jun/2025 podem incluir estimativas baseadas em dados publicos.
                </p>
              </CardContent>
            )}
          </Card>
        </SectionErrorBoundary>
      )}

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

          <SectionErrorBoundary fallbackTitle="Graficos de Bens e Investimentos">
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
          </SectionErrorBoundary>
        </CardContent>
      </Card>

      <SectionErrorBoundary fallbackTitle="Graficos de Bens e Investimentos">
        <VisoesComplementares
          snapshotHistory={snapshotHistory}
          annualEvolution={annualEvolution}
          benchmarks={benchmarks}
          performanceSummary={performanceSummary}
        />
      </SectionErrorBoundary>

      {showRpcListSkeleton ? (
        <div className="w-full rounded-xl border border-border bg-card overflow-hidden shadow-sm animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-b border-border p-4 space-y-2">
              <div className="h-5 bg-muted rounded w-1/3" />
              <div className="h-12 bg-muted/60 rounded" />
            </div>
          ))}
        </div>
      ) : redesignedGroups.length > 0 ? (
        <div className="w-full rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          {redesignedGroups.map((group) => {
            const isOpen = openGroups[group.label] ?? true
            const netTotal = totals?.net_total ?? totalBalance
            return (
              <div key={group.label}>
                <InvestimentoGrupoHeader
                  label={group.label}
                  count={group.items.length}
                  totalBalance={group.totalBalance}
                  allocationPct={netTotal > 0 ? (group.totalBalance / netTotal) * 100 : 0}
                  perf12m={group.perf12m}
                  isStale={group.isStale}
                  isOpen={isOpen}
                  onToggle={() => setOpenGroups((prev) => ({ ...prev, [group.label]: !(prev[group.label] ?? true) }))}
                  colorKey={group.colorKey}
                />
                {isOpen && (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <InvestimentoTabela
                        items={group.items}
                        grupoLabel={group.label}
                        totalCarteira={netTotal}
                        colorKey={group.colorKey}
                        fundamentalsByCode={fundamentalsByCode ?? new Map()}
                      />
                    </div>
                    <div className="md:hidden">
                      {group.items.map((item) => (
                        <InvestimentoRowMobile
                          key={item.id}
                          item={item}
                          totalCarteira={netTotal}
                          isOpen={!!openItems[item.id]}
                          onToggle={() => setOpenItems((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                          fundamentalsByCode={fundamentalsByCode ?? new Map()}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      ) : null}

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
