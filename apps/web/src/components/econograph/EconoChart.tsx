import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis } from '@/components/charts/premiumChartTheme';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RotateCcw, TrendingUp, TrendingDown, Minus, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChartData } from './types';
import { cn } from '@/lib/utils';

interface EconoChartProps {
  data: ChartData;
  title: string;
  tab: 'overview' | 'portfolio';
  isWeightValid: boolean;
  totalWeight: number;
  showBenchmarks: boolean;
  onToggleBenchmarks: () => void;
  onResetWeights: () => void;
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
  payload: Record<string, unknown>;
}

// Custom tooltip for the chart
const CustomTooltip = ({ 
  active, 
  payload, 
  label,
  tab,
}: { 
  active?: boolean; 
  payload?: TooltipPayloadItem[];
  label?: string;
  tab: 'overview' | 'portfolio';
}) => {
  if (!active || !payload?.length) return null;
  
  const portfolioValue = payload.find(p => p.name === 'Minha Carteira')?.value;
  
  // Sort by value descending
  const sortedPayload = [...payload].sort((a, b) => b.value - a.value);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200 shadow-2xl max-w-sm"
    >
      {/* Date header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <p className="text-slate-900 text-sm font-black uppercase tracking-wider">{label}</p>
        {tab === 'portfolio' && portfolioValue && (
          <span className="text-[10px] px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold">
            Carteira: {portfolioValue.toFixed(1)}
          </span>
        )}
      </div>
      
      {/* Values */}
      <div className="space-y-2">
        {sortedPayload.map((entry, index) => {
          const isPortfolio = entry.name === 'Minha Carteira';
          const gap = tab === 'portfolio' && portfolioValue && !isPortfolio
            ? ((portfolioValue / entry.value) - 1) * 100
            : null;
          
          const returnValue = entry.value - 100;
          const isPositive = returnValue >= 0;
          
          return (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "flex items-center justify-between gap-4 p-2.5 rounded-xl transition-all",
                isPortfolio 
                  ? "bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200" 
                  : "hover:bg-slate-50"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white shadow-sm" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className={cn(
                  "text-sm truncate",
                  isPortfolio ? "font-black text-slate-900" : "font-medium text-slate-600"
                )}>
                  {entry.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Return indicator */}
                <div className={cn(
                  "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg",
                  isPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                )}>
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : returnValue === 0 ? (
                    <Minus className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{isPositive ? '+' : ''}{returnValue.toFixed(1)}%</span>
                </div>
                
                {/* Gap vs portfolio */}
                {gap !== null && (
                  <span className={cn(
                    "text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-wider",
                    gap >= 0 
                      ? "bg-emerald-500 text-white" 
                      : "bg-red-500 text-white"
                  )}>
                    {gap >= 0 ? '+' : ''}{gap.toFixed(0)}%
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Educational footer */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 font-medium">
          {tab === 'overview' 
            ? '💡 Base 100 = todos começam iguais para comparação justa'
            : '💡 Compare sua carteira (linha grossa) com os benchmarks'
          }
        </p>
      </div>
    </motion.div>
  );
};

export const EconoChart: React.FC<EconoChartProps> = ({
  data,
  title,
  tab,
  isWeightValid,
  totalWeight,
  showBenchmarks,
  onToggleBenchmarks,
  onResetWeights,
}) => {
  // Transform data for Recharts
  const chartData = data.labels.map((label, index) => {
    const point: Record<string, string | number> = { date: label };
    data.datasets.forEach(dataset => {
      point[dataset.label] = dataset.data[index];
    });
    return point;
  });

  // Show only every nth label for readability
  const tickInterval = Math.ceil(chartData.length / 8);

  return (
    <div className="relative overflow-hidden">
      {/* Error Overlay */}
      <AnimatePresence>
        {tab === 'portfolio' && !isWeightValid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-white/98 backdrop-blur-sm flex items-center justify-center p-6 rounded-2xl"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              className="text-center max-w-md"
            >
              <div className="w-24 h-24 bg-red-100 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-12 h-12" />
              </div>
              <h4 className="text-2xl font-black text-slate-900 mb-3">
                Alocação Incompleta
              </h4>
              <p className="text-slate-500 mb-6">
                Para simular sua carteira, a soma dos pesos deve ser exatamente 100%.
              </p>
              <div className="bg-slate-100 rounded-2xl p-6 mb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  Total atual
                </p>
                <p className="font-sans font-bold tracking-tight leading-none tabular-nums text-[40px] md:text-[48px] text-red-500">{totalWeight}%</p>
                <p className="text-sm text-slate-500 mt-2">
                  {totalWeight < 100 
                    ? `Faltam ${100 - totalWeight}%` 
                    : `Excedeu em ${totalWeight - 100}%`
                  }
                </p>
              </div>
              <Button onClick={onResetWeights} size="lg" className="w-full h-14 text-base font-bold rounded-2xl">
                <RotateCcw className="w-5 h-5 mr-2" />
                Usar Alocação Sugerida
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {tab === 'overview' 
              ? 'Passe o mouse sobre o gráfico para ver valores detalhados'
              : 'Linha grossa = sua carteira | Tracejadas = benchmarks'
            }
          </p>
        </div>
        {tab === 'portfolio' && (
          <Button
            variant={showBenchmarks ? "default" : "outline"}
            size="sm"
            onClick={onToggleBenchmarks}
            className="shrink-0 rounded-xl h-10 px-4 font-bold"
          >
            {showBenchmarks ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Ocultar Benchmarks
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Comparar com Mercado
              </>
            )}
          </Button>
        )}
      </div>

      {/* Chart */}
      <div className="relative w-full h-[350px] md:h-[450px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
          >
            <CartesianGrid {...premiumGrid} />
            <XAxis
              dataKey="date"
              {...premiumXAxis}
              tick={{ fontSize: 12, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
              interval={tickInterval}
            />
            <YAxis
              {...premiumYAxis}
              tick={{ fontSize: 12, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
              tickFormatter={(value) => `${value.toFixed(0)}`}
              width={50}
            />
            <ReferenceLine y={100} stroke="#cbd5e1" strokeDasharray="5 5" />
            <Tooltip 
              content={<CustomTooltip tab={tab} />}
              cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5 5' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 24 }}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                  {value}
                </span>
              )}
            />
            {data.datasets.map((dataset, idx) => (
              <Line
                key={dataset.label}
                type="monotone"
                dataKey={dataset.label}
                stroke={dataset.borderColor}
                strokeWidth={dataset.borderWidth}
                strokeDasharray={dataset.borderDash?.join(' ')}
                dot={false}
                activeDot={{ 
                  r: 8, 
                  strokeWidth: 3, 
                  fill: 'white',
                  stroke: dataset.borderColor,
                  className: 'drop-shadow-lg'
                }}
                animationDuration={600 + idx * 80}
                animationEasing="ease-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
