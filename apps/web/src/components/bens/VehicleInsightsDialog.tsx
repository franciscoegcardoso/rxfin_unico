import React, { useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Lightbulb, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Asset } from '@/types/financial';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis } from '@/components/charts/premiumChartTheme';
import { format, parseISO, addMonths, differenceInMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AssetLinkedContasSection } from './AssetLinkedContasSection';
import { AssetLinkedSegurosSection } from './AssetLinkedSegurosSection';

interface VehicleInsightsDialogProps {
  vehicle: Asset;
}

interface ChartDataPoint {
  month: string;
  label: string;
  value: number;
  isProjection: boolean;
}

// Curva de depreciação típica de veículos (% do valor original por ano)
const DEPRECIATION_CURVE = [
  { year: 0, percentage: 100 },
  { year: 1, percentage: 85 },
  { year: 2, percentage: 75 },
  { year: 3, percentage: 67 },
  { year: 4, percentage: 60 },
  { year: 5, percentage: 54 },
  { year: 6, percentage: 49 },
  { year: 7, percentage: 45 },
  { year: 8, percentage: 41 },
  { year: 9, percentage: 38 },
  { year: 10, percentage: 35 },
  { year: 11, percentage: 33 },
  { year: 12, percentage: 31 },
  { year: 13, percentage: 29 },
  { year: 14, percentage: 27 },
  { year: 15, percentage: 25 },
];

const getDepreciationPercentage = (yearsFromPurchase: number): number => {
  if (yearsFromPurchase <= 0) return 100;
  if (yearsFromPurchase >= 15) return 25;
  
  const lowerYear = Math.floor(yearsFromPurchase);
  const upperYear = Math.ceil(yearsFromPurchase);
  
  if (lowerYear === upperYear) {
    return DEPRECIATION_CURVE[lowerYear].percentage;
  }
  
  const lowerPercentage = DEPRECIATION_CURVE[lowerYear].percentage;
  const upperPercentage = DEPRECIATION_CURVE[upperYear].percentage;
  const fraction = yearsFromPurchase - lowerYear;
  
  return lowerPercentage - (lowerPercentage - upperPercentage) * fraction;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const VehicleInsightsDialog: React.FC<VehicleInsightsDialogProps> = ({ vehicle }) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Gerar dados do gráfico de evolução FIPE
  const chartData = useMemo((): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const now = new Date();
    const currentMonth = startOfMonth(now);
    
    // Data de compra ou 5 anos atrás se não informada
    const purchaseDate = vehicle.purchaseDate 
      ? startOfMonth(parseISO(vehicle.purchaseDate))
      : addMonths(currentMonth, -60);
    
    // Valor de compra ou valor atual * 1.5 como estimativa
    const purchaseValue = vehicle.purchaseValue || vehicle.value * 1.5;
    
    // Gerar dados históricos (da compra até hoje)
    const monthsFromPurchaseToNow = differenceInMonths(currentMonth, purchaseDate);
    
    for (let i = 0; i <= monthsFromPurchaseToNow; i++) {
      const monthDate = addMonths(purchaseDate, i);
      const yearsFromPurchase = i / 12;
      const depreciationPercentage = getDepreciationPercentage(yearsFromPurchase);
      const estimatedValue = purchaseValue * (depreciationPercentage / 100);
      
      data.push({
        month: format(monthDate, 'yyyy-MM'),
        label: format(monthDate, 'MMM/yy', { locale: ptBR }),
        value: Math.round(estimatedValue),
        isProjection: false,
      });
    }
    
    // Gerar projeção futura (próximos 24 meses)
    for (let i = 1; i <= 24; i++) {
      const monthDate = addMonths(currentMonth, i);
      const yearsFromPurchase = (monthsFromPurchaseToNow + i) / 12;
      const depreciationPercentage = getDepreciationPercentage(yearsFromPurchase);
      const estimatedValue = purchaseValue * (depreciationPercentage / 100);
      
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
      // Mostrar a cada 3 meses se houver muitos dados
      return data.filter((_, index) => index % 3 === 0 || index === totalPoints - 1);
    }
    
    return data;
  }, [vehicle]);

  const currentMonthIndex = useMemo(() => {
    const now = format(new Date(), 'yyyy-MM');
    return chartData.findIndex(d => d.month === now);
  }, [chartData]);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('vehicle-insights', {
        body: { vehicle }
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
        // Handle headers
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
        // Handle list items
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <li key={index} className="ml-4 text-muted-foreground">
              {line.replace(/^[-*] /, '')}
            </li>
          );
        }
        // Handle numbered items
        if (/^\d+\. /.test(line)) {
          return (
            <li key={index} className="ml-4 text-muted-foreground list-decimal">
              {line.replace(/^\d+\. /, '')}
            </li>
          );
        }
        // Handle bold text inline
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
        // Regular paragraph
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.label}</p>
          <p className="text-primary font-semibold">{formatCurrency(data.value)}</p>
          {data.isProjection && (
            <p className="text-xs text-muted-foreground mt-1">Projeção</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 hover:text-amber-600 hover:bg-amber-50"
          title="Ver insights do veículo"
        >
          <Lightbulb className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Insights do Veículo
          </DialogTitle>
          <DialogDescription>
            Análise financeira detalhada para {vehicle.name}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
          {/* Gráfico de Evolução FIPE */}
          <div className="mb-6">
            <h3 className="font-semibold text-foreground mb-3">Evolução do Valor (Tabela FIPE)</h3>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHistorico" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProjecao" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
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
                      hide={isMobile}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      {...premiumYAxis}
                      tick={{ fontSize: 12, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {currentMonthIndex >= 0 && (
                      <ReferenceLine 
                        x={chartData[currentMonthIndex]?.label} 
                        stroke="hsl(var(--primary))" 
                        strokeDasharray="5 5"
                        label={{ value: 'Hoje', position: 'top', fontSize: 10, fill: 'hsl(var(--primary))' }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="none"
                      fill="url(#colorHistorico)"
                      fillOpacity={1}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 4, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-primary rounded"></div>
                  <span className="text-muted-foreground">Histórico</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-primary rounded opacity-50 border-dashed"></div>
                  <span className="text-muted-foreground">Projeção</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Valor de Compra</p>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(vehicle.purchaseValue || vehicle.value * 1.5)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Valor Atual</p>
                  <p className="font-semibold text-primary">
                    {formatCurrency(vehicle.value)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Em 2 anos</p>
                  <p className="font-semibold text-muted-foreground">
                    {formatCurrency(chartData[chartData.length - 1]?.value || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Insights da IA */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
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

          {/* Seguros e Garantias Vinculados */}
          <Separator className="my-6" />
          <AssetLinkedSegurosSection 
            assetId={vehicle.id}
            assetName={vehicle.name}
            assetType="vehicle"
            variant="inline"
            showAddButton={!vehicle.isSold}
          />

          {/* Linked Contas Section */}
          <Separator className="my-6" />
          <AssetLinkedContasSection 
            assetId={vehicle.id} 
            assetName={vehicle.name} 
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};