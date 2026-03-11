import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  TrendingDown, 
  Calendar,
  HelpCircle,
  Info,
  Sparkles,
  Loader2,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine,
  ReferenceDot
} from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis } from '@/components/charts/premiumChartTheme';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ParsedHistoryPoint } from '@/hooks/useFipeFullHistory';
import { calculateProjectionFromHistory, HistoricalPricePoint, CohortAnalysisData } from '@/utils/depreciationRegression';
import type { DepreciationEngineResult, ConfidenceLevel, DataMethod, ConsideredModelInfo } from '@/utils/depreciationCoreEngine';
import { ConsideredModelsInfo } from './ConsideredModelsInfo';

interface TimeSeriesDepreciationChartProps {
  priceHistory: ParsedHistoryPoint[];
  currentPrice: number;
  modelName: string;
  modelYear: number;
  loading?: boolean;
  progress?: { current: number; total: number } | null;
  cohortData?: CohortAnalysisData | null;
  /** Optional: Core Engine V2 result for enhanced projection */
  engineV2Result?: DepreciationEngineResult | null;
  /** Lista de modelos considerados na análise agregada */
  consideredModels?: ConsideredModelInfo[];
  /** Nome da família quando usando agregação por família */
  familyName?: string | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyShort = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value}`;
};

const formatCurrencyCompact = (value: number) => {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)} mil`;
  }
  return formatCurrency(value);
};

// Tooltip customizado aprimorado com mais informações
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-xl min-w-[200px]">
        {/* Header com data e badges */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="font-semibold text-foreground">{data.monthLabel}</p>
          <div className="flex items-center gap-1">
            {data.isLaunchPrice && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                Lançamento
              </Badge>
            )}
            {data.isProjection && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-muted-foreground/30">
                <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                Projeção
              </Badge>
            )}
            {data.isLatest && !data.isProjection && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30">
                Atual
              </Badge>
            )}
          </div>
        </div>
        
        {/* Valor principal */}
        <div className={`text-xl font-bold ${data.isProjection ? 'text-muted-foreground' : 'text-primary'}`}>
          {formatCurrency(data.price)}
        </div>
        {data.isProjection && (
          <p className="text-[10px] text-muted-foreground italic">Valor estimado</p>
        )}
        
        {/* Variações */}
        {!data.isProjection && (
          <div className="mt-2 pt-2 border-t border-border space-y-1">
            {data.variationFromPrevious !== undefined && data.variationFromPrevious !== 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">vs. mês anterior:</span>
                <span className={data.variationFromPrevious > 0 ? 'text-income font-medium' : 'text-destructive font-medium'}>
                  {data.variationFromPrevious > 0 ? '+' : ''}{formatCurrency(data.variationFromPrevious)}
                  <span className="ml-1">
                    ({data.variationPercent > 0 ? '+' : ''}{data.variationPercent?.toFixed(2)}%)
                  </span>
                </span>
              </div>
            )}
            {data.totalDepreciation !== undefined && !data.isLaunchPrice && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Desde lançamento:</span>
                <span className={data.totalDepreciation >= 0 ? 'text-income font-medium' : 'text-destructive font-medium'}>
                  {data.totalDepreciation >= 0 ? '+' : ''}{data.totalDepreciation.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Info de projeção */}
        {data.isProjection && data.projectedDepreciation !== undefined && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Depreciação projetada:</span>
              <span className="text-destructive font-medium">
                {data.projectedDepreciation.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Dialog de metodologia - RXFin v5.5
const MethodologyDialog: React.FC<{ 
  periodStart: string;
  periodEnd: string;
  totalPoints: number;
}> = ({ periodStart, periodEnd, totalPoints }) => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
        <HelpCircle className="h-3.5 w-3.5" />
        Ver Metodologia
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Metodologia: Motor de Depreciação v5.5
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4 text-sm">
        {/* Dados Históricos */}
        <div className="p-3 rounded-lg bg-income/10 border border-income/20">
          <h4 className="font-semibold flex items-center gap-2 mb-2 text-income">
            <Info className="h-4 w-4" />
            Dados Históricos (Linha Sólida)
          </h4>
          <p className="text-muted-foreground text-xs">
            Utilizamos os <strong>valores de fechamento de Dezembro</strong> de cada ano da tabela FIPE, 
            garantindo consistência com a Análise de Safra (Cohort Matrix).
          </p>
        </div>
        
        {/* Análise de Coorte */}
        <div>
          <h4 className="font-semibold mb-2">Análise de Coorte (Cohort Analysis)</h4>
          <ul className="text-muted-foreground list-disc list-inside space-y-1 text-xs">
            <li><strong>Idade do veículo (t):</strong> Calculada como t = Ano Calendário - Ano Modelo + 1</li>
            <li><strong>Ano de Lançamento (Y-1):</strong> Preço 0km em Dez do ano anterior ao modelo</li>
            <li><strong>Filtro anti-pandemia:</strong> Anos 2020-2022 ignorados para t ≥ 2</li>
            <li><strong>Normalização:</strong> Um ponto por ano (fechamento de Dezembro)</li>
          </ul>
        </div>

        {/* Regressão Log-Linear */}
        <div>
          <h4 className="font-semibold mb-2">Projeção (Linha Tracejada)</h4>
          <div className="text-muted-foreground text-xs space-y-2">
            <p>A projeção utiliza <strong>Regressão Log-Linear</strong> com os seguintes passos:</p>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>Normalização dos preços para escala logarítmica (LN)</li>
              <li>Ajuste de curva exponencial: P(t) = e^(C) × t^B</li>
              <li>Projeção iterativa: cada valor é o anterior × taxa YoY</li>
              <li>Para modelos estabilizados (retenção Y1→Y2 ≥ 98%): fator +1.02% a.a.</li>
            </ol>
          </div>
        </div>

        {/* Período Coberto */}
        <div>
          <h4 className="font-semibold mb-2">Período Coberto</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-muted">
              <p className="text-muted-foreground">Início (0km)</p>
              <p className="font-semibold">{periodStart}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted">
              <p className="text-muted-foreground">Fim (Atual)</p>
              <p className="font-semibold">{periodEnd}</p>
            </div>
          </div>
        </div>
        
        {/* Hierarquia de Dados */}
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <h4 className="font-semibold flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            Hierarquia de Fontes (Waterfall)
          </h4>
          <ol className="text-xs text-muted-foreground mt-2 list-decimal list-inside space-y-1">
            <li><strong>Nível 1:</strong> Match Exato do modelo ({'>'}10 anos de dados)</li>
            <li><strong>Nível 2:</strong> Família de modelos (anos anteriores do mesmo veículo)</li>
            <li><strong>Nível 3:</strong> Benchmark da marca (média histórica da fabricante)</li>
          </ol>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export const TimeSeriesDepreciationChart: React.FC<TimeSeriesDepreciationChartProps> = ({
  priceHistory,
  currentPrice,
  modelName,
  modelYear,
  loading,
  progress,
  cohortData,
  engineV2Result,
  consideredModels = [],
  familyName,
}) => {
  // State para controlar exibição da projeção (default: false = apenas histórico)
  const [showProjection, setShowProjection] = useState(false);

  // =========================================================================
  // CRITICAL: All hooks MUST be called unconditionally before any returns
  // React Error #310 = "Rendered more hooks than during the previous render"
  // =========================================================================

  // Prepara dados do gráfico com projeção de 5 anos
  // v5.4: Prioriza dados de dezembro para alinhar com cohort matrix e gabarito
  const { chartData, metrics, projectionInfo, timeDomain } = useMemo(() => {
    if (priceHistory.length === 0 || loading) {
      return { chartData: [], metrics: null, projectionInfo: null, timeDomain: null };
    }
    
    // =========================================================================
    // v6.0: Display ALL monthly data points from backend (no December-only filter)
    // The projection remains December-only, but historical data shows full resolution
    // =========================================================================
    const filteredHistory = priceHistory
      .filter(p => p.price > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Monthly points logging removed for production
    
    const firstPrice = filteredHistory[0].price;
    const lastHistoricalPrice = filteredHistory[filteredHistory.length - 1].price;
    
    // Converte para formato compatível com projeção
    const historyForProjection: HistoricalPricePoint[] = filteredHistory.map(p => ({
      date: p.date,
      price: p.price,
      monthLabel: p.monthLabel,
      isLaunchPrice: p.isLaunchPrice,
    }));
    
    // =========================================================================
    // PROJEÇÃO: Usa Core Engine V2 se disponível, senão usa lógica legada
    // =========================================================================
    let projection: ReturnType<typeof calculateProjectionFromHistory>;
    let engineV2Metadata: { 
      methodUsed: DataMethod; 
      confidence: ConfidenceLevel; 
      rSquared: number;
      annualRate: number;
    } | null = null;
    
    if (engineV2Result && engineV2Result.curve.length > 0) {
      // Use Core Engine V2 projection
      const launchYear = modelYear - 1;
      const lastHistoricalDate = filteredHistory[filteredHistory.length - 1].date;
      const lastHistoricalYear = lastHistoricalDate.getUTCFullYear(); // Use UTC to avoid timezone issues
      
      // =========================================================================
      // CRITICAL FIX v6.3: Calculate age correctly for new models (2026 in 2026 = age 0)
      // Formula: currentAge = Max(0, currentYear - launchYear - 1)
      // For T-Cross 2026: launchYear=2025, currentYear=2026 → age = max(0, 2026 - 2025 - 1) = 0
      // =========================================================================
      const currentYear = new Date().getFullYear();
      const currentAge = Math.max(0, currentYear - launchYear - 1);
      
      // Engine V2 debug logging removed for production
      
      // Convert engine curve to projected points (5 years into future)
      const projectedPoints: Array<{ date: Date; price: number; monthLabel: string }> = [];
      
      // v7.2: Fix projection start - if last historical is before December, 
      // first projection should be December of that same year
      const lastHistoricalMonth = lastHistoricalDate.getUTCMonth(); // 0-11
      const projectionStartsThisYear = lastHistoricalMonth < 11; // Not December
      
      for (let year = 1; year <= 5; year++) {
        const targetAge = currentAge + year;
        const curvePoint = engineV2Result.curve.find(p => p.age === targetAge);
        
        // Adjust target year: if last data is before Dec, start projections from same year's December
        const yearOffset = projectionStartsThisYear ? year - 1 : year;
        const targetYear = lastHistoricalYear + yearOffset;
        
        // Projection year logging removed for production
        
        if (curvePoint) {
          const date = new Date(Date.UTC(targetYear, 11, 1)); // December (UTC)
          projectedPoints.push({
            date,
            price: curvePoint.price,
            monthLabel: `Dez/${targetYear}`,
          });
        }
      }
      
      // Build projection object compatible with legacy format
      projection = {
        projectedPoints,
        annualRate: engineV2Result.metadata.annualRatePhaseA,
        rSquared: engineV2Result.metadata.rSquared,
        usedFallback: engineV2Result.metadata.methodUsed === 'brand',
        fallbackReason: engineV2Result.metadata.methodUsed === 'brand' 
          ? 'Usando benchmark da marca'
          : undefined,
        strategy: engineV2Result.metadata.methodUsed === 'exact' 
          ? 'standard_regression' 
          : engineV2Result.metadata.methodUsed === 'family' 
            ? 'cohort_analysis' 
            : 'category_fallback',
        cohortData: undefined,
      };
      
      engineV2Metadata = {
        methodUsed: engineV2Result.metadata.methodUsed,
        confidence: engineV2Result.metadata.confidence,
        rSquared: engineV2Result.metadata.rSquared,
        annualRate: engineV2Result.metadata.annualRatePhaseA,
      };
    } else {
      // Fallback to legacy projection
      // Calcula projeção de 5 anos baseada em regressão log-linear OU cohort analysis
      // O calculateProjectionFromHistory agora implementa a hierarquia:
      // A) Standard regression se histórico > 24 meses
      // B) Cohort analysis se cohortData disponível e histórico curto
      // C) Fallback para taxa de categoria
      projection = calculateProjectionFromHistory(historyForProjection, 5, cohortData);
    }
    
    // Adiciona variação entre meses e depreciação acumulada para dados históricos
    const dataWithVariation = filteredHistory.map((point, index) => {
      const prevPrice = index > 0 ? filteredHistory[index - 1].price : point.price;
      const variationFromPrevious = point.price - prevPrice;
      const variationPercent = prevPrice > 0 ? ((point.price - prevPrice) / prevPrice) * 100 : 0;
      const isLatest = index === filteredHistory.length - 1;
      const totalDepreciation = ((point.price - firstPrice) / firstPrice) * 100;
      
      return {
        ...point,
        // Timestamp numérico para escala linear
        timestamp: point.date.getTime(),
        variationFromPrevious: index > 0 ? variationFromPrevious : undefined,
        variationPercent: index > 0 ? variationPercent : undefined,
        isLatest,
        totalDepreciation,
        isProjection: false,
        // Para a linha - histórico usa price, projeção usa projectedPrice
        historicalPrice: point.price,
        projectedPrice: null as number | null,
      };
    });
    
    // Adiciona pontos de projeção - calculados pela regressão log-linear
    // A projeção começa do último ponto histórico e gera 5 anos no futuro
    const projectionData = projection.projectedPoints.map((point, idx) => {
      const projectedDepreciation = ((point.price - lastHistoricalPrice) / lastHistoricalPrice) * 100;
      
      return {
        date: point.date,
        // Timestamp numérico para escala linear
        timestamp: point.date.getTime(),
        price: point.price,
        monthLabel: point.monthLabel,
        isLaunchPrice: false,
        isLatest: false,
        isProjection: true,
        totalDepreciation: undefined,
        variationFromPrevious: undefined,
        variationPercent: undefined,
        projectedDepreciation,
        // Para renderização de duas linhas
        historicalPrice: null as number | null,
        projectedPrice: point.price,
      };
    });
    
    // Conecta a última linha histórica com a projeção
    // O último ponto histórico precisa ter ambos historicalPrice E projectedPrice
    // para que a linha de projeção comece exatamente onde o histórico termina
    if (dataWithVariation.length > 0) {
      const lastIdx = dataWithVariation.length - 1;
      dataWithVariation[lastIdx] = {
        ...dataWithVariation[lastIdx],
        projectedPrice: dataWithVariation[lastIdx].price, // Ponto de ancoragem
      };
    }
    
    // Combina histórico + projeção
    const allData = [...dataWithVariation, ...projectionData];
    
    // Calcula domínio de tempo para escala linear
    const minTime = allData[0].timestamp;
    const maxTime = allData[allData.length - 1].timestamp;
    
    // Calcula métricas
    const totalVariation = lastHistoricalPrice - firstPrice;
    const totalVariationPercent = ((lastHistoricalPrice - firstPrice) / firstPrice) * 100;
    const monthsCount = filteredHistory.length;
    const avgMonthlyVariation = totalVariation / Math.max(monthsCount - 1, 1);
    const annualizedRate = (totalVariationPercent / Math.max(monthsCount - 1, 1)) * 12;
    
    // Projeção em 5 anos
    const price5Years = projection.projectedPoints[4]?.price || lastHistoricalPrice;
    const depreciation5Years = ((price5Years - lastHistoricalPrice) / lastHistoricalPrice) * 100;
    
    return {
      chartData: allData,
      timeDomain: [minTime, maxTime] as [number, number],
      metrics: {
        firstPrice,
        lastPrice: lastHistoricalPrice,
        totalVariation,
        totalVariationPercent,
        monthsCount,
        avgMonthlyVariation,
        annualizedRate,
        periodStart: filteredHistory[0].monthLabel,
        periodEnd: filteredHistory[filteredHistory.length - 1].monthLabel,
        price5Years,
        depreciation5Years,
      },
      projectionInfo: {
        annualRate: engineV2Metadata?.annualRate ?? projection.annualRate,
        rSquared: engineV2Metadata?.rSquared ?? projection.rSquared,
        usedFallback: projection.usedFallback,
        fallbackReason: projection.fallbackReason,
        strategy: projection.strategy,
        cohortData: projection.cohortData,
        // V2 metadata
        engineV2: engineV2Metadata,
      },
    };
  }, [priceHistory, cohortData, engineV2Result, modelYear]);

  // Filtra dados baseado no toggle de projeção
  // IMPORTANT: Hooks must be called unconditionally - moved before early return
  const displayData = useMemo(() => {
    if (chartData.length === 0) return [];
    if (showProjection) return chartData;
    return chartData.filter(d => !d.isProjection);
  }, [chartData, showProjection]);

  // Calcula domínio dinâmico baseado nos dados exibidos
  const displayTimeDomain = useMemo(() => {
    if (displayData.length === 0) return timeDomain;
    const timestamps = displayData.map(d => d.timestamp);
    return [Math.min(...timestamps), Math.max(...timestamps)];
  }, [displayData, timeDomain]);

  // Encontra índices especiais para ReferenceLine
  const launchIndex = displayData.findIndex(d => d.isLaunchPrice);
  const currentMonthIndex = displayData.findIndex(d => d.isLatest);

  // =========================================================================
  // Loading state - MUST come after all hooks are called but BEFORE empty check
  // =========================================================================
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2 px-3 sm:px-6">
          {/* Mobile-first: ícone de loading sempre visível com destaque */}
          <div className="flex items-start gap-2">
            <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm sm:text-base truncate">
                  Histórico FIPE
                </CardTitle>
                {/* Ícone animado com fundo destacado para visibilidade mobile */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 flex-shrink-0">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="text-[10px] sm:text-xs font-medium text-primary hidden xs:inline">
                    Carregando
                  </span>
                </div>
              </div>
              <CardDescription className="text-[10px] sm:text-xs mt-1">
                Buscando série temporal do modelo...
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-6 sm:py-8 px-3 sm:px-6">
          <div className="flex flex-col items-center justify-center gap-4">
            {/* Animação central visualmente atraente */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              {/* Pulso animado de fundo */}
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/10"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: 56, height: 56, margin: -4 }}
              />
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-primary animate-pulse" />
              </div>
            </motion.div>
            
            {/* Progress bar ou mensagem de loading */}
            <div className="text-center space-y-2 w-full max-w-xs">
              {progress ? (
                <div className="space-y-1.5">
                  <Progress value={(progress.current / progress.total) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {progress.current} de {progress.total} referências
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <motion.div
                    className="w-24 h-1 bg-muted rounded-full overflow-hidden"
                  >
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      style={{ width: "50%" }}
                    />
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state - after hooks and loading check
  if (chartData.length === 0 || !metrics) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card>
        <CardHeader className="pb-2 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-base flex items-center gap-2 flex-wrap">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="hidden sm:inline">Histórico FIPE</span>
                <span className="sm:hidden">Histórico FIPE</span>
                <span className="text-muted-foreground font-normal text-[10px] sm:text-xs">
                  · {metrics.periodStart} - {metrics.periodEnd}
                </span>
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs mt-1">
                Série temporal do {modelName} {modelYear}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 sm:space-y-4 px-2 sm:px-6">
          {/* Métricas resumidas - 3 colunas principais */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* Caixa 1: Valor 0km */}
            <div className="p-2 sm:p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-[9px] sm:text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-600" />
                <span className="hidden sm:inline">Valor 0km</span>
                <span className="sm:hidden">0km</span>
              </p>
              <p className="font-semibold text-xs sm:text-base text-amber-600 dark:text-amber-400">
                {formatCurrency(metrics.firstPrice)}
              </p>
            </div>

            {/* Caixa 2: Valor Atual (com variação) */}
            <div className="p-2 sm:p-3 rounded-lg bg-muted text-center">
              <p className="text-[9px] sm:text-xs text-muted-foreground">Valor Atual</p>
              <p className="font-semibold text-xs sm:text-base text-primary">
                {formatCurrency(metrics.lastPrice)}
              </p>
              <p className={`text-[9px] sm:text-[10px] ${metrics.totalVariation >= 0 ? 'text-income' : 'text-destructive'}`}>
                {metrics.totalVariation >= 0 ? '+' : ''}{formatCurrencyCompact(metrics.totalVariation)}
                <span className="ml-0.5">({metrics.totalVariationPercent >= 0 ? '+' : ''}{metrics.totalVariationPercent.toFixed(1)}%)</span>
              </p>
            </div>

            {/* Caixa 3: % Depreciação a.a. */}
            <div className="p-2 sm:p-3 rounded-lg bg-muted text-center">
              <p className="text-[9px] sm:text-xs text-muted-foreground">
                <span className="hidden sm:inline">% Depreciação a.a.</span>
                <span className="sm:hidden">% Deprec. a.a.</span>
              </p>
              <p className={`font-semibold text-xs sm:text-base ${metrics.annualizedRate >= 0 ? 'text-income' : 'text-destructive'}`}>
                {metrics.annualizedRate >= 0 ? '+' : ''}{metrics.annualizedRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Projeção 5 anos - exibido apenas quando toggle ativo */}
          {projectionInfo && showProjection && (
            <div className="p-2 sm:p-3 rounded-lg bg-muted-foreground/10 border border-muted-foreground/20">
              <div className="flex items-center justify-between">
                <p className="text-[9px] sm:text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  Projeção em 5 anos
                </p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-xs sm:text-base text-muted-foreground">
                    {formatCurrency(metrics.price5Years)}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-destructive">
                    ({metrics.depreciation5Years.toFixed(1)}%)
                  </p>
                </div>
              </div>
            </div>
          )}


          {/* Legenda do gráfico + Toggle de projeção - Mobile optimized */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/30 border border-border">
            {/* Legenda visual clara */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-4 sm:w-5 h-0.5 bg-primary rounded" />
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary" />
                </div>
                <span className="font-medium text-foreground">Histórico</span>
              </div>
              {showProjection && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-4 sm:w-5 h-0.5 rounded" style={{ 
                      background: 'repeating-linear-gradient(90deg, hsl(var(--muted-foreground)) 0, hsl(var(--muted-foreground)) 2px, transparent 2px, transparent 4px)' 
                    }} />
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-muted-foreground opacity-70" />
                  </div>
                  <span className="font-medium text-muted-foreground">Projeção</span>
                </div>
              )}
            </div>

            {/* Toggle para mostrar/esconder projeção + Metodologia */}
            <div className="flex items-center gap-2 sm:gap-4 pt-2 sm:pt-0 sm:pl-3 border-t sm:border-t-0 sm:border-l border-border">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-projection"
                  checked={showProjection}
                  onCheckedChange={setShowProjection}
                  className="scale-90 sm:scale-100"
                />
                <Label htmlFor="show-projection" className="text-[10px] sm:text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                  Mostrar projeção
                </Label>
              </div>
              <div className="h-4 w-px bg-border hidden sm:block" />
              <MethodologyDialog 
                periodStart={metrics.periodStart}
                periodEnd={metrics.periodEnd}
                totalPoints={metrics.monthsCount}
              />
            </div>
          </div>
          
          {/* Nota sobre modelos considerados */}
          {engineV2Result && showProjection && (
            <div className="flex items-center gap-2">
              <ConsideredModelsInfo
                familyName={familyName || null}
                models={consideredModels}
                methodUsed={engineV2Result.metadata.methodUsed}
                vehicleAge={engineV2Result.currentAge}
                dataYearsUsed={engineV2Result.metadata.dataPointsUsed}
              />
              {projectionInfo?.usedFallback && projectionInfo.fallbackReason && !engineV2Result && (
                <Badge variant="outline" className="text-[10px]">
                  <Info className="h-3 w-3 mr-1" />
                  {projectionInfo.fallbackReason}
                </Badge>
              )}
            </div>
          )}

          {/* Gráfico - Mobile: always fit screen, no scroll */}
          <div className="h-[280px] sm:h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={displayData} margin={{ top: 20, right: 15, left: 15, bottom: 5 }}>
                  <defs>
                    <linearGradient id="historyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="projectionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...premiumGrid} />
                  <XAxis 
                    dataKey="timestamp"
                    type="number"
                    scale="linear"
                    domain={displayTimeDomain || ['auto', 'auto']}
                    ticks={(() => {
                      if (!displayData || displayData.length === 0) return [];
                      const timestamps = displayData.map(d => d.timestamp);
                      const minTs = Math.min(...timestamps);
                      const maxTs = Math.max(...timestamps);
                      const minDate = new Date(minTs);
                      const maxDate = new Date(maxTs);
                      const startYear = minDate.getUTCFullYear();
                      const endYear = maxDate.getUTCFullYear();
                      // Only January ticks
                      const selectedTicks: number[] = [];
                      for (let year = startYear; year <= endYear + 1; year++) {
                        const ts = Date.UTC(year, 0, 1);
                        if (ts >= minTs && ts <= maxTs) {
                          selectedTicks.push(ts);
                        }
                      }
                      return selectedTicks;
                    })()}
                    tickFormatter={(ts: number) => {
                      const date = new Date(ts);
                      return date.getUTCFullYear().toString().slice(-2);
                    }}
                    {...premiumXAxis}
                    tick={{ 
                      fontSize: 12, 
                      fill: 'hsl(var(--chart-axis))',
                      fontWeight: 500,
                      fontFamily: 'Inter, system-ui, sans-serif'
                    }}
                    height={30}
                    interval={0}
                  />
                  {/* Escala do eixo Y (valores em R$):
                      - Mínimo: o menor entre (menor valor exibido - 5000) e (70% do valor 0km / firstPrice).
                        Garante margem inferior e evita escala excessivamente baixa.
                      - Máximo: maior valor exibido + 5000 (margem superior).
                      - Escala linear; valores formatados em R$ (ex.: R$ 128k). */}
                  <YAxis 
                    tickFormatter={formatCurrencyShort}
                    domain={[
                      (dataMin: number) => Math.min(dataMin - 5000, metrics.firstPrice * 0.7),
                      (dataMax: number) => dataMax + 5000
                    ]}
                    width={52}
                    tick={{ fontSize: 11, fill: 'hsl(var(--chart-axis))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip 
                    content={<CustomTooltip />} 
                    wrapperStyle={{ zIndex: 50 }}
                  />
                
                {/* Área + Linha do histórico (dados reais) */}
                <Area
                  type="monotone"
                  dataKey="historicalPrice"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#historyGradient)"
                  connectNulls={false}
                  dot={(props: any) => {
                    const { cx, cy, payload, index } = props;
                    if (!payload.historicalPrice) return null;
                    
                    // Ponto de lançamento
                    if (payload.isLaunchPrice) {
                      return (
                        <g key={`dot-launch-${index}`}>
                          <circle 
                            cx={cx} 
                            cy={cy} 
                            r={8} 
                            fill="hsl(var(--chart-4))" 
                            stroke="white" 
                            strokeWidth={2}
                          />
                          <text 
                            x={cx} 
                            y={cy - 15} 
                            textAnchor="middle" 
                            fill="hsl(var(--chart-4))"
                            fontSize={10}
                            fontWeight="bold"
                          >
                            0km
                          </text>
                        </g>
                      );
                    }
                    // Ponto atual (último histórico)
                    if (payload.isLatest && !payload.isProjection) {
                      return (
                        <circle 
                          key={`dot-latest-${index}`}
                          cx={cx} 
                          cy={cy} 
                          r={6} 
                          fill="hsl(var(--primary))" 
                          stroke="white" 
                          strokeWidth={2}
                        />
                      );
                    }
                    // Pontos normais - show all monthly data points
                    // Use smaller dots when there are many points to avoid clutter
                    const dotRadius = chartData.length > 36 ? 1.5 : chartData.length > 24 ? 2 : 3;
                    return <circle key={`dot-${index}`} cx={cx} cy={cy} r={dotRadius} fill="hsl(var(--primary))" />;
                  }}
                  activeDot={{ r: 6, stroke: "white", strokeWidth: 2 }}
                />
                
                {/* Área + Linha da projeção (dados estimados) - linha pontilhada */}
                {/* connectNulls=true para conectar do último ponto histórico até projeções */}
                <Area
                  type="monotone"
                  dataKey="projectedPrice"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  fill="url(#projectionGradient)"
                  connectNulls={true}
                  dot={(props: any) => {
                    const { cx, cy, payload, index } = props;
                    if (!payload.projectedPrice || !payload.isProjection) return null;
                    
                    return (
                      <circle 
                        key={`dot-proj-${index}`}
                        cx={cx} 
                        cy={cy} 
                        r={4} 
                        fill="hsl(var(--muted-foreground))" 
                        stroke="white" 
                        strokeWidth={1.5}
                        opacity={0.8}
                      />
                    );
                  }}
                  activeDot={{ r: 5, stroke: "white", strokeWidth: 2, fill: "hsl(var(--muted-foreground))" }}
                />
                
                {/* Linha de referência no ponto de lançamento */}
                {launchIndex >= 0 && (
                  <ReferenceLine
                    x={chartData[launchIndex].monthLabel}
                    stroke="hsl(var(--chart-4))"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                  />
                )}
                
                {/* Linha de referência no mês atual */}
                {currentMonthIndex >= 0 && currentMonthIndex !== launchIndex && (
                  <ReferenceLine
                    x={chartData[currentMonthIndex].monthLabel}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    label={{
                      value: 'Atual',
                      position: 'top',
                      fill: 'hsl(var(--primary))',
                      fontSize: 10,
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Nota de rodapé com metodologia - Mobile optimized */}
          <div className="flex items-start gap-2 p-2 sm:p-3 rounded-lg bg-muted/50 text-[10px] sm:text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 shrink-0" />
            <div className="space-y-1">
              {showProjection ? (
                <>
                  <p>
                    <strong>Série histórica FIPE + projeção 5 anos.</strong>{' '}
                    <span className="hidden sm:inline">Mais detalhes no botão 'Ver Metodologia'.</span>
                  </p>
                  <p className="hidden sm:block">
                    O primeiro ponto ({metrics.periodStart}) representa o <strong>preço de lançamento 0km</strong>. 
                    A linha pontilhada é a projeção futura 
                    (taxa: {projectionInfo ? `${(projectionInfo.annualRate * 100).toFixed(1)}%` : 'N/A'} a.a.).
                  </p>
                </>
              ) : (
                <p>
                  <strong>Série histórica FIPE.</strong>
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
