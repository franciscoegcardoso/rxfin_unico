import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis, premiumTooltipStyle, formatBRLCompact, chartColors } from '@/components/charts/premiumChartTheme';
import type { ParsedHistoryPoint } from '@/hooks/useFipeFullHistory';

interface FipeHistoryComparisonChartProps {
  historyA: ParsedHistoryPoint[];
  historyB: ParsedHistoryPoint[];
  loadingA: boolean;
  loadingB: boolean;
  nameA: string;
  nameB: string;
  hasHistoryA: boolean;
  hasHistoryB: boolean;
}

interface MergedPoint {
  date: string;
  timestamp: number;
  priceA?: number;
  priceB?: number;
}

export const FipeHistoryComparisonChart: React.FC<FipeHistoryComparisonChartProps> = ({
  historyA,
  historyB,
  loadingA,
  loadingB,
  nameA,
  nameB,
  hasHistoryA,
  hasHistoryB,
}) => {
  const isLoading = loadingA || loadingB;

  const mergedData = useMemo(() => {
    const map = new Map<string, MergedPoint>();

    for (const p of historyA) {
      const key = p.monthLabel;
      const existing = map.get(key);
      if (existing) {
        existing.priceA = p.price;
      } else {
        map.set(key, { date: key, timestamp: p.date.getTime(), priceA: p.price });
      }
    }

    for (const p of historyB) {
      const key = p.monthLabel;
      const existing = map.get(key);
      if (existing) {
        existing.priceB = p.price;
      } else {
        map.set(key, { date: key, timestamp: p.date.getTime(), priceB: p.price });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [historyA, historyB]);

  // Simplify X axis labels: show only Jan of each year as 'YY
  const tickFormatter = (value: string) => {
    // monthLabel format varies: "jan/23", "fev/24", etc.
    const parts = value.split('/');
    if (parts.length === 2 && parts[0].toLowerCase() === 'jan') {
      return `'${parts[1]}`;
    }
    return '';
  };

  const formatMoney = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando histórico...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasHistoryA && !hasHistoryB) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-xs text-muted-foreground">Histórico FIPE indisponível para os veículos selecionados</p>
        </CardContent>
      </Card>
    );
  }

  if (mergedData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Histórico FIPE
        </CardTitle>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full bg-blue-500" />
            <span className="truncate max-w-[180px]">{nameA || 'Carro A'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full bg-amber-500" />
            <span className="truncate max-w-[180px]">{nameB || 'Carro B'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={mergedData}
              margin={{ top: 5, right: 15, left: 15, bottom: 5 }}
            >
              <CartesianGrid {...premiumGrid} />
              <XAxis
                dataKey="date"
                {...premiumXAxis}
                tickFormatter={tickFormatter}
                interval="preserveStartEnd"
              />
              <YAxis
                {...premiumYAxis}
                tickFormatter={formatBRLCompact}
                hide
              />
              <Tooltip
                contentStyle={premiumTooltipStyle.contentStyle}
                labelFormatter={(label) => label}
                formatter={(value: number, name: string) => [
                  formatMoney(value),
                  name,
                ]}
              />
              {hasHistoryA && (
                <Line
                  type="monotone"
                  dataKey="priceA"
                  name={nameA || 'Carro A'}
                  stroke="hsl(217, 70%, 55%)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  connectNulls={false}
                />
              )}
              {hasHistoryB && (
                <Line
                  type="monotone"
                  dataKey="priceB"
                  name={nameB || 'Carro B'}
                  stroke="hsl(38, 92%, 50%)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  connectNulls={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
