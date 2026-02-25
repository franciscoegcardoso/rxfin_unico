import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, Loader2, AlertCircle, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Asset } from '@/types/financial';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis } from '@/components/charts/premiumChartTheme';
import { format, parseISO, addMonths, differenceInMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AssetLinkedSegurosSection } from './AssetLinkedSegurosSection';

interface PropertyInsightsDialogProps {
  property: Asset;
}

interface ChartDataPoint {
  month: string;
  label: string;
  value: number;
  isProjection: boolean;
}

// Taxas médias de valorização imobiliária por tipo de ajuste
const APPRECIATION_RATES: Record<string, number> = {
  igpm: 0.04, // 4% ao ano (média histórica)
  ipca: 0.045, // 4.5% ao ano (meta inflação)
  minimum_wage: 0.06, // 6% ao ano (média aumento salário mínimo)
  none: 0.03, // 3% ao ano (valorização conservadora)
  custom: 0.05, // 5% ao ano (média geral)
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const PropertyInsightsDialog: React.FC<PropertyInsightsDialogProps> = ({ property }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Calcular métricas do imóvel
  const metrics = useMemo(() => {
    const avgMonths = property.averageRentedMonths ?? 12;
    const effectiveMonthlyRental = property.rentalValue 
      ? property.rentalValue * (avgMonths / 12) 
      : 0;
    
    const rentalYield = effectiveMonthlyRental && property.value 
      ? ((effectiveMonthlyRental * 12) / property.value * 100)
      : null;
    
    const monthlyYield = rentalYield ? rentalYield / 12 : null;
    
    const pricePerSqm = property.propertyArea && property.value
      ? property.value / property.propertyArea
      : null;

    // Benchmark: yield médio de aluguel no Brasil é 0,35% a 0,45% ao mês
    const yieldStatus = monthlyYield 
      ? monthlyYield >= 0.45 ? 'above' : monthlyYield >= 0.35 ? 'average' : 'below'
      : null;

    return { rentalYield, monthlyYield, pricePerSqm, yieldStatus, avgMonths, effectiveMonthlyRental };
  }, [property]);

  // Gerar dados do gráfico de evolução do valor
  const chartData = useMemo((): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const now = new Date();
    const currentMonth = startOfMonth(now);
    
    // Data de compra ou 3 anos atrás se não informada
    const purchaseDate = property.purchaseDate 
      ? startOfMonth(parseISO(property.purchaseDate))
      : addMonths(currentMonth, -36);
    
    // Valor de compra ou valor atual como estimativa
    const purchaseValue = property.purchaseValue || property.value * 0.85;
    
    // Taxa de valorização anual baseada no tipo de ajuste
    const annualRate = APPRECIATION_RATES[property.propertyAdjustment || 'none'];
    const monthlyRate = Math.pow(1 + annualRate, 1/12) - 1;
    
    // Gerar dados históricos (da compra até hoje)
    const monthsFromPurchaseToNow = differenceInMonths(currentMonth, purchaseDate);
    
    for (let i = 0; i <= monthsFromPurchaseToNow; i++) {
      const monthDate = addMonths(purchaseDate, i);
      const estimatedValue = purchaseValue * Math.pow(1 + monthlyRate, i);
      
      data.push({
        month: format(monthDate, 'yyyy-MM'),
        label: format(monthDate, 'MMM/yy', { locale: ptBR }),
        value: Math.round(estimatedValue),
        isProjection: false,
      });
    }
    
    // Gerar projeção futura (próximos 36 meses)
    for (let i = 1; i <= 36; i++) {
      const monthDate = addMonths(currentMonth, i);
      const estimatedValue = property.value * Math.pow(1 + monthlyRate, i);
      
      data.push({
        month: format(monthDate, 'yyyy-MM'),
        label: format(monthDate, 'MMM/yy', { locale: ptBR }),
        value: Math.round(estimatedValue),
        isProjection: true,
      });
    }
    
    // Filtrar para mostrar apenas alguns pontos para melhor visualização
    const totalPoints = data.length;
    if (totalPoints > 36) {
      return data.filter((_, index) => index % 3 === 0 || index === totalPoints - 1);
    }
    
    return data;
  }, [property]);

  const currentMonthIndex = useMemo(() => {
    const now = format(new Date(), 'yyyy-MM');
    return chartData.findIndex(d => d.month === now);
  }, [chartData]);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('property-insights', {
        body: { property }
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setInsights(data.insights);
    } catch (err) {
      console.error('Error fetching insights:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar insights';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open && !insights && !loading) {
      fetchInsights();
    }
  };

  // Format markdown-like content
  const formatInsights = (text: string) => {
    return text
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <h3 key={index} className="font-semibold text-foreground mt-4 mb-2">
              {line.replace(/\*\*/g, '')}
            </h3>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h3 key={index} className="font-semibold text-foreground mt-4 mb-2 text-lg">
              {line.replace('## ', '')}
            </h3>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h2 key={index} className="font-bold text-foreground mt-4 mb-2 text-xl">
              {line.replace('# ', '')}
            </h2>
          );
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <li key={index} className="ml-4 text-muted-foreground">
              {line.replace(/^[-*] /, '')}
            </li>
          );
        }
        if (/^\d+\. /.test(line)) {
          return (
            <li key={index} className="ml-4 text-muted-foreground list-decimal">
              {line.replace(/^\d+\. /, '')}
            </li>
          );
        }
        if (line.includes('**')) {
          const parts = line.split(/(\*\*[^*]+\*\*)/);
          return (
            <p key={index} className="text-muted-foreground mb-2">
              {parts.map((part, i) => 
                part.startsWith('**') && part.endsWith('**') 
                  ? <strong key={i} className="text-foreground">{part.replace(/\*\*/g, '')}</strong>
                  : part
              )}
            </p>
          );
        }
        if (line.trim()) {
          return (
            <p key={index} className="text-muted-foreground mb-2">
              {line}
            </p>
          );
        }
        return null;
      });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.label}</p>
          <p className="text-emerald-600 font-semibold">{formatCurrency(data.value)}</p>
          {data.isProjection && (
            <p className="text-xs text-muted-foreground mt-1">Projeção</p>
          )}
        </div>
      );
    }
    return null;
  };

  const YieldStatusIcon = () => {
    if (!metrics.yieldStatus) return null;
    if (metrics.yieldStatus === 'above') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (metrics.yieldStatus === 'below') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-amber-500" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
          title="Ver insights do imóvel"
        >
          <Lightbulb className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-emerald-500" />
            Insights do Imóvel
          </DialogTitle>
          <DialogDescription>
            Análise financeira detalhada para {property.name}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
          {/* Métricas Resumidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Valor Atual</p>
              <p className="font-semibold text-foreground">{formatCurrency(property.value)}</p>
            </div>
            {metrics.rentalYield !== null && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Yield Anual <YieldStatusIcon />
                </p>
                <p className={`font-semibold ${
                  metrics.yieldStatus === 'above' ? 'text-emerald-600' :
                  metrics.yieldStatus === 'below' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {metrics.rentalYield.toFixed(2)}%
                </p>
              </div>
            )}
            {metrics.pricePerSqm !== null && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Valor/m²</p>
                <p className="font-semibold text-foreground">{formatCurrency(metrics.pricePerSqm)}</p>
              </div>
            )}
            {property.rentalValue && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Aluguel Mensal</p>
                <p className="font-semibold text-emerald-600">{formatCurrency(property.rentalValue)}</p>
                {metrics.avgMonths < 12 && (
                  <p className="text-xs text-muted-foreground">
                    ~{metrics.avgMonths} meses/ano ocupado
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Gráfico de Evolução do Valor */}
          <div className="mb-6">
            <h3 className="font-semibold text-foreground mb-3">Evolução do Valor do Imóvel</h3>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPropertyValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...premiumGrid} />
                    <XAxis 
                      dataKey="label" 
                      {...premiumXAxis}
                      tick={{ fontSize: 12, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      {...premiumYAxis}
                      tick={{ fontSize: 12, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {currentMonthIndex >= 0 && (
                      <ReferenceLine 
                        x={chartData[currentMonthIndex]?.label} 
                        stroke="#10b981" 
                        strokeDasharray="5 5"
                        label={{ value: 'Hoje', position: 'top', fontSize: 10, fill: '#10b981' }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="none"
                      fill="url(#colorPropertyValue)"
                      fillOpacity={1}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 4, fill: '#10b981', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-emerald-500 rounded"></div>
                  <span className="text-muted-foreground">Histórico</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-emerald-500 rounded opacity-50"></div>
                  <span className="text-muted-foreground">Projeção</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Valor de Compra</p>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(property.purchaseValue || property.value * 0.85)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Valor Atual</p>
                  <p className="font-semibold text-emerald-600">
                    {formatCurrency(property.value)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Em 3 anos</p>
                  <p className="font-semibold text-muted-foreground">
                    {formatCurrency(chartData[chartData.length - 1]?.value || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Seguros e Garantias Vinculados */}
          <AssetLinkedSegurosSection 
            assetId={property.id}
            assetName={property.name}
            assetType="property"
            variant="card"
            showAddButton={!property.isSold}
          />

          {/* Insights da IA */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-4" />
              <p className="text-muted-foreground">Gerando análise com IA...</p>
              <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-destructive mb-4" />
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchInsights} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          )}

          {insights && !loading && (
            <div className="prose prose-sm max-w-none">
              <h3 className="font-semibold text-foreground mb-3">Análise Detalhada</h3>
              {formatInsights(insights)}
              
              <div className="mt-6 pt-4 border-t">
                <Button onClick={fetchInsights} variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Atualizar análise
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
