import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { TrendingUp, TrendingDown } from 'lucide-react';
import { premiumGrid, premiumXAxis, premiumYAxis, premiumTooltipStyle } from '@/components/charts/premiumChartTheme';

interface ChartDataPoint {
  mes: number;
  investido: number;
  carro: number;
}

interface WealthComparisonChartProps {
  chartData: ChartDataPoint[];
  selectedHorizon: number;
}

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatMoneyCompact = (value: number): string => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return formatMoney(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const investido = payload.find((p: any) => p.dataKey === 'investido')?.value || 0;
  const carro = payload.find((p: any) => p.dataKey === 'carro')?.value || 0;
  const gap = investido - carro;
  const anos = Math.floor(label / 12);
  const meses = label % 12;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-muted-foreground mb-2">
        {anos > 0 ? `${anos} ano${anos > 1 ? 's' : ''}` : ''} 
        {meses > 0 ? ` ${meses} ${meses === 1 ? 'mês' : 'meses'}` : ''}
        {anos === 0 && meses === 0 ? 'Início' : ''}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">Investido:</span>
          <span className="font-semibold text-primary">{formatMoney(investido)}</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingDown className="h-3.5 w-3.5 text-destructive" />
          <span className="text-muted-foreground">Carro:</span>
          <span className="font-semibold text-destructive">{formatMoney(carro)}</span>
        </div>
        <div className="pt-1.5 border-t border-border">
          <span className="text-muted-foreground">Gap: </span>
          <span className="font-bold text-foreground">{formatMoney(gap)}</span>
        </div>
      </div>
    </div>
  );
};

export const WealthComparisonChart: React.FC<WealthComparisonChartProps> = ({
  chartData,
  selectedHorizon
}) => {
  // Simplify data for display - show key points
  const simplifiedData = chartData.filter((_, index) => {
    // Always show first and last
    if (index === 0 || index === chartData.length - 1) return true;
    // Show every 6 months for 1-2 years, every 12 for longer
    const interval = selectedHorizon <= 2 ? 6 : 12;
    return index % interval === 0;
  });

  // Calculate the gap area
  const finalInvestido = chartData[chartData.length - 1]?.investido || 0;
  const finalCarro = chartData[chartData.length - 1]?.carro || 0;
  const finalGap = finalInvestido - finalCarro;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Investimento vs Valor do Carro
            </CardTitle>
            <CardDescription>
              Projeção de {selectedHorizon} ano{selectedHorizon > 1 ? 's' : ''}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Gap Final</p>
            <p className="text-lg font-bold text-primary">{formatMoney(finalGap)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[280px] md:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 15, left: 15, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorInvestido" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCarro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid {...premiumGrid} />
              <XAxis 
                dataKey="mes" 
                {...premiumXAxis}
                tickFormatter={(value) => {
                  if (value === 0) return '0';
                  const anos = Math.floor(value / 12);
                  const meses = value % 12;
                  if (meses === 0) return `${anos}a`;
                  if (anos === 0) return `${meses}m`;
                  return `${anos}a${meses}m`;
                }}
                interval="preserveStartEnd"
              />
              <YAxis 
                hide
                tickFormatter={formatMoneyCompact}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Reference lines for year markers */}
              {[12, 24, 36, 48].filter(m => m < chartData.length).map(mes => (
                <ReferenceLine 
                  key={mes}
                  x={mes} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="3 3"
                  strokeOpacity={0.3}
                />
              ))}
              
              <Area
                type="monotone"
                dataKey="investido"
                name="Patrimônio Investido"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fill="url(#colorInvestido)"
              />
              <Area
                type="monotone"
                dataKey="carro"
                name="Valor do Carro"
                stroke="hsl(var(--destructive))"
                strokeWidth={3}
                fill="url(#colorCarro)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-primary rounded-full" />
            <span className="text-muted-foreground">Patrimônio se investisse</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-destructive rounded-full" />
            <span className="text-muted-foreground">Valor do carro</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
