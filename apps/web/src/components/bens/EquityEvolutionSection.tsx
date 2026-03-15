import React, { useMemo, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFinancial } from '@/contexts/FinancialContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Asset, AssetType } from '@/types/financial';
import { 
  Building2, 
  Car, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Landmark,
  ChevronRight,
  Filter,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis } from '@/components/charts/premiumChartTheme';

const assetIcons: Record<AssetType, React.ReactNode> = {
  property: <Building2 className="h-4 w-4" />,
  vehicle: <Car className="h-4 w-4" />,
  company: <Landmark className="h-4 w-4" />,
  investment: <TrendingUp className="h-4 w-4" />,
  valuable_objects: <Package className="h-4 w-4" />,
  intellectual_property: <Package className="h-4 w-4" />,
  licenses_software: <Package className="h-4 w-4" />,
  rights: <TrendingUp className="h-4 w-4" />,
  obligations: <TrendingDown className="h-4 w-4" />,
  other: <Package className="h-4 w-4" />,
};

const assetTypeLabels: Record<AssetType, string> = {
  property: 'Imóvel',
  vehicle: 'Veículo',
  company: 'Empresa',
  investment: 'Investimento',
  valuable_objects: 'Objetos de Valor',
  intellectual_property: 'Propriedade Intelectual',
  licenses_software: 'Licenças/Software',
  rights: 'Direitos',
  obligations: 'Obrigações',
  other: 'Outros',
};

const formatCurrencyBase = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Gera anos de um ano inicial até um ano final
const generateYears = (startYear: number, endYear: number): number[] => {
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }
  return years;
};

// Calcula valor do ativo para um ano específico
const calculateAssetValueForYear = (
  asset: Asset,
  year: number,
  currentDate: Date
): number | null => {
  const currentYear = currentDate.getFullYear();
  
  // Se não tem data de compra, usa valor atual para ano atual e futuros
  if (!asset.purchaseDate) {
    return year <= currentYear ? asset.value : null;
  }
  
  const purchaseDate = new Date(asset.purchaseDate);
  const purchaseYear = purchaseDate.getFullYear();
  const purchaseValue = asset.purchaseValue || asset.value;
  
  // Antes da compra = null (não existia)
  if (year < purchaseYear) {
    return null;
  }
  
  // Se foi vendido
  if (asset.isSold && asset.saleDate) {
    const saleDate = new Date(asset.saleDate);
    const saleYear = saleDate.getFullYear();
    
    // Após a venda = null (não possui mais)
    if (year > saleYear) {
      return null;
    }
    
    // No ano da venda = valor de venda
    if (year === saleYear) {
      return asset.saleValue || 0;
    }
    
    // Entre compra e venda: interpolar
    const totalYears = saleYear - purchaseYear;
    const saleValue = asset.saleValue || 0;
    
    if (totalYears <= 0) {
      return saleValue;
    }
    
    const yearsFromPurchase = year - purchaseYear;
    const yearlyChange = (saleValue - purchaseValue) / totalYears;
    return Math.round(purchaseValue + (yearlyChange * yearsFromPurchase));
  }
  
  // Não vendido: interpolar até o presente, projetar para o futuro
  const currentValue = asset.value;
  const yearsFromPurchaseToNow = currentYear - purchaseYear;
  const yearsFromPurchase = year - purchaseYear;
  
  // Ano da compra
  if (year === purchaseYear) {
    return purchaseValue;
  }
  
  // Ano atual
  if (year === currentYear) {
    return currentValue;
  }
  
  // Calcular taxa de valorização/depreciação anual
  if (yearsFromPurchaseToNow > 0) {
    const yearlyRate = (currentValue - purchaseValue) / yearsFromPurchaseToNow;
    
    // Anos passados: interpolar
    if (year < currentYear) {
      return Math.round(purchaseValue + (yearlyRate * yearsFromPurchase));
    }
    
    // Anos futuros: projetar
    const projectedValue = purchaseValue + (yearlyRate * yearsFromPurchase);
    
    // Para veículos, não deixar depreciar abaixo de 20% do valor de compra
    if (asset.type === 'vehicle') {
      return Math.round(Math.max(projectedValue, purchaseValue * 0.2));
    }
    
    return Math.round(projectedValue);
  }
  
  // Comprou neste ano
  return currentValue;
};

interface EquityEvolutionSectionProps {
  className?: string;
}

export const EquityEvolutionSection: React.FC<EquityEvolutionSectionProps> = ({ className }) => {
  const isMobile = useIsMobile();
  const { config } = useFinancial();
  const { isHidden } = useVisibility();
  const [filterType, setFilterType] = useState<AssetType | 'all'>('all');
  const [showSold, setShowSold] = useState(true);
  
  const formatCurrency = (value: number) => isHidden ? '••••••' : formatCurrencyBase(value);
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  // Determinar range de anos baseado nos ativos
  const { startYear, endYear, years } = useMemo(() => {
    let minYear = currentYear;
    let maxYear = currentYear;
    
    config.assets.forEach(asset => {
      if (asset.purchaseDate) {
        const purchaseYear = new Date(asset.purchaseDate).getFullYear();
        if (purchaseYear < minYear) minYear = purchaseYear;
      }
      if (asset.isSold && asset.saleDate) {
        const saleYear = new Date(asset.saleDate).getFullYear();
        if (saleYear > maxYear) maxYear = saleYear;
      }
    });
    
    // Projetar até 2056
    const projectionEndYear = 2056;
    
    return {
      startYear: minYear,
      endYear: projectionEndYear,
      years: generateYears(minYear, projectionEndYear)
    };
  }, [config.assets, currentYear]);
  
  // Filtrar ativos (excluir investimentos - eles têm visualização separada)
  const filteredAssets = useMemo(() => {
    let assets = config.assets.filter(a => a.type !== 'investment');
    
    if (filterType !== 'all') {
      assets = assets.filter(a => a.type === filterType);
    }
    
    if (!showSold) {
      assets = assets.filter(a => !a.isSold);
    }
    
    // Separar ativos e vendidos
    const activeAssets = assets.filter(a => !a.isSold);
    const soldAssets = assets.filter(a => a.isSold);
    
    // Ordenar ativos por valor (decrescente)
    activeAssets.sort((a, b) => b.value - a.value);
    
    // Ordenar vendidos por data de venda (mais recente primeiro)
    soldAssets.sort((a, b) => {
      if (!a.saleDate && !b.saleDate) return 0;
      if (!a.saleDate) return 1;
      if (!b.saleDate) return -1;
      return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
    });
    
    // Retornar ativos primeiro, depois vendidos
    return [...activeAssets, ...soldAssets];
  }, [config.assets, filterType, showSold]);
  
  // Calcular totais por ano
  const yearlyTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    
    years.forEach(year => {
      let total = 0;
      filteredAssets.forEach(asset => {
        const value = calculateAssetValueForYear(asset, year, currentDate);
        if (value !== null) {
          // Obrigações são negativas
          if (asset.type === 'obligations') {
            total -= value;
          } else {
            total += value;
          }
        }
      });
      totals[year] = total;
    });
    
    return totals;
  }, [filteredAssets, years, currentDate]);
  
  // Tipos disponíveis para filtro
  const availableTypes = useMemo(() => {
    const types = new Set<AssetType>();
    config.assets.filter(a => a.type !== 'investment').forEach(a => types.add(a.type));
    return Array.from(types);
  }, [config.assets]);
  
  if (filteredAssets.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-0">
          <EmptyState
            icon={<Package className="h-6 w-6 text-muted-foreground" />}
            description="Você ainda não cadastrou nenhum bem para exibir evolução"
            actionLabel="Adicionar primeiro bem"
            onAction={() => {
              const event = new CustomEvent('navigate-tab', { detail: 'patrimonio' });
              window.dispatchEvent(event);
            }}
          />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Tabela de Evolução */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução Patrimonial Anual
          </CardTitle>
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select 
                value={filterType} 
                onValueChange={(v) => setFilterType(v as AssetType | 'all')}
              >
                <SelectTrigger className="h-7 w-[140px] text-xs">
                  <SelectValue placeholder="Tipo de ativo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos os tipos</SelectItem>
                  {availableTypes.map(type => (
                    <SelectItem key={type} value={type} className="text-xs">
                      {assetTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant={showSold ? "default" : "outline"} 
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setShowSold(!showSold)}
            >
              {showSold ? 'Ocultar vendidos' : 'Mostrar vendidos'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                    Ativo
                  </TableHead>
                  {years.map(year => (
                    <TableHead 
                      key={year} 
                      className={cn(
                        "text-center min-w-[100px]",
                        year === currentYear && "bg-primary/10 font-bold",
                        year > currentYear && "bg-muted/30 text-muted-foreground"
                      )}
                    >
                      {year}
                      {year > currentYear && (
                        <span className="block text-[10px] font-normal">(Projeção)</span>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map(asset => (
                  <TableRow key={asset.id} className={asset.isSold ? "opacity-60" : ""}>
                    <TableCell className="sticky left-0 bg-background z-10">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-accent/50">
                          {assetIcons[asset.type]}
                        </div>
                        <div>
                          <p className="font-medium text-sm truncate max-w-[150px]">
                            {asset.name}
                          </p>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {assetTypeLabels[asset.type]}
                            </span>
                            {asset.isSold && (
                              <Badge variant="secondary" className="text-[10px] px-1">
                                Vendido
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {years.map(year => {
                      const value = calculateAssetValueForYear(asset, year, currentDate);
                      const prevValue = calculateAssetValueForYear(asset, year - 1, currentDate);
                      const isPositiveChange = prevValue !== null && value !== null && value > prevValue;
                      const isNegativeChange = prevValue !== null && value !== null && value < prevValue;
                      
                      return (
                        <TableCell 
                          key={year}
                          className={cn(
                            "text-center text-sm",
                            year === currentYear && "bg-primary/5 font-medium",
                            year > currentYear && "bg-muted/20 text-muted-foreground",
                            value === null && "text-muted-foreground/50",
                            asset.type === 'obligations' && value !== null && "text-expense"
                          )}
                        >
                          {value !== null ? (
                            <div className="flex flex-col items-center">
                              <span className={cn(
                                isPositiveChange && "text-income",
                                isNegativeChange && asset.type !== 'obligations' && "text-expense"
                              )}>
                                {formatCurrency(value)}
                              </span>
                              {prevValue !== null && value !== prevValue && (
                                <span className={cn(
                                  "text-[10px]",
                                  isPositiveChange ? "text-income" : "text-expense"
                                )}>
                                  {isPositiveChange ? '+' : ''}
                                  {((value - prevValue) / prevValue * 100).toFixed(1)}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                
                {/* Linha de Total */}
                <TableRow className="font-bold border-t-2 border-border">
                  <TableCell className="sticky left-0 bg-muted z-20 border-t-2 border-border">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span>Total Patrimônio</span>
                    </div>
                  </TableCell>
                  {years.map(year => {
                    const total = yearlyTotals[year] || 0;
                    const prevTotal = yearlyTotals[year - 1];
                    const isPositiveChange = prevTotal !== undefined && total > prevTotal;
                    const isNegativeChange = prevTotal !== undefined && total < prevTotal;
                    
                    return (
                      <TableCell 
                        key={year}
                        className={cn(
                          "text-center bg-muted border-t-2 border-border",
                          year === currentYear && "bg-primary/20",
                          year > currentYear && "bg-muted"
                        )}
                      >
                        <div className="flex flex-col items-center">
                          <span className={cn(
                            total >= 0 ? "text-income" : "text-expense"
                          )}>
                            {formatCurrency(total)}
                          </span>
                          {prevTotal !== undefined && total !== prevTotal && (
                            <span className={cn(
                              "text-[10px]",
                              isPositiveChange ? "text-income" : "text-expense"
                            )}>
                              {isPositiveChange ? '+' : ''}
                              {prevTotal !== 0 
                                ? ((total - prevTotal) / Math.abs(prevTotal) * 100).toFixed(1) + '%'
                                : 'N/A'
                              }
                            </span>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Gráfico de Evolução */}
      <Card>
        <CardHeader className="p-3 sm:pb-3 sm:px-6 sm:pt-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary shrink-0" />
            <span className="min-w-0 truncate">Gráfico de Evolução Patrimonial</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="h-48 sm:h-64 w-full overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={years.map(year => ({
                  year,
                  total: yearlyTotals[year] || 0,
                  isProjection: year > currentYear
                }))}
                margin={{ top: 25, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid {...premiumGrid} />
                <XAxis 
                  dataKey="year" 
                  {...premiumXAxis}
                  interval="preserveStartEnd"
                />
                <YAxis
                  hide={isMobile}
                  {...premiumYAxis}
                  tickFormatter={(value) => {
                    if (isHidden) return '••••';
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return value.toString();
                  }}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const value = payload[0].value as number;
                      const isProj = label > currentYear;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold text-foreground">
                            {label} {isProj && <span className="text-xs text-muted-foreground">(Projeção)</span>}
                          </p>
                          <p className={cn("text-lg font-bold", value >= 0 ? "text-income" : "text-expense")}>
                            {isHidden ? '••••••' : formatCurrencyBase(value)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine 
                  x={currentYear} 
                  stroke="hsl(var(--primary))" 
                  strokeDasharray="5 5"
                  label={{ 
                    value: 'Hoje', 
                    position: 'insideTopRight',
                    fill: 'hsl(var(--primary))',
                    fontSize: 11,
                    offset: 5
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Legenda — wrap em mobile para não sobrepor */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-primary/20 border border-primary/40" />
          <span>Ano atual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-muted border border-muted-foreground/30" />
          <span>Projeção</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-income font-semibold">+%</span>
          <span>Valorização</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-expense font-semibold">−%</span>
          <span>Depreciação</span>
        </div>
      </div>
    </div>
  );
};
