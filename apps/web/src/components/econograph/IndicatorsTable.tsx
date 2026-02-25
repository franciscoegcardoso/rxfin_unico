import React, { useMemo } from 'react';
import { DataPoint, ASSETS_CONFIG } from './types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { TableProperties } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IndicatorsTableProps {
  data: DataPoint[];
  activeIndicators: string[];
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Group data by indicator -> year -> month
const processData = (data: DataPoint[], activeIndicators: string[]) => {
  const result: Record<string, Record<number, Record<number, number>>> = {};
  const years = new Set<number>();

  activeIndicators.forEach(indicator => {
    result[indicator] = {};
  });

  data.forEach(point => {
    const [yearStr, monthStr] = point.date.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    years.add(year);

    activeIndicators.forEach(indicator => {
      if (!result[indicator][year]) {
        result[indicator][year] = {};
      }
      const value = point[indicator];
      if (typeof value === 'number') {
        result[indicator][year][month] = value;
      }
    });
  });

  return { data: result, years: Array.from(years).sort((a, b) => a - b) };
};

// Calculate annual accumulated value for rate-based assets (compound)
const calculateAnnualAccumulated = (yearData: Record<number, number>, type: 'rate' | 'price') => {
  if (type === 'rate') {
    // Compound monthly rates: (1 + r1/100) * (1 + r2/100) * ... - 1
    let accumulated = 1;
    for (let month = 1; month <= 12; month++) {
      const rate = yearData[month];
      if (rate !== undefined) {
        accumulated *= (1 + rate / 100);
      }
    }
    return (accumulated - 1) * 100;
  } else {
    // For price assets, show the annual percentage change
    const jan = yearData[1];
    const dec = yearData[12];
    if (jan && dec) {
      return ((dec - jan) / jan) * 100;
    }
    // If we don't have both, try to get first and last available
    const months = Object.keys(yearData).map(Number).sort((a, b) => a - b);
    if (months.length >= 2) {
      const first = yearData[months[0]];
      const last = yearData[months[months.length - 1]];
      return ((last - first) / first) * 100;
    }
    return null;
  }
};

// Calculate min/max for heatmap per indicator across all years
const getIndicatorMinMax = (
  indicatorData: Record<number, Record<number, number>>
): { min: number; max: number } => {
  let min = Infinity;
  let max = -Infinity;
  
  Object.values(indicatorData).forEach(yearData => {
    Object.values(yearData).forEach(value => {
      if (value < min) min = value;
      if (value > max) max = value;
    });
  });
  
  return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max };
};

// Get heatmap background color based on value position in range
const getHeatmapColor = (
  value: number | undefined,
  min: number,
  max: number,
  type: 'rate' | 'price'
): string => {
  if (value === undefined) return 'transparent';
  
  const range = max - min;
  if (range === 0) return 'hsl(var(--muted) / 0.3)';
  
  const normalized = (value - min) / range;
  
  if (type === 'rate') {
    // For rates: lower is better (green), higher is worse (red)
    // Inverted: low values = green, high values = red
    if (normalized <= 0.2) return 'hsl(142 76% 36% / 0.25)'; // Deep green
    if (normalized <= 0.4) return 'hsl(142 71% 45% / 0.20)'; // Light green
    if (normalized <= 0.6) return 'hsl(48 96% 53% / 0.25)';  // Yellow
    if (normalized <= 0.8) return 'hsl(25 95% 53% / 0.25)';  // Orange
    return 'hsl(0 84% 60% / 0.25)'; // Red
  } else {
    // For prices: higher is better (green), lower is worse (red)
    if (normalized <= 0.2) return 'hsl(0 84% 60% / 0.25)';   // Red
    if (normalized <= 0.4) return 'hsl(25 95% 53% / 0.25)';  // Orange
    if (normalized <= 0.6) return 'hsl(48 96% 53% / 0.25)';  // Yellow
    if (normalized <= 0.8) return 'hsl(142 71% 45% / 0.20)'; // Light green
    return 'hsl(142 76% 36% / 0.25)'; // Deep green
  }
};

// Format value for display
const formatValue = (value: number | undefined | null, type: 'rate' | 'price', isAnnual = false): string => {
  if (value === undefined || value === null) return '-';
  
  if (type === 'rate' || isAnnual) {
    const formatted = value.toFixed(2);
    return `${value >= 0 ? '' : ''}${formatted}%`;
  }
  
  // For price type monthly values, show formatted number
  if (value >= 1000) {
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }
  return value.toFixed(2);
};

export const IndicatorsTable: React.FC<IndicatorsTableProps> = ({ data, activeIndicators }) => {
  const processed = useMemo(() => processData(data, activeIndicators), [data, activeIndicators]);

  if (activeIndicators.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TableProperties className="h-4 w-4 text-primary" />
          Tabela de Indicadores
        </CardTitle>
        <CardDescription>
          Valores mensais (a.m.) e acumulado anual (a.a.) dos indicadores selecionados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-[900px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-24 sticky left-0 bg-background z-10 font-semibold"></TableHead>
                  {MONTHS.map(month => (
                    <TableHead key={month} className="text-center w-16 px-1 text-xs font-medium">
                      {month}
                    </TableHead>
                  ))}
                  <TableHead className="text-center w-24 px-1 text-xs font-semibold bg-muted/50">
                    Acum. Ano
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeIndicators.map((indicator, indicatorIdx) => {
                  const config = ASSETS_CONFIG[indicator];
                  if (!config) return null;

                  const indicatorYears = Object.keys(processed.data[indicator] || {})
                    .map(Number)
                    .sort((a, b) => a - b);

                  return (
                    <React.Fragment key={indicator}>
                      {/* Indicator header row */}
                      <TableRow className="hover:bg-transparent bg-muted/30 border-t-2 border-muted">
                        <TableCell 
                          colSpan={14} 
                          className="font-semibold py-2 sticky left-0 bg-muted/30"
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: config.color }}
                            />
                            <span>{config.label}</span>
                            <span className="text-xs text-muted-foreground font-normal">
                              ({config.type === 'rate' ? 'taxa' : 'preço'})
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Year rows for this indicator */}
                      {indicatorYears.map((year, yearIdx) => {
                        const yearData = processed.data[indicator][year] || {};
                        const annualAccum = calculateAnnualAccumulated(yearData, config.type);
                        const isLastYear = yearIdx === indicatorYears.length - 1;
                        const { min, max } = getIndicatorMinMax(processed.data[indicator]);

                        return (
                          <TableRow 
                            key={`${indicator}-${year}`} 
                            className={cn(
                              "hover:bg-muted/20",
                              isLastYear && indicatorIdx < activeIndicators.length - 1 && "border-b-0"
                            )}
                          >
                            <TableCell className="font-medium text-xs sticky left-0 bg-background z-10 pl-6">
                              {year}
                            </TableCell>
                            {MONTHS.map((_, monthIdx) => {
                              const month = monthIdx + 1;
                              const value = yearData[month];
                              const bgColor = getHeatmapColor(value, min, max, config.type);
                              return (
                                <TableCell 
                                  key={month} 
                                  className="text-center text-xs tabular-nums px-1 py-1.5"
                                  style={{ backgroundColor: bgColor }}
                                >
                                  {formatValue(value, config.type)}
                                </TableCell>
                              );
                            })}
                            <TableCell 
                              className={cn(
                                "text-center text-xs font-semibold tabular-nums bg-muted/50 px-1 py-1.5",
                                annualAccum !== null && (
                                  annualAccum > 0 ? "text-income" : "text-expense"
                                )
                              )}
                            >
                              {formatValue(annualAccum, 'rate', true)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
