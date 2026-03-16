import React, { useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  DollarSign,
  Percent,
  Calendar,
  Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis, premiumTooltipStyle } from '@/components/charts/premiumChartTheme';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface IndicatorData {
  code: string;
  name: string;
  currentValue: number | null;
  unit: string;
  lastUpdate: string | null;
  history: { date: string; value: number }[];
}

interface EconomicIndicatorsResponse {
  success: boolean;
  data: Record<string, IndicatorData>;
  fetchedAt: string;
}

const INDICATOR_INFO: Record<string, { description: string; color: string; icon: React.ReactNode }> = {
  selic: {
    description: 'Taxa básica de juros da economia brasileira, definida pelo COPOM. Influencia todas as outras taxas de juros do país.',
    color: 'hsl(220, 90%, 56%)',
    icon: <Percent className="h-3 w-3" />,
  },
  cdi: {
    description: 'Taxa de juros entre bancos, referência para investimentos de renda fixa como CDBs, LCIs e fundos DI.',
    color: 'hsl(160, 84%, 39%)',
    icon: <Percent className="h-3 w-3" />,
  },
  ipca: {
    description: 'Índice oficial de inflação do Brasil, calculado pelo IBGE. Mede a variação de preços ao consumidor.',
    color: 'hsl(38, 92%, 50%)',
    icon: <TrendingUp className="h-3 w-3" />,
  },
  igpm: {
    description: 'Índice de preços calculado pela FGV, usado para reajuste de aluguéis e tarifas de energia.',
    color: 'hsl(280, 70%, 50%)',
    icon: <TrendingUp className="h-3 w-3" />,
  },
  dollar: {
    description: 'Cotação oficial do dólar (PTAX) calculada pelo Banco Central, referência para contratos e comércio exterior.',
    color: 'hsl(142, 76%, 36%)',
    icon: <DollarSign className="h-3 w-3" />,
  },
  tr: {
    description: 'Taxa Referencial usada para correção da poupança, FGTS e alguns financiamentos imobiliários.',
    color: 'hsl(200, 70%, 50%)',
    icon: <Percent className="h-3 w-3" />,
  },
};

const START_DATE_OPTIONS = [
  { value: '2023-01', label: 'Jan/23' },
  { value: '2023-07', label: 'Jul/23' },
  { value: '2024-01', label: 'Jan/24' },
  { value: '2024-07', label: 'Jul/24' },
  { value: '2025-01', label: 'Jan/25' },
];

const formatValue = (value: number | null, unit: string): string => {
  if (value === null) return '--';
  if (unit === 'R$') {
    return `R$ ${value.toFixed(2)}`;
  }
  return `${value.toFixed(2)}%`;
};

const formatLastUpdate = (dateStr: string | null): string => {
  if (!dateStr) return '--';
  try {
    return format(new Date(dateStr), "dd/MM/yy", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

export const EconomicIndicators: React.FC = () => {
  const isMobile = useIsMobile();
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('2023-01');

  const { data, isLoading, error, refetch, isFetching } = useQuery<EconomicIndicatorsResponse>({
    queryKey: ['economic-indicators'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('economic-indicators');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  const indicators = data?.data;
  const fetchedAt = data?.fetchedAt;

  const filteredHistory = useMemo(() => {
    if (!selectedIndicator || !indicators?.[selectedIndicator]) return [];
    
    const history = indicators[selectedIndicator].history;
    const startDateObj = new Date(startDate + '-01');
    
    return history.filter(point => new Date(point.date) >= startDateObj);
  }, [selectedIndicator, indicators, startDate]);

  const renderHistoryChart = (indicator: IndicatorData, color: string) => {
    const chartData = filteredHistory.map((point) => ({
      date: format(new Date(point.date), 'MMM/yy', { locale: ptBR }),
      value: point.value,
    }));

    const isDollar = indicator.unit === 'R$';
    const unitLabel = isDollar ? 'R$' : '%';

    return (
      <div className="w-full overflow-hidden h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid {...premiumGrid} />
            <XAxis dataKey="date" {...premiumXAxis} />
            <YAxis
              hide={isMobile}
              {...premiumYAxis}
              tick={{ fontSize: 12, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
              domain={['auto', 'auto']}
              tickFormatter={(value) => isDollar ? `${value.toFixed(2)}` : `${value.toFixed(1)}`}
              label={{ 
                value: unitLabel, 
                angle: -90, 
                position: 'insideLeft', 
                style: { textAnchor: 'middle', fontSize: 10, fill: 'hsl(var(--muted-foreground))' } 
              }}
            />
            <Tooltip
              contentStyle={premiumTooltipStyle.contentStyle}
              formatter={(value: number) => [
                isDollar ? `R$ ${value.toFixed(4)}` : `${value.toFixed(2)}%`, 
                indicator.name
              ]}
            />
            <Line 
              type="monotone" 
              dataKey="value"
              stroke={color} 
              strokeWidth={2}
              dot={chartData.length <= 24 ? { fill: color, strokeWidth: 0, r: 2 } : false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  if (error) {
    return (
      <Card className="rounded-xl border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))]">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Erro ao carregar indicadores</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
              <RefreshCw className="h-3 w-3 mr-1" />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))]">
      <CardHeader className="pb-2 p-4 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-[hsl(var(--color-text-primary))] flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Indicadores Econômicos
        </CardTitle>
        <div className="flex items-center gap-2">
          {fetchedAt && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Atualizado: {format(new Date(fetchedAt), "dd/MM HH:mm", { locale: ptBR })}
            </span>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-6 w-6"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {indicators && Object.keys(INDICATOR_INFO).map((key, index) => {
                const indicator = indicators[key];
                const info = INDICATOR_INFO[key];
                if (!indicator) return null;

                const prevValue = indicator.history[indicator.history.length - 2]?.value;
                const trend = prevValue && indicator.currentValue 
                  ? indicator.currentValue > prevValue ? 'up' : indicator.currentValue < prevValue ? 'down' : null
                  : null;

                const isSelected = selectedIndicator === key;

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
                    className={`relative p-2 rounded-lg text-center transition-all ${
                      isSelected 
                        ? 'bg-primary/10 ring-1 ring-primary/30' 
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="absolute top-1 right-1 p-0.5 rounded hover:bg-background/50">
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 text-sm" side="top">
                        <p className="font-medium mb-1">{indicator.name}</p>
                        <p className="text-xs text-muted-foreground">{info.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Última atualização: {formatLastUpdate(indicator.lastUpdate)}
                        </p>
                      </PopoverContent>
                    </Popover>
                    
                    <button
                      onClick={() => setSelectedIndicator(isSelected ? null : key)}
                      className="w-full"
                    >
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {indicator.name}
                        </span>
                        {trend === 'up' && <TrendingUp className="h-2.5 w-2.5 text-expense" />}
                        {trend === 'down' && <TrendingDown className="h-2.5 w-2.5 text-income" />}
                      </div>
                      <p className="text-sm font-bold" style={{ color: info.color }}>
                        {formatValue(indicator.currentValue, indicator.unit)}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {formatLastUpdate(indicator.lastUpdate)}
                      </p>
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {selectedIndicator && indicators?.[selectedIndicator] && (
              <motion.div 
                className="mt-4 pt-4 border-t"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" style={{ 
                    borderColor: INDICATOR_INFO[selectedIndicator].color,
                    color: INDICATOR_INFO[selectedIndicator].color 
                  }}>
                    {indicators[selectedIndicator].name}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Desde:</span>
                    <Select value={startDate} onValueChange={setStartDate}>
                      <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {START_DATE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-xs">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  {renderHistoryChart(
                    indicators[selectedIndicator], 
                    INDICATOR_INFO[selectedIndicator].color
                  )}
                </motion.div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  {filteredHistory.length} registros • Fonte: Banco Central do Brasil
                </p>
              </motion.div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
