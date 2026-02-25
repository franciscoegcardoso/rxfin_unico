import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis } from '@/components/charts/premiumChartTheme';
import { TrendingUp, Landmark, CreditCard, Fuel, Sparkles } from 'lucide-react';
import { ExpandableChartButton } from '@/components/charts/ExpandableChartButton';

interface CompositionDataPoint {
  mes: number;
  capitalComRendimento: number;
  parcelasComRendimento: number;
  despesasComRendimento: number;
  rendimentoCapital: number;
  rendimentoParcelas: number;
  rendimentoDespesas: number;
  totalRendimentos: number;
  totalPatrimonio: number;
  valorCarro: number;
  parcelasAcumuladas: number;
  despesasAcumuladas: number;
}

interface WealthEvolutionChartProps {
  compositionData: CompositionDataPoint[];
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

  const data = payload[0]?.payload as CompositionDataPoint;
  if (!data) return null;

  const anos = Math.floor(label / 12);
  const meses = label % 12;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-4 text-sm min-w-[240px]">
      <p className="font-medium text-muted-foreground mb-3 border-b pb-2">
        {anos > 0 ? `${anos} ano${anos > 1 ? 's' : ''}` : ''} 
        {meses > 0 ? `${anos > 0 ? ' e ' : ''}${meses} ${meses === 1 ? 'mês' : 'meses'}` : ''}
        {anos === 0 && meses === 0 ? 'Início' : ''}
      </p>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <span className="text-muted-foreground">Capital + CDI</span>
          </div>
          <span className="font-semibold">{formatMoney(data.capitalComRendimento)}</span>
        </div>
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-amber-500" />
            <span className="text-muted-foreground">Parcelas + CDI</span>
          </div>
          <span className="font-semibold">{formatMoney(data.parcelasComRendimento)}</span>
        </div>
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-orange-500" />
            <span className="text-muted-foreground">Despesas + CDI</span>
          </div>
          <span className="font-semibold">{formatMoney(data.despesasComRendimento)}</span>
        </div>
        
        <div className="pt-2 border-t border-border mt-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">Rendimentos</span>
            </div>
            <span className="font-semibold text-primary">{formatMoney(data.totalRendimentos)}</span>
          </div>
        </div>
        
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">Total Patrimônio</span>
            <span className="font-bold text-primary">{formatMoney(data.totalPatrimonio)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomLegend = () => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 md:gap-5 mt-4 text-xs">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-blue-500" />
        <span className="text-muted-foreground">Capital</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-amber-500" />
        <span className="text-muted-foreground">Parcelas</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-orange-500" />
        <span className="text-muted-foreground">Despesas</span>
      </div>
    </div>
  );
};

export const WealthEvolutionChart: React.FC<WealthEvolutionChartProps> = ({
  compositionData,
  selectedHorizon
}) => {
  const finalData = compositionData[compositionData.length - 1];
  
  if (!finalData) return null;

  const totalFinal = finalData.totalPatrimonio;
  const percentCapital = ((finalData.capitalComRendimento / totalFinal) * 100).toFixed(0);
  const percentParcelas = ((finalData.parcelasComRendimento / totalFinal) * 100).toFixed(0);
  const percentDespesas = ((finalData.despesasComRendimento / totalFinal) * 100).toFixed(0);
  
  // Check if we have meaningful data for parcelas and despesas
  const hasParcelas = finalData.parcelasComRendimento > 0;
  const hasDespesas = finalData.despesasComRendimento > 0;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Evolução Mensal do Patrimônio
            </CardTitle>
            <CardDescription>
              Composição mês a mês em {selectedHorizon} ano{selectedHorizon > 1 ? 's' : ''}
            </CardDescription>
          </div>
          <ExpandableChartButton title="Evolução Mensal do Patrimônio" subtitle={`Composição mês a mês em ${selectedHorizon} ano${selectedHorizon > 1 ? 's' : ''}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={compositionData} margin={{ top: 10, right: 15, left: 15, bottom: 0 }}>
                <CartesianGrid {...premiumGrid} />
                <XAxis dataKey="month" {...premiumXAxis} />
                <YAxis hide tickFormatter={(v: number) => formatMoney(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="capitalComRendimento" stackId="1" stroke="hsl(220, 70%, 50%)" fill="hsl(220, 70%, 50%)" fillOpacity={0.6} name="Capital" />
                <Area type="monotone" dataKey="parcelasComRendimento" stackId="1" stroke="hsl(38, 92%, 50%)" fill="hsl(38, 92%, 50%)" fillOpacity={0.6} name="Parcelas" />
                <Area type="monotone" dataKey="despesasComRendimento" stackId="1" stroke="hsl(24, 80%, 50%)" fill="hsl(24, 80%, 50%)" fillOpacity={0.6} name="Despesas" />
              </AreaChart>
            </ResponsiveContainer>
          </ExpandableChartButton>
        </div>
        
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/30 text-blue-600 text-xs font-medium">
            <Landmark className="h-3 w-3" />
            <span>Capital: {percentCapital}%</span>
          </div>
          {hasParcelas && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-600 text-xs font-medium">
              <CreditCard className="h-3 w-3" />
              <span>Parcelas: {percentParcelas}%</span>
            </div>
          )}
          {hasDespesas && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950/30 text-orange-600 text-xs font-medium">
              <Fuel className="h-3 w-3" />
              <span>Despesas: {percentDespesas}%</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Sparkles className="h-3 w-3" />
            <span>Rendimentos: {formatMoney(finalData.totalRendimentos)}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="h-[280px] md:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={compositionData}
              margin={{ top: 10, right: 15, left: 15, bottom: 0 }}
            >
                <defs>
                  <linearGradient id="colorCapitalEvo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorParcelas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
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
              
              {/* Stacked areas: Capital (bottom) + Parcelas + Despesas (top) */}
              <Area
                type="monotone"
                dataKey="capitalComRendimento"
                name="Capital + Rendimento"
                stackId="1"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#colorCapitalEvo)"
              />
              <Area
                type="monotone"
                dataKey="parcelasComRendimento"
                name="Parcelas + Rendimento"
                stackId="1"
                stroke="#f59e0b"
                strokeWidth={3}
                fill="url(#colorParcelas)"
              />
              <Area
                type="monotone"
                dataKey="despesasComRendimento"
                name="Despesas + Rendimento"
                stackId="1"
                stroke="#f97316"
                strokeWidth={3}
                fill="url(#colorDespesas)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <CustomLegend />
      </CardContent>
    </Card>
  );
};
