import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

interface MiniSparklineProps {
  data: { month: string; value: number }[];
  color?: string;
  isInverted?: boolean; // For expenses: downward trend is good
  height?: number;
  showTooltip?: boolean;
  formatValue?: (value: number) => string;
  label?: string;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  color = 'hsl(var(--primary))',
  isInverted = false,
  height = 24,
  showTooltip = true,
  formatValue,
  label = 'Últimos 3 meses',
}) => {
  if (data.length < 2) return null;

  // Determine trend direction
  const firstValue = data[0]?.value || 0;
  const lastValue = data[data.length - 1]?.value || 0;
  const isUpward = lastValue > firstValue;
  
  // For expenses, downward is good; for income, upward is good
  const trendColor = isInverted 
    ? (isUpward ? 'hsl(var(--expense))' : 'hsl(var(--income))')
    : (isUpward ? 'hsl(var(--income))' : 'hsl(var(--expense))');

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length && showTooltip) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md border">
          <span className="font-medium">{data.month}: </span>
          <span>{formatValue ? formatValue(data.value) : data.value.toLocaleString('pt-BR')}</span>
        </div>
      );
    }
    return null;
  };

  // Custom dot to show markers on each point
  const renderDot = (props: any) => {
    const { cx, cy, index } = props;
    return (
      <circle
        key={index}
        cx={cx}
        cy={cy}
        r={3}
        fill={trendColor}
        stroke="hsl(var(--background))"
        strokeWidth={1}
      />
    );
  };

  return (
    <div className="space-y-0.5">
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            {showTooltip && (
              <Tooltip 
                content={<CustomTooltip />}
                cursor={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={trendColor}
              strokeWidth={2.5}
              dot={renderDot}
              activeDot={{ r: 4, fill: trendColor, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {label && (
        <div className="text-[10px] text-muted-foreground text-center">{label}</div>
      )}
    </div>
  );
};
