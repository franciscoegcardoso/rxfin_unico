/**
 * Premium Chart Theme - RXFin Design System
 * Centralized chart configuration for consistent, professional visuals.
 * 
 * Usage:
 *   import { premiumGrid, premiumXAxis, premiumYAxis, premiumTooltipStyle } from '@/components/charts/premiumChartTheme';
 *   <CartesianGrid {...premiumGrid} />
 *   <XAxis {...premiumXAxis} />
 *   <YAxis {...premiumYAxis} tickFormatter={...} />
 *   <Tooltip contentStyle={premiumTooltipStyle} />
 */

// -- CartesianGrid: no vertical lines, horizontal at 5% opacity --
export const premiumGrid = {
  strokeDasharray: '3 3',
  vertical: false,
  stroke: 'hsl(var(--muted-foreground))',
  strokeOpacity: 0.08,
} as const;

// -- Axis base: crisp text, fontWeight 500 for legibility, min 12px --
const axisTickStyle = {
  fontSize: 12,
  fontWeight: 500,
  fill: 'hsl(var(--chart-axis))',
  fontFamily: 'Inter, system-ui, sans-serif',
};

export const premiumXAxis = {
  tickLine: false,
  axisLine: false,
  tick: axisTickStyle,
} as const;

export const premiumYAxis = {
  tickLine: false,
  axisLine: false,
  tick: axisTickStyle,
  width: 55,
} as const;

// -- Tooltip contentStyle --
export const premiumTooltipStyle: React.CSSProperties = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 4px 10px -5px rgba(0,0,0,0.08)',
  padding: '12px',
  fontSize: '12px',
  fontFamily: 'Inter, system-ui, sans-serif',
  backdropFilter: 'blur(8px)',
};

// -- Semantic chart colors --
export const chartColors = {
  primary: 'hsl(var(--primary))',
  income: 'hsl(var(--income))',
  expense: 'hsl(var(--expense))',
  indigo: 'hsl(230, 60%, 56%)',
  emerald: 'hsl(152, 60%, 48%)',
  rose: 'hsl(350, 65%, 55%)',
  amber: 'hsl(38, 92%, 50%)',
  blue: 'hsl(217, 70%, 55%)',
  muted: 'hsl(var(--muted-foreground))',
  chart1: 'hsl(var(--chart-1))',
  chart2: 'hsl(var(--chart-2))',
  chart3: 'hsl(var(--chart-3))',
  chart4: 'hsl(var(--chart-4))',
  chart5: 'hsl(var(--chart-5))',
} as const;

/**
 * Reusable palette for treemaps, pie charts, and categorical data.
 * 16 distinct, accessible colors with good contrast.
 */
export const CHART_PALETTE = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(262, 83%, 58%)',
  'hsl(199, 89%, 48%)',
  'hsl(339, 82%, 51%)',
  'hsl(173, 80%, 40%)',
  'hsl(31, 90%, 55%)',
  'hsl(145, 63%, 42%)',
  'hsl(47, 96%, 53%)',
  'hsl(15, 85%, 55%)',
  'hsl(280, 65%, 60%)',
  'hsl(210, 70%, 50%)',
  'hsl(100, 55%, 45%)',
] as const;

export const CHART_OTHERS_COLOR = 'hsl(var(--muted-foreground))';

// -- Standard gradient stops for Area charts --
export const makeGradientStops = (color: string, topOpacity = 0.2, bottomOpacity = 0) => ({
  top: { stopColor: color, stopOpacity: topOpacity },
  bottom: { stopColor: color, stopOpacity: bottomOpacity },
});

// -- Line chart defaults --
export const premiumLineDefaults = {
  type: 'monotone' as const,
  strokeWidth: 3,
  dot: false,
  activeDot: { r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' },
};

// -- Area chart defaults --
export const premiumAreaDefaults = {
  type: 'monotone' as const,
  strokeWidth: 3,
  fillOpacity: 1,
};

// -- Brazilian currency formatter --
export const formatBRL = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatBRLCompact = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return formatBRL(value);
};
