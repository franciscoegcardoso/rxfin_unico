import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Brain, 
  AlertTriangle, 
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Info
} from 'lucide-react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Legend
} from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis } from '@/components/charts/premiumChartTheme';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  DepreciationCurveResult, 
  AgePricePoint, 
  formatDepreciationRate 
} from '@/utils/depreciationRegression';

interface DepreciationCurveChartProps {
  curveResult: DepreciationCurveResult;
  currentPrice: number;
  currentAge: number;
  modelName: string;
  rawDataPoints: AgePricePoint[];
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

// Formato compacto para cards mobile
const formatCurrencyCompact = (value: number) => {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)} mil`;
  }
  return formatCurrency(value);
};

// Formata mês/ano para exibição
const formatMonthLabel = (monthOffset: number, baseYear: number, baseMonth: number) => {
  const totalMonths = baseMonth + monthOffset;
  const year = baseYear + Math.floor(totalMonths / 12);
  const month = totalMonths % 12;
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${monthNames[month]}/${year}`;
};

// Tooltip customizado para o gráfico
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isCurrentMonth = data.isCurrentMonth;
    const is0km = data.is0km;
    const is0kmEstimated = data.is0kmEstimated;
    
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold flex items-center gap-2">
          {data.monthLabel || label}
          {is0km && is0kmEstimated && (
            <Badge className="text-xs bg-amber-500 text-white">0 km (est.)</Badge>
          )}
          {is0km && !is0kmEstimated && (
            <Badge className="text-xs bg-emerald-500 text-white">0 km</Badge>
          )}
          {isCurrentMonth && !is0km && (
            <Badge variant="outline" className="text-xs bg-primary/10">Atual</Badge>
          )}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className={entry.name === 'Projeção Inteligente' ? 'text-primary' : 'text-muted-foreground'}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
        {data.depreciationFromPrevious && (
          <p className="text-xs text-destructive mt-1">
            −{formatCurrency(data.depreciationFromPrevious)} vs. mês anterior
          </p>
        )}
        {is0km && is0kmEstimated && (
          <p className="text-[10px] text-amber-600 mt-1">
            ⚠️ Estimativa via regressão (valor histórico indisponível)
          </p>
        )}
        {is0km && !is0kmEstimated && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Valor FIPE quando novo
          </p>
        )}
        {data.isDecemberReference && !is0km && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Preço FIPE atual p/ veículo dessa idade
          </p>
        )}
        {isCurrentMonth && (
          <p className="text-[10px] text-primary/80 mt-1">
            ✓ Preço FIPE atual do veículo selecionado
          </p>
        )}
      </div>
    );
  }
  return null;
};

// Dialog de metodologia
const MethodologyDialog: React.FC<{ 
  curveResult: DepreciationCurveResult;
  modelName: string;
}> = ({ curveResult, modelName }) => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
        <HelpCircle className="h-3.5 w-3.5" />
        Ver Metodologia
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Metodologia de Depreciação Dinâmica
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4 text-sm">
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <h4 className="font-semibold flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Análise Cross-Sectional
          </h4>
          <p className="text-muted-foreground">
            Ao invés de usar taxas genéricas de mercado, analisamos os preços FIPE 
            <strong> atuais</strong> de múltiplos anos do <strong>{modelName}</strong> para 
            calcular a taxa real de depreciação deste modelo específico.
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Modelo Matemático</h4>
          <div className="p-3 rounded-lg bg-muted font-mono text-xs space-y-1">
            <p>Preço(t) = P₀ × e<sup>(-k × t)</sup></p>
            <p className="text-muted-foreground">Onde:</p>
            <ul className="list-disc list-inside text-muted-foreground ml-2">
              <li>P₀ = Preço estimado quando 0 km</li>
              <li>k = Taxa de depreciação (calculada)</li>
              <li>t = Idade do veículo em anos</li>
            </ul>
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Regressão Linear nos Logaritmos</h4>
          <p className="text-muted-foreground">
            Linearizamos a equação exponencial aplicando logaritmo natural:
          </p>
          <div className="p-2 rounded bg-muted font-mono text-xs mt-2">
            ln(Preço) = ln(P₀) − k × t
          </div>
          <p className="text-muted-foreground mt-2">
            Usamos o método dos <strong>Mínimos Quadrados</strong> para encontrar 
            a inclinação (slope), que representa nossa taxa de depreciação k.
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Resultados da Análise</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-muted">
              <p className="text-muted-foreground">Taxa Anual</p>
              <p className="font-semibold text-lg text-primary">
                {formatDepreciationRate(curveResult.annualRate)}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-muted">
              <p className="text-muted-foreground">Precisão (R²)</p>
              <p className="font-semibold text-lg">
                {(curveResult.rSquared * 100).toFixed(0)}%
              </p>
            </div>
            <div className="p-2 rounded-lg bg-muted">
              <p className="text-muted-foreground">Pontos Analisados</p>
              <p className="font-semibold text-lg">
                {curveResult.filteredPoints.length}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-700 dark:text-amber-400 text-[10px]">P₀ Estimado*</p>
              <p className="font-semibold text-amber-700 dark:text-amber-400">
                {formatCurrency(curveResult.estimatedNewPrice)}
              </p>
              <p className="text-[9px] text-amber-600/70 dark:text-amber-400/70">*via regressão</p>
            </div>
          </div>
        </div>
        
        {curveResult.usedFallback && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <h4 className="font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Fallback Ativado
            </h4>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">
              {curveResult.fallbackReason}. Usando taxa conservadora de 10% a.a.
            </p>
          </div>
        )}
      </div>
    </DialogContent>
  </Dialog>
);

export const DepreciationCurveChart: React.FC<DepreciationCurveChartProps> = ({
  curveResult,
  currentPrice,
  currentAge,
  modelName,
  rawDataPoints,
}) => {
  // Prepara dados do gráfico com interpolação mensal
  // Começa do ano de fabricação (0km) e vai até 5 anos no futuro
  const chartData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    interface MonthlyDataPoint {
      monthOffset: number; // Meses desde o ano de fabricação (0km)
      year: number;
      month: number;
      monthLabel: string;
      xLabel: string;
      realPrice?: number;
      projectedPrice?: number;
      isCurrentMonth: boolean;
      isDecemberReference: boolean;
      isYearLabel: boolean;
      is0km: boolean;
      is0kmEstimated: boolean; // Se o valor 0km é estimativa via regressão
      depreciationFromPrevious?: number;
    }
    
    const data: MonthlyDataPoint[] = [];
    
    // Ordena pontos por idade (mais novo primeiro = menor idade)
    const sortedRealPoints = [...rawDataPoints].sort((a, b) => a.age - b.age);
    
    if (sortedRealPoints.length === 0) return data;
    
    // Cria mapa de preços reais por idade
    const realPricesByAge = new Map(sortedRealPoints.map(p => [p.age, p.price]));
    
    // Ano de fabricação do veículo selecionado
    const vehicleModelYear = currentYear - currentAge;
    
    // O gráfico começa no ano de fabricação (idade 0)
    const startYear = vehicleModelYear;
    
    // Calcula a taxa de depreciação mensal a partir da taxa anual
    const monthlyRate = curveResult.annualRate / 12;
    
    // 1. PRIMEIRO PONTO: Ano de fabricação com valor 0km
    // Verifica se temos o preço real do 0km (idade 0) ou se é estimativa
    const real0kmPrice = realPricesByAge.get(0);
    const price0km = real0kmPrice || curveResult.estimatedNewPrice;
    const is0kmEstimated = !real0kmPrice; // Se não temos dado real, é estimativa
    
    // Ponto inicial: Janeiro do ano de fabricação (0km)
    data.push({
      monthOffset: 0,
      year: startYear,
      month: 0, // Janeiro
      monthLabel: is0kmEstimated ? `${startYear} (0 km - est.)` : `${startYear} (0 km)`,
      xLabel: `${startYear}`,
      realPrice: Math.round(price0km),
      projectedPrice: undefined,
      isCurrentMonth: false,
      isDecemberReference: false,
      isYearLabel: true,
      is0km: true,
      is0kmEstimated,
    });
    
    // 2. PONTOS HISTÓRICOS: Anos subsequentes com valores FIPE de usado
    // Para cada ano após o de fabricação, usamos o preço FIPE do usado
    const maxHistoricalAge = Math.min(currentAge, Math.max(...sortedRealPoints.map(p => p.age)));
    
    for (let age = 1; age <= maxHistoricalAge; age++) {
      const year = startYear + age;
      const realPrice = realPricesByAge.get(age);
      
      if (realPrice !== undefined) {
        // Dezembro do ano (referência FIPE)
        const decemberMonthsFromStart = age * 12 + 11;
        
        data.push({
          monthOffset: decemberMonthsFromStart,
          year: year,
          month: 11, // Dezembro
          monthLabel: `Dez/${year}`,
          xLabel: `${year}`,
          realPrice: realPrice,
          projectedPrice: undefined,
          isCurrentMonth: false,
          isDecemberReference: true,
          isYearLabel: true,
          is0km: false,
          is0kmEstimated: false,
        });
      }
    }
    
    // Ordena por monthOffset
    data.sort((a, b) => a.monthOffset - b.monthOffset);
    
    // 3. INTERPOLAÇÃO: Preenche meses entre os pontos anuais
    const interpolatedData: MonthlyDataPoint[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const currentPoint = data[i];
      interpolatedData.push(currentPoint);
      
      // Interpola até o próximo ponto (se existir)
      if (i < data.length - 1) {
        const nextPoint = data[i + 1];
        const monthsBetween = nextPoint.monthOffset - currentPoint.monthOffset;
        
        if (monthsBetween > 1 && currentPoint.realPrice && nextPoint.realPrice) {
          // Interpolação linear entre os dois pontos
          const priceStep = (nextPoint.realPrice - currentPoint.realPrice) / monthsBetween;
          
          for (let m = 1; m < monthsBetween; m++) {
            const monthOffset = currentPoint.monthOffset + m;
            const actualYear = startYear + Math.floor(monthOffset / 12);
            const actualMonth = monthOffset % 12;
            
            interpolatedData.push({
              monthOffset,
              year: actualYear,
              month: actualMonth,
              monthLabel: `${monthNames[actualMonth]}/${actualYear}`,
              xLabel: '',
              realPrice: Math.round(currentPoint.realPrice + priceStep * m),
              projectedPrice: undefined,
              isCurrentMonth: actualYear === currentYear && actualMonth === currentMonth,
              isDecemberReference: false,
              isYearLabel: false,
              is0km: false,
              is0kmEstimated: false,
            });
          }
        }
      }
    }
    
    // 4. EXTENSÃO ATÉ O MÊS ATUAL
    const currentMonthOffset = currentAge * 12 + currentMonth;
    const lastRealPoint = interpolatedData[interpolatedData.length - 1];
    
    if (lastRealPoint && currentMonthOffset > lastRealPoint.monthOffset) {
      const monthsSinceLastReal = currentMonthOffset - lastRealPoint.monthOffset;
      
      for (let m = 1; m <= monthsSinceLastReal; m++) {
        const monthOffset = lastRealPoint.monthOffset + m;
        const actualYear = startYear + Math.floor(monthOffset / 12);
        const actualMonth = monthOffset % 12;
        
        // Usa taxa de depreciação para projetar do último ponto real
        const projectedPrice = lastRealPoint.realPrice! * Math.exp(-monthlyRate * m);
        const isThisCurrentMonth = actualYear === currentYear && actualMonth === currentMonth;
        
        interpolatedData.push({
          monthOffset,
          year: actualYear,
          month: actualMonth,
          monthLabel: `${monthNames[actualMonth]}/${actualYear}`,
          xLabel: '',
          realPrice: Math.round(projectedPrice),
          projectedPrice: undefined,
          isCurrentMonth: isThisCurrentMonth,
          isDecemberReference: false,
          isYearLabel: false,
          is0km: false,
          is0kmEstimated: false,
        });
      }
    }
    
    // 5. PONTO DO MÊS ATUAL: Marca e usa currentPrice
    const currentIndex = interpolatedData.findIndex(
      p => p.year === currentYear && p.month === currentMonth
    );
    if (currentIndex >= 0) {
      interpolatedData[currentIndex].isCurrentMonth = true;
      interpolatedData[currentIndex].realPrice = currentPrice;
    } else {
      // Se não encontrou, adiciona o ponto atual
      interpolatedData.push({
        monthOffset: currentMonthOffset,
        year: currentYear,
        month: currentMonth,
        monthLabel: `${monthNames[currentMonth]}/${currentYear}`,
        xLabel: '',
        realPrice: currentPrice,
        projectedPrice: undefined,
        isCurrentMonth: true,
        isDecemberReference: false,
        isYearLabel: false,
        is0km: false,
        is0kmEstimated: false,
      });
      interpolatedData.sort((a, b) => a.monthOffset - b.monthOffset);
    }
    
    // 6. PROJEÇÕES FUTURAS: 5 anos a partir do mês atual
    const projectionMonths = 5 * 12;
    
    // Ponto de transição: mês atual tem ambos realPrice e projectedPrice
    const transitionPoint = interpolatedData.find(p => p.isCurrentMonth);
    if (transitionPoint) {
      transitionPoint.projectedPrice = currentPrice;
    }
    
    // Adiciona projeções mensais
    for (let m = 1; m <= projectionMonths; m++) {
      const monthOffset = currentMonthOffset + m;
      const actualYear = startYear + Math.floor(monthOffset / 12);
      const actualMonth = monthOffset % 12;
      
      const projectedPrice = currentPrice * Math.exp(-monthlyRate * m);
      const isDecember = actualMonth === 11;
      
      interpolatedData.push({
        monthOffset,
        year: actualYear,
        month: actualMonth,
        monthLabel: `${monthNames[actualMonth]}/${actualYear}`,
        xLabel: isDecember ? `${actualYear}` : '',
        realPrice: undefined,
        projectedPrice: Math.round(projectedPrice),
        isCurrentMonth: false,
        isDecemberReference: false,
        isYearLabel: isDecember,
        is0km: false,
        is0kmEstimated: false,
      });
    }
    
    // 7. DEPRECIAÇÃO: Calcula variação em relação ao mês anterior
    for (let i = 1; i < interpolatedData.length; i++) {
      const current = interpolatedData[i];
      const previous = interpolatedData[i - 1];
      const currentValue = current.realPrice || current.projectedPrice;
      const previousValue = previous.realPrice || previous.projectedPrice;
      
      if (currentValue && previousValue && previousValue > currentValue) {
        interpolatedData[i].depreciationFromPrevious = Math.round(previousValue - currentValue);
      }
    }
    
    return interpolatedData;
  }, [rawDataPoints, curveResult, currentAge, currentPrice]);
  
  // Calcula qual é o índice do mês atual para a linha de referência
  const currentMonthData = useMemo(() => {
    return chartData.find(d => d.isCurrentMonth);
  }, [chartData]);
  
  // Filtra ticks do eixo X para mostrar anos de fabricação (0km), dezembro, e mês atual
  const xAxisTicks = useMemo(() => {
    const ticks: number[] = [];
    chartData.forEach(d => {
      // Inclui: ponto 0km, pontos de dezembro (referência FIPE), e mês atual
      if (d.is0km || d.isYearLabel || d.isCurrentMonth) {
        if (!ticks.includes(d.monthOffset)) {
          ticks.push(d.monthOffset);
        }
      }
    });
    return ticks;
  }, [chartData]);
  
  // Calcula depreciação mensal
  const monthlyDepreciation = useMemo(() => {
    return (currentPrice * curveResult.annualRate) / 12;
  }, [currentPrice, curveResult.annualRate]);
  
  // Valor em 5 anos
  const valueIn5Years = useMemo(() => {
    const projection = curveResult.projections.find(p => p.age === currentAge + 5);
    return projection?.price || currentPrice * Math.pow(1 - curveResult.annualRate, 5);
  }, [curveResult, currentAge, currentPrice]);
  
  const totalDepreciation5Years = currentPrice - valueIn5Years;
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex items-start gap-2">
            <Brain className="h-5 w-5 text-primary mt-0.5" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg leading-tight">
                Projeção Inteligente de Depreciação
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Análise baseada no histórico de preços do modelo específico
              </CardDescription>
            </div>
          </div>
          <MethodologyDialog curveResult={curveResult} modelName={modelName} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2 pt-0">
        {/* Métricas resumidas - layout compacto */}
        <motion.div 
          className="grid grid-cols-3 gap-1.5 sm:gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <motion.div 
            className="p-2 sm:p-3 rounded-lg bg-primary/10 border border-primary/20 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Taxa anual</p>
            <p className="text-sm sm:text-xl font-bold text-primary mt-0.5">
              {formatDepreciationRate(curveResult.annualRate)}
            </p>
          </motion.div>
          
          <motion.div 
            className="p-2 sm:p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="flex items-center justify-center gap-0.5">
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Perda/mês</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-2.5 w-2.5 text-muted-foreground/60 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[220px]">
                    <p className="text-xs">Média linearizada da taxa anual composta, calculada como (Valor × Taxa) ÷ 12.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-sm sm:text-xl font-bold text-destructive mt-0.5">
              <span className="hidden sm:inline">−{formatCurrency(monthlyDepreciation)}</span>
              <span className="sm:hidden">−{formatCurrencyCompact(monthlyDepreciation)}</span>
            </p>
          </motion.div>
          
          <motion.div 
            className="p-2 sm:p-3 rounded-lg bg-muted border text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Perda 5 anos</p>
            <p className="text-sm sm:text-xl font-bold mt-0.5">
              <span className="hidden sm:inline">−{formatCurrency(totalDepreciation5Years)}</span>
              <span className="sm:hidden">−{formatCurrencyCompact(totalDepreciation5Years)}</span>
            </p>
            <p className="text-[9px] sm:text-xs text-muted-foreground -mt-0.5">
              ({((totalDepreciation5Years / currentPrice) * 100).toFixed(0)}%)
            </p>
          </motion.div>
        </motion.div>
        
        {/* Badge de metodologia + Gráfico */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        >
          {/* Badge acima do gráfico */}
          <div className="flex items-center justify-between mb-1.5">
            {!curveResult.usedFallback ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="bg-emerald-500 text-white text-[10px] sm:text-xs gap-1 px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      Regressão ({curveResult.filteredPoints.length} pontos)
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Baseado em {curveResult.filteredPoints.length} pontos de dados reais</p>
                    <p className="text-xs text-muted-foreground">R² = {(curveResult.rSquared * 100).toFixed(0)}%</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[10px] sm:text-xs gap-1 text-amber-600 border-amber-500/50 px-2 py-0.5">
                      <AlertTriangle className="h-3 w-3" />
                      Fallback (10% a.a.)
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{curveResult.fallbackReason}</p>
                    <p className="text-xs">Usando taxa conservadora de 10% a.a.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Legenda inline compacta */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-[hsl(142,76%,36%)]" />
                <span className="text-[9px] sm:text-[10px] text-muted-foreground">FIPE</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 border-t-[1.5px] border-dashed border-[hsl(142,76%,45%)]" />
                <span className="text-[9px] sm:text-[10px] text-muted-foreground">Projeção</span>
              </div>
            </div>
          </div>
          
          {/* Gráfico */}
          <div className="h-[240px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
                <defs>
                  <linearGradient id="realPriceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="projectionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 50%)" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="hsl(142, 76%, 50%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid {...premiumGrid} />
                
                <XAxis 
                  dataKey="monthOffset" 
                  {...premiumXAxis}
                  tick={{ fontSize: 12, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
                  tickMargin={4}
                  ticks={xAxisTicks}
                  tickFormatter={(value) => {
                    const point = chartData.find(d => d.monthOffset === value);
                    if (!point) return '';
                    
                    // Show 2-digit year only
                    return point.year?.toString().slice(-2) || '';
                  }}
                />
                
                <YAxis 
                  hide
                  tickFormatter={formatCurrencyShort}
                />
                
                <RechartsTooltip content={<CustomTooltip />} />
                
                {/* Área preenchida para preço real FIPE (histórico + interpolado) */}
                <Area
                  type="monotone"
                  dataKey="realPrice"
                  name="Realizado (FIPE)"
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth={2.5}
                  fill="url(#realPriceGradient)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (!payload?.realPrice) return null;
                    // Mostra ponto maior para 0km, referências de dezembro e mês atual
                    const is0km = payload.is0km;
                    const is0kmEstimated = payload.is0kmEstimated;
                    const isImportantPoint = is0km || payload.isDecemberReference || payload.isCurrentMonth;
                    const size = isImportantPoint ? (is0km ? 5 : 4) : 0;
                    if (size === 0) return null;
                    // 0km estimado = amber, 0km real = green, outros = green escuro
                    const fillColor = is0km 
                      ? (is0kmEstimated ? 'hsl(45, 93%, 47%)' : 'hsl(142, 76%, 45%)') 
                      : 'hsl(142, 76%, 36%)';
                    return (
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={size} 
                        fill={fillColor} 
                        stroke="hsl(var(--background))" 
                        strokeWidth={2}
                      />
                    );
                  }}
                  connectNulls={false}
                  legendType="none"
                />
                
                {/* Área + linha de projeção - pontilhada */}
                <Area
                  type="monotone"
                  dataKey="projectedPrice"
                  name="Projetado"
                  stroke="hsl(142, 76%, 45%)"
                  strokeWidth={2}
                  fill="url(#projectionGradient)"
                  strokeDasharray="6 4"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (!payload?.projectedPrice) return null;
                    // Mostra ponto apenas para referências de dezembro
                    const size = payload.isYearLabel ? 3 : 0;
                    if (size === 0) return null;
                    return (
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={size} 
                        fill="hsl(142, 76%, 45%)" 
                        strokeWidth={0}
                      />
                    );
                  }}
                  connectNulls={true}
                  legendType="none"
                />
                
                {/* Linha de referência no mês atual */}
                {currentMonthData && (
                  <ReferenceLine
                    x={currentMonthData.monthOffset}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    label={{ 
                      value: 'Hoje', 
                      position: 'top',
                      fontSize: 9,
                      fill: 'hsl(var(--muted-foreground))'
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        
        {/* Nota explicativa compacta - atualizada */}
        <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-muted/40 border border-border/50">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
          <div className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed space-y-0.5">
            <p>
              <span className="font-medium">Dados:</span> Preços FIPE <strong>atuais</strong> para veículos de diferentes idades (análise cross-sectional).
              O ponto 0 km {chartData[0]?.is0kmEstimated ? 'é uma estimativa por regressão' : 'é o valor FIPE real'}.
            </p>
            <p>
              <span className="font-medium">Linha contínua:</span> Valores FIPE atuais por idade. 
              <span className="font-medium"> Tracejada:</span> Projeção futura (R² = {(curveResult.rSquared * 100).toFixed(0)}%).
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};