import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Target, Building2, Car, TrendingUp, Package, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Asset, AssetType } from '@/types/financial';
import { useIsMobile } from '@/hooks/use-mobile';

type ViewMode = 'month' | 'year';

interface AssetsByType {
  [key: string]: Asset[];
}

interface AssetEvolutionTableProps {
  assets: Asset[];
  assetsByType: AssetsByType;
  allMonths: string[];
  allYears: string[];
  currentMonth: string;
  currentDate: Date;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  monthNav: {
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    isMobile: boolean;
    isDragging: boolean;
    centerOnCurrentMonth: () => void;
    handlers: Record<string, (e: React.MouseEvent | React.TouchEvent) => void>;
  };
  getManualAssetEntry: (month: string, assetId: string) => number | undefined;
  calculateAssetValueForMonth: (asset: Asset, month: string) => number;
  handleValueChange: (month: string, assetId: string, value: number) => void;
  getMonthlyTotal: (month: string) => number;
  isProjection: (month: string) => boolean;
  assetTypes: { value: string; label: string }[];
}

const assetIcons: Record<AssetType, React.ReactNode> = {
  property: <Building2 className="h-4 w-4" />,
  vehicle: <Car className="h-4 w-4" />,
  company: <Building2 className="h-4 w-4" />,
  investment: <TrendingUp className="h-4 w-4" />,
  valuable_objects: <Package className="h-4 w-4" />,
  intellectual_property: <Package className="h-4 w-4" />,
  licenses_software: <Package className="h-4 w-4" />,
  rights: <TrendingUp className="h-4 w-4" />,
  obligations: <TrendingDown className="h-4 w-4" />,
  other: <Package className="h-4 w-4" />,
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatMonthLabel = (month: string) => {
  const [year, monthNum] = month.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(monthNum) - 1]}/${year.slice(2)}`;
};

export const AssetEvolutionTable: React.FC<AssetEvolutionTableProps> = ({
  assets,
  assetsByType,
  allMonths,
  allYears,
  currentMonth,
  currentDate,
  viewMode,
  setViewMode,
  monthNav,
  getManualAssetEntry,
  calculateAssetValueForMonth,
  handleValueChange,
  getMonthlyTotal,
  isProjection,
  assetTypes,
}) => {
  const isMobile = useIsMobile();

  if (assets.length === 0) return null;

  const periods = viewMode === 'month' ? allMonths : allYears;
  
  // Find a future projection period (6 months ahead or last period)
  const futureIndex = Math.min(periods.indexOf(currentMonth) + 6, periods.length - 1);
  const futurePeriod = periods[Math.max(futureIndex, 0)] || periods[periods.length - 1];

  const getValueForPeriod = (asset: Asset, period: string) => {
    const manualValue = getManualAssetEntry(period, asset.id);
    if (manualValue !== undefined) return manualValue;
    return calculateAssetValueForMonth(asset, period);
  };

  const getAssetVariation = (asset: Asset) => {
    const firstValue = getValueForPeriod(asset, periods[0]);
    const lastValue = getValueForPeriod(asset, periods[periods.length - 1]);
    return lastValue - firstValue;
  };

  const getTotalVariation = () => {
    const firstTotal = getMonthlyTotal(periods[0]);
    const lastTotal = getMonthlyTotal(periods[periods.length - 1]);
    return lastTotal - firstTotal;
  };

  // Mobile Card View
  if (isMobile) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-5 w-5 text-primary" />
                Evolução Patrimonial
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Acompanhe a evolução do seu patrimônio
              </CardDescription>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
              <TabsList className="w-full h-8">
                <TabsTrigger value="month" className="text-xs flex-1 h-7">Mensal</TabsTrigger>
                <TabsTrigger value="year" className="text-xs flex-1 h-7">Anual</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Asset Cards */}
          {Object.entries(assetsByType).map(([type, typeAssets]) => {
            if (typeAssets.length === 0) return null;
            const typeLabel = assetTypes.find(t => t.value === type)?.label || type;
            
            return (
              <div key={type} className="space-y-2">
                {/* Type Header */}
                <div className="flex items-center gap-2 py-1.5 px-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">{assetIcons[type as AssetType]}</span>
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    {typeLabel}
                  </span>
                </div>
                
                {/* Asset Cards */}
                {typeAssets.map(asset => {
                  const currentValue = getValueForPeriod(asset, currentMonth);
                  const futureValue = getValueForPeriod(asset, futurePeriod);
                  const variation = getAssetVariation(asset);
                  const isPositive = variation >= 0;
                  
                  return (
                    <Card key={asset.id} className="border border-border/40 shadow-none">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          {/* Left: Icon + Name + Current Value */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-primary">{assetIcons[asset.type]}</span>
                              <h4 className="font-semibold text-sm text-foreground truncate">
                                {asset.name}
                              </h4>
                            </div>
                            <div className="space-y-1">
                              <p className="text-lg font-bold text-foreground">
                                {formatCurrency(currentValue)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Atual ({formatMonthLabel(currentMonth)})
                              </p>
                            </div>
                          </div>
                          
                          {/* Right: Variation Badge */}
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "shrink-0 text-xs font-semibold px-2 py-1",
                              isPositive 
                                ? "text-income border-income/30 bg-income/5" 
                                : "text-expense border-expense/30 bg-expense/5"
                            )}
                          >
                            {isPositive ? '+' : ''}{formatCurrency(variation)}
                          </Badge>
                        </div>
                        
                        {/* Projection Line */}
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Projeção {formatMonthLabel(futurePeriod)}:</span>
                            <span className="ml-1 text-foreground font-semibold">
                              {formatCurrency(futureValue)}
                            </span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })}
          
          {/* Total Card */}
          <Card className="border-2 border-primary/20 bg-primary/5 shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Total Geral
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(getMonthlyTotal(currentMonth))}
                  </p>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-sm font-bold px-3 py-1.5",
                    getTotalVariation() >= 0 
                      ? "text-income border-income/30 bg-income/10" 
                      : "text-expense border-expense/30 bg-expense/10"
                  )}
                >
                  {getTotalVariation() >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {getTotalVariation() >= 0 ? '+' : ''}{formatCurrency(getTotalVariation())}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    );
  }

  // Desktop Table View - Minimalist Financial Design
  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Evolução Patrimonial
            </CardTitle>
            <CardDescription>
              Acompanhe a evolução do seu patrimônio {viewMode === 'month' ? 'mês a mês' : 'ano a ano até 2056'}
              {viewMode === 'year' && <span className="text-primary font-semibold ml-1">*</span>}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="h-8">
              <TabsList className="h-8">
                <TabsTrigger value="month" className="text-xs px-3 h-7">Visão Mês</TabsTrigger>
                <TabsTrigger value="year" className="text-xs px-3 h-7">Visão Ano</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="sm"
              onClick={monthNav.centerOnCurrentMonth}
              className="gap-1"
            >
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">{viewMode === 'month' ? 'Mês Atual' : 'Ano Atual'}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <div className="flex">
          {/* Fixed Left Column - Item */}
          <div className="flex-shrink-0 border-r border-border/40 bg-card z-10 w-44">
            {/* Header */}
            <div className="px-3 py-2 font-medium text-muted-foreground text-xs border-b border-border/30 h-12 flex items-center bg-muted/30">
              Item
            </div>
            {/* Rows */}
            {Object.entries(assetsByType).map(([type, typeAssets]) => {
              if (typeAssets.length === 0) return null;
              const typeLabel = assetTypes.find(t => t.value === type)?.label || type;
              return (
                <React.Fragment key={type}>
                  <div className="bg-muted/50 border-l-4 border-l-primary/60 px-3 py-1.5 font-semibold text-foreground text-xs uppercase tracking-wide">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      {assetIcons[type as AssetType]}
                      <span className="text-foreground">{typeLabel}</span>
                    </span>
                  </div>
                  {typeAssets.map(asset => (
                    <div key={asset.id} className="px-3 py-1.5 text-xs border-b border-border/20 h-10 flex items-center bg-card">
                      <div className="truncate text-foreground">
                        {asset.name}
                        {asset.description && viewMode === 'month' && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({asset.description})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              );
            })}
            {/* Total Row */}
            <div className="bg-muted/50 border-l-4 border-l-primary px-3 py-2 font-bold text-sm h-11 flex items-center">
              TOTAL
            </div>
          </div>

          {/* Scrollable Center Area */}
          {viewMode === 'month' ? (
            <div 
              ref={monthNav.scrollContainerRef}
              className={cn(
                "flex-1 overflow-x-auto cursor-grab select-none",
                monthNav.isDragging && "cursor-grabbing"
              )}
              {...monthNav.handlers}
            >
              <div style={{ minWidth: `${allMonths.length * 90}px` }}>
                {/* Header */}
                <div className="flex border-b border-border/30 h-12 bg-muted/30">
                  {allMonths.map(period => {
                    const isCurrentPeriod = period === currentMonth;
                    
                    return (
                      <div 
                        key={period} 
                        className={cn(
                          "flex-shrink-0 w-[90px] text-center px-1 py-2 font-medium text-xs flex flex-col justify-center",
                          isCurrentPeriod 
                            ? "bg-primary/10 font-bold text-foreground border-b-2 border-primary" 
                            : "text-muted-foreground"
                        )}
                      >
                        {formatMonthLabel(period)}
                        {isCurrentPeriod && (
                          <div className="text-[10px] font-normal text-primary">(Atual)</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Rows */}
                {Object.entries(assetsByType).map(([type, typeAssets]) => {
                  if (typeAssets.length === 0) return null;
                  return (
                    <React.Fragment key={type}>
                      <div className="bg-muted/30 h-8" />
                      {typeAssets.map(asset => {
                        return (
                          <div key={asset.id} className="flex border-b border-border/20 h-10 bg-card">
                            {allMonths.map(period => {
                              const isCurrentPeriod = period === currentMonth;
                              const value = getValueForPeriod(asset, period);
                              
                              return (
                                <div 
                                  key={period} 
                                  className={cn(
                                    "flex-shrink-0 w-[90px] px-1 py-1 flex items-center",
                                    isCurrentPeriod && "bg-primary/5"
                                  )}
                                >
                                  <CurrencyInput
                                    compact
                                    className="text-xs h-7 px-1.5 w-full bg-transparent border-border/30 hover:border-border/60 focus:border-primary"
                                    value={value}
                                    onChange={(val) => handleValueChange(period, asset.id, val)}
                                    placeholder="0"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                {/* Total Row */}
                <div className="flex bg-muted/30 h-11">
                  {allMonths.map(period => {
                    const total = getMonthlyTotal(period);
                    const isCurrentPeriod = period === currentMonth;
                    
                    return (
                      <div 
                        key={period} 
                        className={cn(
                          "flex-shrink-0 w-[90px] px-2 py-2 text-right text-foreground text-sm font-bold flex items-center justify-end",
                          isCurrentPeriod && "bg-primary/10"
                        )}
                      >
                        {formatCurrency(total)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <div style={{ minWidth: `${allYears.length * 80}px` }}>
                {/* Header */}
                <div className="flex border-b border-border/30 h-12 bg-muted/30">
                  {allYears.map(period => {
                    const year = parseInt(period.split('-')[0]);
                    const isCurrentYear = year === currentDate.getFullYear();
                    
                    return (
                      <div 
                        key={period} 
                        className={cn(
                          "flex-shrink-0 w-20 text-center px-1 py-2 font-medium text-xs flex flex-col justify-center",
                          isCurrentYear 
                            ? "bg-primary/10 font-bold text-foreground border-b-2 border-primary" 
                            : "text-muted-foreground"
                        )}
                      >
                        {year}
                        {isCurrentYear && (
                          <div className="text-[10px] font-normal text-primary">(Atual)</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Rows */}
                {Object.entries(assetsByType).map(([type, typeAssets]) => {
                  if (typeAssets.length === 0) return null;
                  return (
                    <React.Fragment key={type}>
                      <div className="bg-muted/30 h-8" />
                      {typeAssets.map(asset => {
                        return (
                          <div key={asset.id} className="flex border-b border-border/20 h-10 bg-card">
                            {allYears.map(period => {
                              const year = parseInt(period.split('-')[0]);
                              const isCurrentYear = year === currentDate.getFullYear();
                              const value = getValueForPeriod(asset, period);
                              
                              return (
                                <div 
                                  key={period} 
                                  className={cn(
                                    "flex-shrink-0 w-20 px-1 py-1 flex items-center justify-end",
                                    isCurrentYear && "bg-primary/5"
                                  )}
                                >
                                  <span className="text-xs font-medium text-foreground">
                                    {formatCurrency(value)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                {/* Total Row */}
                <div className="flex bg-muted/30 h-11">
                  {allYears.map(period => {
                    const total = getMonthlyTotal(period);
                    const year = parseInt(period.split('-')[0]);
                    const isCurrentYear = year === currentDate.getFullYear();
                    
                    return (
                      <div 
                        key={period} 
                        className={cn(
                          "flex-shrink-0 w-20 px-2 py-2 text-right text-foreground text-sm font-bold flex items-center justify-end",
                          isCurrentYear && "bg-primary/10"
                        )}
                      >
                        {formatCurrency(total)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Fixed Right Column - Variation */}
          <div className="flex-shrink-0 border-l border-border/40 bg-card z-10 w-24">
            {/* Header */}
            <div className="px-2 py-2 font-medium text-muted-foreground text-xs border-b border-border/30 h-12 flex items-center justify-center text-center bg-muted/30">
              Variação
            </div>
            {/* Rows */}
            {Object.entries(assetsByType).map(([type, typeAssets]) => {
              if (typeAssets.length === 0) return null;
              return (
                <React.Fragment key={type}>
                  <div className="bg-muted/30 h-8" />
                  {typeAssets.map(asset => {
                    const firstValue = getValueForPeriod(asset, periods[0]);
                    const lastValue = getValueForPeriod(asset, periods[periods.length - 1]);
                    const variation = lastValue - firstValue;
                    const variationPercent = firstValue > 0 ? ((variation / firstValue) * 100).toFixed(1) : '0';
                    const isPositive = variation >= 0;
                    
                    return (
                      <div 
                        key={asset.id} 
                        className={cn(
                          "px-2 py-1.5 text-right font-semibold text-xs border-b border-border/20 h-10 flex flex-col justify-center bg-card",
                          isPositive ? "text-income" : "text-expense"
                        )}
                      >
                        {isPositive ? '+' : ''}{formatCurrency(variation)}
                        <div className="text-[10px] opacity-70 font-normal">
                          ({isPositive ? '+' : ''}{variationPercent}%)
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
            {/* Total Row */}
            <div className="bg-muted/30 px-2 py-2 text-right text-sm font-bold h-11 flex items-center justify-end">
              {(() => {
                const variation = getTotalVariation();
                const isPositive = variation >= 0;
                return (
                  <span className={cn(
                    "flex items-center gap-1",
                    isPositive ? "text-income" : "text-expense"
                  )}>
                    {isPositive ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {isPositive ? '+' : ''}{formatCurrency(variation)}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center px-4">
          Arraste a área central para navegar pelos {viewMode === 'month' ? 'meses' : 'anos'}
        </p>
        {viewMode === 'year' && (
          <p className="text-xs mt-1 text-center px-4">
            <span className="text-primary font-semibold">*</span>
            <span className="text-muted-foreground ml-1">
              Valores de referência em 01 de janeiro de cada ano
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};
