import React, { useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingDown, ArrowRight, Info } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis, premiumTooltipStyle } from '@/components/charts/premiumChartTheme';
import { cn } from '@/lib/utils';

interface DepreciationData {
  year: number;
  valueA: number;
  valueB: number;
  depreciationA: number;
  depreciationB: number;
}

interface DepreciationComparisonSectionProps {
  valueA: number;
  valueB: number;
  depreciationData: DepreciationData[];
  hasV6ResultA: boolean;
  hasV6ResultB: boolean;
}

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatMoneyShort = (value: number): string => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return formatMoney(value);
};

const formatNumberShort = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

export const DepreciationComparisonSection: React.FC<DepreciationComparisonSectionProps> = ({
  valueA,
  valueB,
  depreciationData,
  hasV6ResultA,
  hasV6ResultB,
}) => {
  const isMobile = useIsMobile();
  // Calcular dados da tabela com colunas de diferença
  const tableData = useMemo(() => {
    const rows = [
      {
        period: 'Hoje',
        valueA,
        valueB,
        lossA: 0,
        lossB: 0,
        diffAbsolute: valueB - valueA,
        diffPercent: valueA > 0 ? ((valueB - valueA) / valueA) * 100 : 0,
        isToday: true,
      },
      ...depreciationData.map(d => ({
        period: d.year === 1 ? '1 ano' : `${d.year} anos`,
        valueA: d.valueA,
        valueB: d.valueB,
        lossA: d.depreciationA,
        lossB: d.depreciationB,
        diffAbsolute: d.valueB - d.valueA,
        diffPercent: d.valueA > 0 ? ((d.valueB - d.valueA) / d.valueA) * 100 : 0,
        isToday: false,
      })),
    ];
    return rows;
  }, [valueA, valueB, depreciationData]);

  // Dados do gráfico com linha de diferença
  const chartData = useMemo(() => {
    const data = [
      { 
        name: 'Hoje', 
        carroA: valueA, 
        carroB: valueB,
        diferenca: valueB - valueA,
      },
      ...depreciationData.map(d => ({
        name: `${d.year}A`,
        carroA: d.valueA,
        carroB: d.valueB,
        diferenca: d.valueB - d.valueA,
      })),
    ];
    return data;
  }, [valueA, valueB, depreciationData]);

  // Calcular depreciação percentual total em 5 anos
  const depFiveYearsA = depreciationData.find(d => d.year === 5);
  const depFiveYearsB = depreciationData.find(d => d.year === 5);
  const depPercentA = depFiveYearsA && valueA > 0 ? ((valueA - depFiveYearsA.valueA) / valueA) * 100 : 0;
  const depPercentB = depFiveYearsB && valueB > 0 ? ((valueB - depFiveYearsB.valueB) / valueB) * 100 : 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const carroA = payload.find((p: any) => p.dataKey === 'carroA')?.value || 0;
    const carroB = payload.find((p: any) => p.dataKey === 'carroB')?.value || 0;
    const diferenca = carroB - carroA;
    const diffPercent = carroA > 0 ? ((carroB - carroA) / carroA) * 100 : 0;
    
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-bold mb-2">{label}</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(217, 91%, 60%)' }} />
            <span className="text-muted-foreground">Carro A:</span>
            <span className="font-semibold ml-auto">{formatMoney(carroA)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(43, 96%, 56%)' }} />
            <span className="text-muted-foreground">Carro B:</span>
            <span className="font-semibold ml-auto">{formatMoney(carroB)}</span>
          </div>
          <div className="pt-1.5 border-t mt-1.5">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Diferença (B - A):</span>
              <span className={cn(
                "font-semibold ml-auto",
                diferenca > 0 ? "text-amber-600" : diferenca < 0 ? "text-blue-600" : ""
              )}>
                {diferenca >= 0 ? '+' : ''}{formatMoney(diferenca)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Variação:</span>
              <span className={cn(
                "ml-auto",
                diffPercent > 0 ? "text-amber-600" : diffPercent < 0 ? "text-blue-600" : ""
              )}>
                {formatPercent(diffPercent)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-primary" />
          Projeção de Valor ao Longo do Tempo
          {(hasV6ResultA || hasV6ResultB) && (
            <Badge className="h-5 px-1.5 text-[10px] bg-primary/20 text-primary border-0 font-medium">
              <Sparkles className="h-3 w-3 mr-1" />
              Motor Inteligente
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          {(hasV6ResultA || hasV6ResultB) 
            ? 'Projeções calculadas com regressão sobre o histórico FIPE de cada modelo'
            : 'Estimativa do valor de mercado e perda acumulada ao longo do tempo'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo de depreciação em 5 anos */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Carro A</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">{formatMoneyShort(valueA)}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-lg font-bold">{formatMoneyShort(depFiveYearsA?.valueA || 0)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Perda de <span className="text-red-500 font-medium">{depPercentA.toFixed(0)}%</span> em 5 anos
            </p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Carro B</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">{formatMoneyShort(valueB)}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-lg font-bold">{formatMoneyShort(depFiveYearsB?.valueB || 0)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Perda de <span className="text-red-500 font-medium">{depPercentB.toFixed(0)}%</span> em 5 anos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tabela com colunas bem definidas */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-xs sm:text-sm min-w-[420px]">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-2 px-2 text-left font-medium text-muted-foreground">Período</th>
                  <th className="py-2 px-2 text-center font-medium text-muted-foreground" colSpan={2}>
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="text-blue-600">Carro A</span>
                    </div>
                  </th>
                  <th className="py-2 px-2 text-center font-medium text-muted-foreground" colSpan={2}>
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-amber-600">Carro B</span>
                    </div>
                  </th>
                  <th className="py-2 px-2 text-center font-medium text-muted-foreground">
                    <span className="text-xs">Diferença</span>
                  </th>
                </tr>
                <tr className="border-b text-[10px] text-muted-foreground">
                  <th className="py-1 px-2"></th>
                  <th className="py-1 px-1 text-right font-normal">Valor</th>
                  <th className="py-1 px-1 text-right font-normal">Perda</th>
                  <th className="py-1 px-1 text-right font-normal">Valor</th>
                  <th className="py-1 px-1 text-right font-normal">Perda</th>
                  <th className="py-1 px-1 text-center font-normal">B - A</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, idx) => (
                  <tr key={idx} className={cn(
                    "border-b transition-colors",
                    row.isToday ? "bg-muted/30" : "hover:bg-muted/20"
                  )}>
                    <td className="py-1.5 px-2 font-medium">{row.period}</td>
                    <td className="py-1.5 px-1 text-right tabular-nums text-blue-700 dark:text-blue-400">
                      {formatNumberShort(row.valueA)}
                    </td>
                    <td className="py-1.5 px-1 text-right tabular-nums text-red-500">
                      {row.lossA > 0 ? `-${formatNumberShort(row.lossA)}` : '-'}
                    </td>
                    <td className="py-1.5 px-1 text-right tabular-nums text-amber-700 dark:text-amber-400">
                      {formatNumberShort(row.valueB)}
                    </td>
                    <td className="py-1.5 px-1 text-right tabular-nums text-red-500">
                      {row.lossB > 0 ? `-${formatNumberShort(row.lossB)}` : '-'}
                    </td>
                    <td className="py-1.5 px-1 text-center tabular-nums">
                      <div className={cn(
                        "text-xs",
                        row.diffAbsolute > 0 ? "text-amber-600" : row.diffAbsolute < 0 ? "text-blue-600" : "text-muted-foreground"
                      )}>
                        {row.diffAbsolute !== 0 ? (
                          <>
                            <span className="font-medium">
                              {row.diffAbsolute > 0 ? '+' : ''}{formatNumberShort(row.diffAbsolute)}
                            </span>
                            <span className="text-[10px] ml-0.5">
                              ({formatPercent(row.diffPercent)})
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gráfico de projeção de valor */}
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
                <CartesianGrid {...premiumGrid} />
                <XAxis 
                  dataKey="name" 
                  {...premiumXAxis}
                  tick={{ fontSize: 12, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
                />
                <YAxis
                  hide={isMobile}
                  tickFormatter={(v) => formatMoneyShort(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '11px' }}
                  iconSize={10}
                />
                <Line 
                  type="monotone" 
                  dataKey="carroA" 
                  name="Valor Carro A" 
                  stroke="hsl(217, 91%, 60%)" 
                  strokeWidth={3}
                  dot={{ r: 3, fill: 'hsl(217, 91%, 60%)' }}
                  activeDot={{ r: 5, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="carroB" 
                  name="Valor Carro B" 
                  stroke="hsl(43, 96%, 56%)" 
                  strokeWidth={3}
                  dot={{ r: 3, fill: 'hsl(43, 96%, 56%)' }}
                  activeDot={{ r: 5, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Legenda explicativa */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-muted-foreground border-t">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-blue-500 rounded" />
            <span>Valor Carro A</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-amber-500 rounded" />
            <span>Valor Carro B</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            <span>Diferença exibida no tooltip</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
