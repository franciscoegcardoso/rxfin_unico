import React, { useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppLayout } from '@/components/layout/AppLayout';
import { useFinancial } from '@/contexts/FinancialContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { isBillPaymentTransaction } from '@/hooks/useBillPaymentReconciliation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Building2,
  PiggyBank,
  LineChart as LineChartIcon,
  Settings2,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Car,
  Package,
  Filter,
  X,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltipComponent,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis, premiumTooltipStyle } from '@/components/charts/premiumChartTheme';
import { AssetType } from '@/types/financial';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';

// Historical data for the last 15 years (2010-2024) - CDI data from BACEN
const historicalData: Record<number, { ipca: number; igpm: number; ibovespa: number; cdi: number }> = {
  2010: { ipca: 5.91, igpm: 11.32, ibovespa: 1.04, cdi: 9.75 },
  2011: { ipca: 6.50, igpm: 5.10, ibovespa: -18.11, cdi: 11.60 },
  2012: { ipca: 5.84, igpm: 7.82, ibovespa: 7.40, cdi: 8.40 },
  2013: { ipca: 5.91, igpm: 5.51, ibovespa: -15.50, cdi: 8.06 },
  2014: { ipca: 6.41, igpm: 3.69, ibovespa: -2.91, cdi: 10.81 },
  2015: { ipca: 10.67, igpm: 10.54, ibovespa: -13.31, cdi: 13.24 },
  2016: { ipca: 6.29, igpm: 7.17, ibovespa: 38.93, cdi: 14.00 },
  2017: { ipca: 2.95, igpm: -0.52, ibovespa: 26.86, cdi: 9.93 },
  2018: { ipca: 3.75, igpm: 7.55, ibovespa: 15.03, cdi: 6.42 },
  2019: { ipca: 4.31, igpm: 7.30, ibovespa: 31.58, cdi: 5.97 },
  2020: { ipca: 4.52, igpm: 23.14, ibovespa: 2.92, cdi: 2.76 },
  2021: { ipca: 10.06, igpm: 17.78, ibovespa: -11.93, cdi: 4.42 },
  2022: { ipca: 5.79, igpm: 5.45, ibovespa: 4.69, cdi: 12.39 },
  2023: { ipca: 4.62, igpm: -3.18, ibovespa: 22.28, cdi: 13.04 },
  2024: { ipca: 4.83, igpm: 6.54, ibovespa: -10.36, cdi: 10.87 },
};

type IndexType = 'ipca' | 'igpm' | 'ibovespa' | 'cdi' | 'custom';

const indexLabels: Record<IndexType, string> = {
  ipca: 'IPCA',
  igpm: 'IGP-M',
  ibovespa: 'Ibovespa',
  cdi: 'CDI',
  custom: 'Personalizado',
};

const formatCurrencyBase = (value: number) => {
  if (value === 0) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatAccounting = (value: number): string => {
  if (value === 0) return '-';
  const formatted = Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return value < 0 ? `(${formatted})` : formatted;
};

const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

// Generate years from 2021 to 2056
const generateYears = (): number[] => {
  const years: number[] = [];
  for (let year = 2021; year <= 2056; year++) {
    years.push(year);
  }
  return years;
};

// Calculate average of historical index for last N years
const calculateAverageIndex = (index: 'ipca' | 'igpm' | 'ibovespa' | 'cdi', years: number = 5): number => {
  const availableYears = Object.keys(historicalData).map(Number).sort((a, b) => b - a).slice(0, years);
  const sum = availableYears.reduce((acc, year) => acc + historicalData[year][index], 0);
  return sum / availableYears.length;
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
  obligations: <TrendingDown className="h-3 w-3" />,
  other: <Package className="h-3 w-3" />,
};

// Calculate asset value for a specific year (January 1st)
const calculateAssetValueForYear = (
  asset: {
    type: AssetType;
    value: number;
    purchaseDate?: string;
    purchaseValue?: number;
  },
  targetYear: number,
  currentYear: number,
  projectionRate: number
): number => {
  const currentValue = asset.value;
  const purchaseValue = asset.purchaseValue || asset.value;
  const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;
  const purchaseYear = purchaseDate ? purchaseDate.getFullYear() : currentYear;

  // If target year is before purchase year, return 0
  if (purchaseDate && targetYear < purchaseYear) {
    return 0;
  }

  // For current year, return current value
  if (targetYear === currentYear) {
    return currentValue;
  }

  // Years from current to target
  const yearsFromCurrent = targetYear - currentYear;

  if (asset.type === 'vehicle') {
    // Vehicles depreciate over time
    // Calculate monthly depreciation rate based on purchase value and current value
    if (purchaseDate && purchaseValue > currentValue) {
      const monthsFromPurchase = (currentYear - purchaseYear) * 12 + new Date().getMonth();
      const monthlyDepreciation = monthsFromPurchase > 0 
        ? (purchaseValue - currentValue) / monthsFromPurchase 
        : 0;
      
      if (targetYear < currentYear) {
        // Historical value - interpolate
        const monthsToTarget = (currentYear - targetYear) * 12;
        return Math.round(currentValue + (monthlyDepreciation * monthsToTarget));
      } else {
        // Future value - depreciate further
        const monthsToTarget = yearsFromCurrent * 12;
        const projectedValue = currentValue - (monthlyDepreciation * monthsToTarget);
        // Minimum value is 20% of current
        return Math.round(Math.max(projectedValue, currentValue * 0.2));
      }
    }
    // If no purchase data, assume 8% annual depreciation
    const depreciationRate = 0.08;
    if (yearsFromCurrent > 0) {
      return Math.round(currentValue * Math.pow(1 - depreciationRate, yearsFromCurrent));
    } else {
      return Math.round(currentValue * Math.pow(1 + depreciationRate, Math.abs(yearsFromCurrent)));
    }
  }

  // For properties and investments - appreciate with projection rate
  const rate = projectionRate / 100;
  if (yearsFromCurrent > 0) {
    // Future projection
    const appreciationRate = asset.type === 'property' ? rate * 0.8 : rate * 1.2;
    return Math.round(currentValue * Math.pow(1 + appreciationRate, yearsFromCurrent));
  } else {
    // Historical - calculate backwards
    const appreciationRate = asset.type === 'property' ? rate * 0.8 : rate * 1.2;
    return Math.round(currentValue / Math.pow(1 + appreciationRate, Math.abs(yearsFromCurrent)));
  }
};

const PlanejamentoAnual: React.FC = () => {
  const isMobile = useIsMobile();
  const { config, getMonthlyEntry } = useFinancial();
  const { isHidden } = useVisibility();
  const { lancamentos, getLancamentosByMonth, isMonthConsolidated } = useLancamentosRealizados();
  
  const formatCurrency = (value: number) => {
    if (value === 0) return '-';
    if (isHidden) return '••••••';
    return formatCurrencyBase(value);
  };
  const [isPatrimonyExpanded, setIsPatrimonyExpanded] = useState(false);
  
  // Filter states - default to no filter (null)
  const [startYear, setStartYear] = useState<number | null>(null);
  const [endYear, setEndYear] = useState<number | null>(null);
  
  // Projection settings
  const [selectedIndex, setSelectedIndex] = useState<IndexType>('ipca');
  const [spread, setSpread] = useState<number>(2); // Default: IPCA + 2%
  const [averageYears, setAverageYears] = useState<number>(5);
  
  const currentYear = new Date().getFullYear();
  const allYears = useMemo(() => generateYears(), []);
  
  // Filtered years based on start/end filter
  const filteredYears = useMemo(() => {
    let years = allYears;
    if (startYear !== null) {
      years = years.filter(y => y >= startYear);
    }
    if (endYear !== null) {
      years = years.filter(y => y <= endYear);
    }
    return years;
  }, [allYears, startYear, endYear]);
  
  const isFilterActive = startYear !== null || endYear !== null;
  
  const clearFilter = () => {
    setStartYear(null);
    setEndYear(null);
  };
  
  const enabledIncomeItems = config.incomeItems.filter(item => item.enabled);
  const enabledExpenseItems = config.expenseItems.filter(item => item.enabled);

  // Calculate the projection rate based on selected index
  const projectionRate = useMemo(() => {
    if (selectedIndex === 'custom') return spread;
    const avgRate = calculateAverageIndex(selectedIndex, averageYears);
    return avgRate + spread;
  }, [selectedIndex, spread, averageYears]);

  // Check if a year has any consolidated data
  const getYearConsolidationStatus = (year: number): 'consolidated' | 'partial' | 'projected' => {
    let consolidatedMonths = 0;
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      if (isMonthConsolidated(monthStr)) {
        consolidatedMonths++;
      }
    }
    if (consolidatedMonths === 12) return 'consolidated';
    if (consolidatedMonths > 0) return 'partial';
    return 'projected';
  };

  // Get consolidated income for a specific month
  const getConsolidatedMonthlyIncome = (monthStr: string): number => {
    const monthLancamentos = getLancamentosByMonth(monthStr);
    return monthLancamentos
      .filter(l => l.tipo === 'receita')
      .reduce((sum, l) => sum + l.valor_realizado, 0);
  };

  // Get consolidated expense for a specific month
  const getConsolidatedMonthlyExpense = (monthStr: string): number => {
    const monthLancamentos = getLancamentosByMonth(monthStr);
    return monthLancamentos
      .filter(l => l.tipo === 'despesa' && !isBillPaymentTransaction(l))
      .reduce((sum, l) => sum + l.valor_realizado, 0);
  };

  // Calculate annual totals - using consolidated data when available
  const getAnnualIncome = (year: number): { total: number; consolidatedMonths: number } => {
    let total = 0;
    let consolidatedMonths = 0;
    
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      
      // Check if month has consolidated data
      if (isMonthConsolidated(monthStr)) {
        total += getConsolidatedMonthlyIncome(monthStr);
        consolidatedMonths++;
      } else {
        // Use projected data from monthly entries
        enabledIncomeItems.forEach(item => {
          const value = getMonthlyEntry(monthStr, item.id, 'income');
          // If no entry, use default value from asset if available
          if (value === 0 && item.isAssetGenerated && item.defaultValue) {
            total += item.defaultValue;
          } else {
            total += value;
          }
        });
      }
    }
    return { total, consolidatedMonths };
  };

  const getAnnualExpense = (year: number): { total: number; consolidatedMonths: number } => {
    let total = 0;
    let consolidatedMonths = 0;
    
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      
      // Check if month has consolidated data
      if (isMonthConsolidated(monthStr)) {
        total += getConsolidatedMonthlyExpense(monthStr);
        consolidatedMonths++;
      } else {
        // Use projected data from monthly entries
        enabledExpenseItems.forEach(item => {
          const value = getMonthlyEntry(monthStr, item.id, 'expense');
          // If no entry, use default value from asset if available
          if (value === 0 && item.isAssetGenerated && item.defaultValue) {
            // Check frequency for annual expenses
            if (item.frequency === 'annual' && item.annualMonths) {
              const monthNum = parseInt(monthStr.split('-')[1]);
              if (item.annualMonths.includes(monthNum)) {
                total += item.defaultValue;
              }
            } else {
              total += item.defaultValue;
            }
          } else {
            total += value;
          }
        });
      }
    }
    return { total, consolidatedMonths };
  };

  // Calculate patrimony for a specific year using asset-specific projections
  const getAnnualPatrimony = (year: number): number => {
    return config.assets.reduce((sum, asset) => {
      return sum + calculateAssetValueForYear(asset, year, currentYear, projectionRate);
    }, 0);
  };

  // Get individual asset value for a year
  const getAssetValueForYear = (assetId: string, year: number): number => {
    const asset = config.assets.find(a => a.id === assetId);
    if (!asset) return 0;
    return calculateAssetValueForYear(asset, year, currentYear, projectionRate);
  };

  // Project future values based on selected index
  const calculateProjectedValues = (year: number) => {
    const isProjection = year > currentYear;
    const consolidationStatus = getYearConsolidationStatus(year);
    
    if (!isProjection) {
      const incomeData = getAnnualIncome(year);
      const expenseData = getAnnualExpense(year);
      const balance = incomeData.total - expenseData.total;
      const patrimony = getAnnualPatrimony(year);
      return { 
        income: incomeData.total, 
        expense: expenseData.total, 
        balance, 
        patrimony, 
        isProjection: false,
        consolidationStatus,
        consolidatedIncomeMonths: incomeData.consolidatedMonths,
        consolidatedExpenseMonths: expenseData.consolidatedMonths,
      };
    }

    const baseYear = currentYear;
    const baseIncomeData = getAnnualIncome(baseYear);
    const baseExpenseData = getAnnualExpense(baseYear);
    const baseIncome = baseIncomeData.total || 120000;
    const baseExpense = baseExpenseData.total || 96000;
    
    // Use projection rate for income and expense
    const rate = projectionRate / 100;
    const yearsFromBase = year - baseYear;
    
    const projectedIncome = baseIncome * Math.pow(1 + rate, yearsFromBase);
    const projectedExpense = baseExpense * Math.pow(1 + rate * 0.8, yearsFromBase);
    
    // Calculate patrimony using asset-specific logic
    const projectedPatrimony = getAnnualPatrimony(year);
    
    return {
      income: Math.round(projectedIncome),
      expense: Math.round(projectedExpense),
      balance: Math.round(projectedIncome - projectedExpense),
      patrimony: Math.round(projectedPatrimony),
      isProjection: true,
      consolidationStatus: 'projected' as const,
      consolidatedIncomeMonths: 0,
      consolidatedExpenseMonths: 0,
    };
  };

  // Calculate current year values
  const currentYearValues = useMemo(() => {
    return calculateProjectedValues(currentYear);
  }, [currentYear, projectionRate]);

  // Generate chart data for filtered years
  const chartData = useMemo(() => {
    return filteredYears.map(year => {
      const values = calculateProjectedValues(year);
      return {
        year,
        income: values.income,
        expense: values.expense,
        balance: values.balance,
        patrimony: values.patrimony,
        isProjection: year > currentYear,
        consolidationStatus: values.consolidationStatus,
      };
    });
  }, [filteredYears, projectionRate, lancamentos]);

  // Chart data filtered for income/expense chart (only prev, current, next year)
  const incomeExpenseChartData = useMemo(() => {
    const threeYears = [currentYear - 1, currentYear, currentYear + 1];
    return threeYears.map(year => {
      const values = calculateProjectedValues(year);
      return {
        year,
        income: values.income,
        expense: values.expense,
        balance: values.balance,
        isProjection: year > currentYear,
      };
    });
  }, [currentYear, projectionRate, lancamentos]);

  const isProjectionYear = (year: number) => year > currentYear;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header with Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Projeção 30 Anos</h1>
              <p className="text-muted-foreground mt-1">
                Projeção de longo prazo baseada em índices econômicos (IPCA, IGP-M, CDI, Ibovespa)
              </p>
            </div>
            <VisibilityToggle />
            <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.projecao30Anos} />
          </div>
          
          {/* Year Range Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtro:</span>
            </div>
            <Select 
              value={startYear?.toString() || "__all__"} 
              onValueChange={(v) => setStartYear(v === "__all__" ? null : parseInt(v))}
            >
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue placeholder="Início" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {allYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-sm">até</span>
            <Select 
              value={endYear?.toString() || "__all__"} 
              onValueChange={(v) => setEndYear(v === "__all__" ? null : parseInt(v))}
            >
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue placeholder="Fim" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {allYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isFilterActive && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2" 
                onClick={clearFilter}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-income/10 border-income/30">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-income/20 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 text-income" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] text-muted-foreground">Receitas ({currentYear})</p>
                  {currentYearValues.consolidationStatus === 'consolidated' && (
                    <CheckCircle2 className="h-3 w-3 text-income" />
                  )}
                  {currentYearValues.consolidationStatus === 'partial' && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-amber-600 border-amber-300">
                      {currentYearValues.consolidatedIncomeMonths}/12
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-bold text-income truncate">{formatCurrency(currentYearValues.income)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-expense/10 border-expense/30">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-expense/20 flex items-center justify-center shrink-0">
                <TrendingDown className="h-4 w-4 text-expense" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] text-muted-foreground">Despesas ({currentYear})</p>
                  {currentYearValues.consolidationStatus === 'consolidated' && (
                    <CheckCircle2 className="h-3 w-3 text-income" />
                  )}
                  {currentYearValues.consolidationStatus === 'partial' && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-amber-600 border-amber-300">
                      {currentYearValues.consolidatedExpenseMonths}/12
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-bold text-expense truncate">{formatCurrency(currentYearValues.expense)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            "border",
            currentYearValues.balance >= 0 ? "bg-income/5 border-income/20" : "bg-expense/5 border-expense/20"
          )}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                currentYearValues.balance >= 0 ? "bg-income/20" : "bg-expense/20"
              )}>
                <DollarSign className={cn("h-4 w-4", currentYearValues.balance >= 0 ? "text-income" : "text-expense")} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Saldo ({currentYear})</p>
                <p className={cn("text-sm font-bold truncate", currentYearValues.balance >= 0 ? "text-income" : "text-expense")}>
                  {formatCurrency(currentYearValues.balance)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Patrimônio Atual</p>
                <p className="text-sm font-bold text-primary truncate">
                  {formatCurrency(config.assets.reduce((sum, a) => sum + a.value, 0))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Source Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground px-1">
          <span className="font-medium">Legenda:</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-income" />
            Consolidado
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-amber-500" />
            Parcial
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            Planejado
          </span>
          <span className="flex items-center gap-1 text-primary/70">
            <span className="text-[9px] bg-primary/10 px-1 rounded">proj</span>
            Projeção
          </span>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expense Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Evolução de Receitas e Despesas
              </CardTitle>
              <CardDescription>
                Comparativo anual de receitas e despesas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={incomeExpenseChartData}>
                  <CartesianGrid {...premiumGrid} />
                  <XAxis 
                    dataKey="year" 
                    {...premiumXAxis}
                  />
                  <YAxis
                    hide={isMobile}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    {...premiumYAxis}
                  />
                  <RechartsTooltipComponent 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Ano: ${label}`}
                    contentStyle={premiumTooltipStyle.contentStyle}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    name="Receitas"
                    stroke="hsl(var(--income))" 
                    fill="hsl(var(--income))"
                    fillOpacity={0.2}
                    strokeWidth={3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expense" 
                    name="Despesas"
                    stroke="hsl(var(--expense))" 
                    fill="hsl(var(--expense))"
                    fillOpacity={0.2}
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Patrimony Evolution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Evolução do Patrimônio
              </CardTitle>
              <CardDescription>
                Projeção patrimonial ao longo dos anos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="patrimonyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...premiumGrid} />
                  <XAxis 
                    dataKey="year" 
                    {...premiumXAxis}
                  />
                  <YAxis
                    hide={isMobile}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    {...premiumYAxis}
                  />
                  <RechartsTooltipComponent 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Ano: ${label}`}
                    contentStyle={premiumTooltipStyle.contentStyle}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="patrimony" 
                    name="Patrimônio"
                    stroke="hsl(var(--primary))" 
                    fill="url(#patrimonyGradient)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Annual Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-primary" />
              Balanço Anual
            </CardTitle>
            <CardDescription>
              Consolidação de receitas, despesas e patrimônio por ano
              <span className="ml-2 text-primary text-xs">(Anos futuros são projeções)</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="flex">
              {/* Fixed first column - Categoria */}
              <div className="flex-shrink-0 border-r border-border bg-card z-10 w-24">
                {/* Header */}
                <div className="py-2 px-2 font-semibold text-muted-foreground border-b border-border h-9 flex items-center text-xs">
                  Categoria
                </div>
                {/* Income */}
                <div className="py-2 px-2 font-medium border-b border-border h-8 flex items-center text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-income" />
                    <span>Receitas</span>
                  </div>
                </div>
                {/* Expense */}
                <div className="py-2 px-2 font-medium border-b border-border h-8 flex items-center text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-expense" />
                    <span>Despesas</span>
                  </div>
                </div>
                {/* Balance */}
                <div className="py-2 px-2 font-semibold border-b border-border bg-muted/30 h-8 flex items-center text-xs">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-primary" />
                    <span>Saldo</span>
                  </div>
                </div>
                {/* Patrimony */}
                <div 
                  className="py-2 px-2 font-medium h-8 flex items-center cursor-pointer hover:bg-accent/50 text-xs"
                  onClick={() => setIsPatrimonyExpanded(!isPatrimonyExpanded)}
                >
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-primary" />
                    <span>Patrimônio</span>
                    {config.assets.length > 0 && (
                      isPatrimonyExpanded 
                        ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
                        : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {/* Expanded Assets */}
                {isPatrimonyExpanded && config.assets.map(asset => (
                  <div key={asset.id} className="py-1 px-2 pl-6 text-xs bg-muted/20 h-7 flex items-center border-b border-border/30">
                    <div className="flex items-center gap-1">
                      {assetIcons[asset.type]}
                      <span className="truncate max-w-[60px]" title={asset.name}>
                        {asset.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Scrollable years area */}
              <div className="flex-1 overflow-x-auto">
                <div style={{ minWidth: `${filteredYears.length * 70}px` }}>
                  {/* Header - Years with consolidation status */}
                  <div className="flex border-b border-border h-9">
                    {filteredYears.map(year => {
                      const status = getYearConsolidationStatus(year);
                      const isProj = isProjectionYear(year);
                      return (
                        <TooltipProvider key={year}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className={cn(
                                  "flex-shrink-0 w-[70px] text-center py-1 px-1 font-semibold text-xs flex flex-col items-center justify-center gap-0.5",
                                  isProj ? "text-primary/70 bg-primary/5" : "text-muted-foreground",
                                  year === currentYear && "bg-accent text-foreground"
                                )}
                              >
                                <span>{year}</span>
                                {!isProj && (
                                  <span className="flex items-center">
                                    {status === 'consolidated' && (
                                      <CheckCircle2 className="h-2.5 w-2.5 text-income" />
                                    )}
                                    {status === 'partial' && (
                                      <AlertCircle className="h-2.5 w-2.5 text-amber-500" />
                                    )}
                                    {status === 'projected' && (
                                      <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                                    )}
                                  </span>
                                )}
                                {isProj && (
                                  <span className="text-[9px] text-primary/50">proj</span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {isProj ? (
                                <span>Projeção baseada nos parâmetros</span>
                              ) : status === 'consolidated' ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-income" />
                                  12/12 meses consolidados
                                </span>
                              ) : status === 'partial' ? (
                                <span className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 text-amber-500" />
                                  Dados parcialmente consolidados
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  Sem dados consolidados
                                </span>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                  {/* Income Row */}
                  <div className="flex border-b border-border h-8">
                    {filteredYears.map(year => {
                      const values = calculateProjectedValues(year);
                      return (
                        <div 
                          key={year} 
                          className={cn(
                            "flex-shrink-0 w-[70px] text-center py-1 px-1 text-xs flex items-center justify-center",
                            isProjectionYear(year) ? "bg-primary/5 text-income/70" : "text-income",
                            year === currentYear && "bg-accent"
                          )}
                        >
                          {formatAccounting(values.income)}
                        </div>
                      );
                    })}
                  </div>
                  {/* Expense Row */}
                  <div className="flex border-b border-border h-8">
                    {filteredYears.map(year => {
                      const values = calculateProjectedValues(year);
                      return (
                        <div 
                          key={year} 
                          className={cn(
                            "flex-shrink-0 w-[70px] text-center py-1 px-1 text-xs flex items-center justify-center",
                            isProjectionYear(year) ? "bg-primary/5 text-expense/70" : "text-expense",
                            year === currentYear && "bg-accent"
                          )}
                        >
                          {formatAccounting(values.expense)}
                        </div>
                      );
                    })}
                  </div>
                  {/* Balance Row */}
                  <div className="flex border-b border-border bg-muted/30 h-8">
                    {filteredYears.map(year => {
                      const values = calculateProjectedValues(year);
                      return (
                        <div 
                          key={year} 
                          className={cn(
                            "flex-shrink-0 w-[70px] text-center py-1 px-1 font-bold text-xs flex items-center justify-center",
                            values.balance >= 0 ? "text-income" : "text-expense",
                            isProjectionYear(year) && "bg-primary/5 opacity-70",
                            year === currentYear && "bg-accent"
                          )}
                        >
                          {formatAccounting(values.balance)}
                        </div>
                      );
                    })}
                  </div>
                  {/* Patrimony Row */}
                  <div className="flex h-8">
                    {filteredYears.map(year => {
                      const values = calculateProjectedValues(year);
                      return (
                        <div 
                          key={year} 
                          className={cn(
                            "flex-shrink-0 w-[70px] text-center py-1 px-1 text-xs flex items-center justify-center",
                            isProjectionYear(year) ? "bg-primary/5 text-primary/70" : "text-primary",
                            year === currentYear && "bg-accent"
                          )}
                        >
                          {formatAccounting(values.patrimony)}
                        </div>
                      );
                    })}
                  </div>
                  {/* Expanded Asset Rows */}
                  {isPatrimonyExpanded && config.assets.map(asset => (
                    <div key={asset.id} className="flex bg-muted/20 h-7 border-b border-border/30">
                      {filteredYears.map(year => {
                        const value = getAssetValueForYear(asset.id, year);
                        const isVehicle = asset.type === 'vehicle';
                        const prevYearValue = year > filteredYears[0] 
                          ? getAssetValueForYear(asset.id, year - 1) 
                          : value;
                        const variation = value - prevYearValue;
                        const isDepreciating = variation < 0;
                        
                        return (
                          <div 
                            key={year} 
                            className={cn(
                              "flex-shrink-0 w-[70px] text-center py-1 px-1 text-xs flex items-center justify-center",
                              isProjectionYear(year) && "bg-primary/5",
                              year === currentYear && "bg-accent",
                              isVehicle && isProjectionYear(year) && isDepreciating 
                                ? "text-expense/70" 
                                : "text-muted-foreground"
                            )}
                          >
                            {formatAccounting(value)}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center px-4">
              Arraste a área de anos para navegar horizontalmente
            </p>
          </CardContent>
        </Card>

        {/* Projection Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Configuração da Projeção
            </CardTitle>
            <CardDescription>
              Escolha o índice base e adicione um spread para calcular as projeções futuras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Index Selector */}
              <div className="space-y-2">
                <Label>Índice Base</Label>
                <Select value={selectedIndex} onValueChange={(v) => setSelectedIndex(v as IndexType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cdi">CDI (Taxa de Juros)</SelectItem>
                    <SelectItem value="ipca">IPCA (Inflação Oficial)</SelectItem>
                    <SelectItem value="igpm">IGP-M (Inflação de Mercado)</SelectItem>
                    <SelectItem value="ibovespa">Ibovespa (Bolsa)</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Spread */}
              <div className="space-y-2">
                <Label>Spread (% a.a.)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={spread}
                  onChange={(e) => setSpread(parseFloat(e.target.value) || 0)}
                  className="text-right"
                />
              </div>

              {/* Average Years */}
              <div className="space-y-2">
                <Label>Média dos últimos</Label>
                <Select value={averageYears.toString()} onValueChange={(v) => setAverageYears(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 anos</SelectItem>
                    <SelectItem value="5">5 anos</SelectItem>
                    <SelectItem value="10">10 anos</SelectItem>
                    <SelectItem value="15">15 anos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Result */}
              <div className="space-y-2">
                <Label>Taxa de Projeção</Label>
                <div className="h-10 px-3 py-2 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <span className="font-bold text-primary text-lg">
                    {projectionRate.toFixed(2)}% a.a.
                  </span>
                </div>
              </div>
            </div>

            {/* Historical Index Table with Projections */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Histórico e Projeção das Taxas</h4>
              <div className="flex">
                {/* Fixed first column - Índice */}
                <div className="flex-shrink-0 border-r border-border bg-card z-10 w-20">
                  {/* Header */}
                  <div className="py-2 px-2 font-semibold text-muted-foreground border-b border-border h-9 flex items-center text-xs">
                    Índice
                  </div>
                  {/* Index rows */}
                  {(['cdi', 'ipca', 'igpm', 'ibovespa'] as const).map(index => (
                    <div 
                      key={index}
                      className={cn(
                        "py-2 px-2 font-medium border-b border-border h-8 flex items-center text-xs",
                        selectedIndex === index && "bg-primary/5 text-primary"
                      )}
                    >
                      {indexLabels[index]}
                    </div>
                  ))}
                </div>

                {/* Scrollable area */}
                <div className="flex-1 overflow-x-auto">
                  {(() => {
                    // Filter historical years based on filter
                    const historicalYears = Object.keys(historicalData)
                      .map(Number)
                      .sort((a, b) => a - b)
                      .filter(year => {
                        if (startYear !== null && year < startYear) return false;
                        if (endYear !== null && year > endYear) return false;
                        return true;
                      });
                    
                    // Filter projection years based on filter
                    const maxProjectionYear = endYear !== null ? Math.min(endYear, 2056) : 2056;
                    const minProjectionYear = startYear !== null ? Math.max(startYear, currentYear) : currentYear;
                    const projectionYears = minProjectionYear <= maxProjectionYear 
                      ? Array.from({ length: maxProjectionYear - minProjectionYear + 1 }, (_, i) => minProjectionYear + i)
                      : [];
                    
                    const totalColumns = historicalYears.length + 1 + projectionYears.length;
                    
                    return (
                      <div style={{ minWidth: `${totalColumns * 70}px` }}>
                        {/* Header row */}
                        <div className="flex border-b border-border h-9">
                          {/* Historical years */}
                          {historicalYears.map(year => (
                            <div key={year} className="flex-shrink-0 w-[70px] text-center py-2 px-1 font-semibold text-muted-foreground text-xs flex items-center justify-center">
                              {year}
                            </div>
                          ))}
                          {/* Average column */}
                          <div className="flex-shrink-0 w-[70px] text-center py-2 px-1 font-semibold text-primary bg-primary/10 text-xs flex items-center justify-center">
                            Média {averageYears}a
                          </div>
                          {/* Projection years */}
                          {projectionYears.map(year => (
                            <div key={`proj-${year}`} className="flex-shrink-0 w-[70px] text-center py-2 px-1 font-semibold text-primary/70 bg-primary/5 text-xs flex items-center justify-center">
                              {year}
                            </div>
                          ))}
                        </div>
                        {/* Data rows */}
                        {(['cdi', 'ipca', 'igpm', 'ibovespa'] as const).map(index => (
                          <div 
                            key={index}
                            className={cn(
                              "flex border-b border-border h-8",
                              selectedIndex === index && "bg-primary/5"
                            )}
                          >
                            {/* Historical values */}
                            {historicalYears.map(year => (
                              <div 
                                key={year}
                                className={cn(
                                  "flex-shrink-0 w-[70px] text-center py-1 px-1 text-xs flex items-center justify-center",
                                  historicalData[year][index] >= 0 ? "text-income" : "text-expense"
                                )}
                              >
                                {formatPercent(historicalData[year][index])}
                              </div>
                            ))}
                            {/* Average */}
                            <div className={cn(
                              "flex-shrink-0 w-[70px] text-center py-1 px-1 font-bold bg-primary/10 text-xs flex items-center justify-center",
                              calculateAverageIndex(index, averageYears) >= 0 ? "text-income" : "text-expense"
                            )}>
                              {formatPercent(calculateAverageIndex(index, averageYears))}
                            </div>
                            {/* Projection values */}
                            {projectionYears.map(year => {
                              const avg = calculateAverageIndex(index, averageYears);
                              return (
                                <div 
                                  key={`proj-${year}`}
                                  className={cn(
                                    "flex-shrink-0 w-[70px] text-center py-1 px-1 text-xs bg-primary/5 flex items-center justify-center",
                                    avg >= 0 ? "text-income/70" : "text-expense/70"
                                  )}
                                >
                                  {formatPercent(avg)}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Arraste a área de dados para navegar • Projeções usam a média dos últimos {averageYears} anos
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Projection Notes */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <PiggyBank className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">Sobre as projeções</p>
                <p className="text-sm text-muted-foreground">
                  Projeções calculadas com <strong className="text-primary">{selectedIndex === 'custom' ? 'taxa personalizada' : indexLabels[selectedIndex]}</strong>
                  {selectedIndex !== 'custom' && <> (média {averageYears} anos: {calculateAverageIndex(selectedIndex, averageYears).toFixed(2)}%)</>}
                  {spread !== 0 && <> + spread de <strong className="text-primary">{spread}%</strong></>}
                  {' = '}<strong className="text-primary">{projectionRate.toFixed(2)}% a.a.</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Receitas crescem pela taxa completa, despesas por 80% da taxa, e patrimônio por 120% da taxa.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PlanejamentoAnual;
