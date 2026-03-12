import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Building2, Car, TrendingUp, Package, TrendingDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Asset, AssetType } from '@/types/financial';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PatrimonyMonthlyTableProps {
  assets: Asset[];
  months: string[];           // ['2026-01', '2026-02', ... '2026-12']
  currentMonth: string;
  getAssetMonthlyValue: (assetId: string, month: string) => number;
  getMonthlyTotals: (month: string) => {
    totalVehicles: number;
    totalProperties: number;
    totalInvestments: number;
    totalCompanies: number;
    totalOthers: number;
    grandTotal: number;
  };
  formatCurrency: (value: number) => string;
  isHidden?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const formatMonthShort = (month: string): string => {
  const monthNum = parseInt(month.split('-')[1]) - 1;
  return MONTH_LABELS[monthNum];
};

const assetCategoryLabels: Partial<Record<AssetType, string>> = {
  vehicle: 'Veículos',
  property: 'Imóveis',
  investment: 'Investimentos',
  company: 'Empresas',
};

const assetIcons: Record<AssetType, React.ReactNode> = {
  property: <Building2 className="h-3 w-3" />,
  vehicle: <Car className="h-3 w-3" />,
  company: <Building2 className="h-3 w-3" />,
  investment: <TrendingUp className="h-3 w-3" />,
  valuable_objects: <Package className="h-3 w-3" />,
  intellectual_property: <Package className="h-3 w-3" />,
  licenses_software: <Package className="h-3 w-3" />,
  rights: <TrendingUp className="h-3 w-3" />,
  obligations: <TrendingDown className="h-3 w-3 text-expense" />,
  other: <Package className="h-3 w-3" />,
};

// Categorias que serão exibidas como linhas de grupo
const CATEGORY_ORDER: AssetType[] = ['property', 'vehicle', 'investment', 'company'];

// ─── Componente ───────────────────────────────────────────────────────────────

export const PatrimonyMonthlyTable: React.FC<PatrimonyMonthlyTableProps> = ({
  assets,
  months,
  currentMonth,
  getAssetMonthlyValue,
  getMonthlyTotals,
  formatCurrency,
  isHidden = false,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<AssetType>>(new Set());

  const activeAssets = useMemo(
    () => assets.filter(a => !a.isSold),
    [assets]
  );

  const assetsByCategory = useMemo(() => {
    const grouped: Partial<Record<AssetType, Asset[]>> = {};
    for (const asset of activeAssets) {
      const cat = CATEGORY_ORDER.includes(asset.type) ? asset.type : ('other' as AssetType);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat]!.push(asset);
    }
    return grouped;
  }, [activeAssets]);

  const toggleCategory = (cat: AssetType) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const getCategoryTotal = (cat: AssetType, month: string): number => {
    return (assetsByCategory[cat] || []).reduce(
      (sum, a) => sum + getAssetMonthlyValue(a.id, month),
      0
    );
  };

  if (activeAssets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhum bem ou investimento cadastrado.{' '}
        <a href="/bens-investimentos" className="text-primary hover:underline">
          Cadastrar agora
        </a>
      </div>
    );
  }

  const FIXED_COL_WIDTH = 'w-36 min-w-[9rem]';
  const DATA_COL_CLASS = 'flex-shrink-0 w-[72px] text-right text-xs px-1 py-1.5 flex items-center justify-end';

  return (
    <div className="flex text-xs">
      {/* ── Coluna Fixa ────────────────────────────────────────────── */}
      <div className={cn('flex-shrink-0 border-r border-border bg-card z-10', FIXED_COL_WIDTH)}>
        {/* Header */}
        <div className="py-2 px-3 h-9 font-semibold text-muted-foreground border-b border-border flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          Patrimônio
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 text-muted-foreground/60 ml-1" />
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-48">
                Valores projetados mês a mês. Veículos depreciam, imóveis valorizam.
                Valores manuais cadastrados em Bens &amp; Investimentos têm prioridade.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Linha total patrimônio */}
        <div className="py-1.5 px-3 h-8 font-semibold border-b border-border bg-primary/5 flex items-center gap-1 text-primary">
          <TrendingUp className="h-3 w-3" />
          Total
        </div>

        {/* Linhas por categoria */}
        {CATEGORY_ORDER.map(cat => {
          const catAssets = assetsByCategory[cat];
          if (!catAssets?.length) return null;
          const isExpanded = expandedCategories.has(cat);

          return (
            <React.Fragment key={cat}>
              <div
                className="py-1.5 px-3 h-8 border-b border-border/60 font-medium text-foreground flex items-center gap-1.5 cursor-pointer hover:bg-accent/40 transition-colors"
                onClick={() => toggleCategory(cat)}
              >
                <span className="text-muted-foreground">{assetIcons[cat]}</span>
                <span className="flex-1 truncate">{assetCategoryLabels[cat] || cat}</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                  {catAssets.length}
                </Badge>
                {isExpanded
                  ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
              </div>

              {/* Ativos expandidos */}
              {isExpanded && catAssets.map(asset => (
                <div
                  key={asset.id}
                  className="py-1 px-3 pl-7 h-7 border-b border-border/30 bg-muted/20 flex items-center gap-1 text-muted-foreground"
                >
                  <span className="truncate max-w-[7rem]" title={asset.name}>
                    {asset.name}
                  </span>
                  {asset.type === 'vehicle' && (
                    <span className="text-[9px] text-amber-500 ml-auto">dep.</span>
                  )}
                </div>
              ))}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Área Scrollável ────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto">
        <div style={{ minWidth: `${months.length * 72}px` }}>
          {/* Header — meses */}
          <div className="flex border-b border-border h-9">
            {months.map(month => {
              const isCurrent = month === currentMonth;
              const isFuture = month > currentMonth;
              return (
                <div
                  key={month}
                  className={cn(
                    DATA_COL_CLASS,
                    'justify-center font-semibold flex-col gap-0',
                    isCurrent && 'bg-accent text-foreground',
                    isFuture && !isCurrent && 'bg-primary/5 text-primary/70',
                    !isFuture && !isCurrent && 'text-muted-foreground',
                  )}
                >
                  <span>{formatMonthShort(month)}</span>
                  {isFuture && <span className="text-[9px] text-primary/40">proj</span>}
                </div>
              );
            })}
          </div>

          {/* Linha — Total patrimônio */}
          <div className="flex border-b border-border h-8 bg-primary/5">
            {months.map(month => {
              const totals = getMonthlyTotals(month);
              return (
                <div key={month} className={cn(DATA_COL_CLASS, 'font-bold text-primary')}>
                  {isHidden ? '••••' : formatCurrency(totals.grandTotal)}
                </div>
              );
            })}
          </div>

          {/* Linhas por categoria */}
          {CATEGORY_ORDER.map(cat => {
            const catAssets = assetsByCategory[cat];
            if (!catAssets?.length) return null;
            const isExpanded = expandedCategories.has(cat);

            return (
              <React.Fragment key={cat}>
                {/* Total da categoria */}
                <div className="flex border-b border-border/60 h-8">
                  {months.map(month => {
                    const total = getCategoryTotal(cat, month);
                    return (
                      <div
                        key={month}
                        className={cn(
                          DATA_COL_CLASS,
                          'font-medium text-foreground',
                          month === currentMonth && 'bg-accent/30',
                          month > currentMonth && 'text-muted-foreground',
                          cat === 'vehicle' && 'text-amber-700 dark:text-amber-400',
                          cat === 'property' && 'text-income',
                        )}
                      >
                        {isHidden ? '••••' : formatCurrency(total)}
                      </div>
                    );
                  })}
                </div>

                {/* Ativos individuais expandidos */}
                {isExpanded && catAssets.map(asset => (
                  <div key={asset.id} className="flex border-b border-border/30 h-7 bg-muted/20">
                    {months.map(month => {
                      const value = getAssetMonthlyValue(asset.id, month);
                      return (
                        <div
                          key={month}
                          className={cn(
                            DATA_COL_CLASS,
                            'text-muted-foreground',
                            month === currentMonth && 'bg-accent/20',
                          )}
                        >
                          {isHidden ? '••••' : formatCurrency(value)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
