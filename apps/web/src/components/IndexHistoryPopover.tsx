import React, { useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, History, ExternalLink } from 'lucide-react';
import { getHistoricalData } from '@/components/econograph/dataGenerator';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

interface IndexHistoryPopoverProps {
  indexKey: 'ipca' | 'incc' | 'igpm';
  children: React.ReactNode;
}

const INDEX_CONFIG = {
  ipca: { label: 'IPCA', color: '#3b82f6', dataKey: 'ipca' },
  incc: { label: 'INCC', color: '#06b6d4', dataKey: 'incc' },
  igpm: { label: 'IGPM', color: '#f59e0b', dataKey: 'ipca' }, // Using IPCA as proxy since IGPM not in data
};

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

export const IndexHistoryPopover: React.FC<IndexHistoryPopoverProps> = ({
  indexKey,
  children,
}) => {
  const navigate = useNavigate();
  const config = INDEX_CONFIG[indexKey];
  
  // Get last 5 years of data
  const chartData = useMemo(() => {
    const allData = getHistoricalData();
    const last5Years = allData.slice(-60); // Last 60 months
    
    // Calculate annual accumulated values
    const annualData: { year: string; rate: number }[] = [];
    let currentYear = '';
    let yearAccumulator = 1;
    
    last5Years.forEach((point, idx) => {
      const year = point.date.split('-')[0];
      const monthlyRate = (point[config.dataKey] as number) / 100;
      
      if (year !== currentYear) {
        if (currentYear !== '') {
          annualData.push({
            year: currentYear,
            rate: (yearAccumulator - 1) * 100,
          });
        }
        currentYear = year;
        yearAccumulator = 1 + monthlyRate;
      } else {
        yearAccumulator *= (1 + monthlyRate);
      }
      
      // Handle last iteration
      if (idx === last5Years.length - 1 && currentYear !== '') {
        annualData.push({
          year: currentYear,
          rate: (yearAccumulator - 1) * 100,
        });
      }
    });
    
    return annualData;
  }, [config.dataKey]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return { avg: 0, min: 0, max: 0, current: 0 };
    
    const rates = chartData.map(d => d.rate);
    return {
      avg: rates.reduce((a, b) => a + b, 0) / rates.length,
      min: Math.min(...rates),
      max: Math.max(...rates),
      current: rates[rates.length - 1] || 0,
    };
  }, [chartData]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Histórico {config.label}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              Últimos 5 anos
            </Badge>
          </div>
        </div>
        
        <div className="p-3 space-y-3">
          {/* Mini Chart */}
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="year" 
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  hide 
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <RechartsTooltip
                  formatter={(value: number) => [formatPercent(value), config.label]}
                  labelFormatter={(label) => `Ano ${label}`}
                  contentStyle={{
                    fontSize: '12px',
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--background))',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke={config.color}
                  strokeWidth={2}
                  dot={{ fill: config.color, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-muted/50 rounded">
              <p className="text-muted-foreground">Média</p>
              <p className="font-semibold" style={{ color: config.color }}>
                {formatPercent(stats.avg)}
              </p>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <p className="text-muted-foreground">Atual ({chartData[chartData.length - 1]?.year})</p>
              <p className="font-semibold">{formatPercent(stats.current)}</p>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <p className="text-muted-foreground">Mínimo</p>
              <p className="font-semibold text-green-600">{formatPercent(stats.min)}</p>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <p className="text-muted-foreground">Máximo</p>
              <p className="font-semibold text-amber-600">{formatPercent(stats.max)}</p>
            </div>
          </div>
          
          {/* Link to EconoGraph */}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => navigate('/econograph')}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Ver análise completa no EconoGraph
            <ExternalLink className="h-3 w-3 ml-auto" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
