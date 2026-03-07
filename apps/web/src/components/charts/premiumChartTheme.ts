// ─── RXFin Premium Chart Theme v2 ───────────────────────────────────────────
// Alinhado com Design System Fase 0 — tokens CSS via hsl(var(--color-*))

export const chartColors = {
  income:  'hsl(var(--color-income))',          // verde entradas
  expense: 'hsl(var(--color-expense))',          // vermelho saídas
  brand:   'hsl(var(--color-brand-500))',        // verde RXFin primário
  brand2:  'hsl(var(--color-brand-300))',        // verde RXFin secundário
  warning: 'hsl(var(--color-warning))',          // âmbar
  info:    'hsl(var(--color-info))',             // azul
  muted:   'hsl(var(--color-text-tertiary))',    // cinza texto
  // Paleta sequencial para múltiplas séries
  series: [
    'hsl(var(--color-brand-500))',
    'hsl(var(--color-expense))',
    'hsl(var(--color-warning))',
    'hsl(var(--color-info))',
    'hsl(var(--color-brand-300))',
    'hsl(161 50% 60%)',
    'hsl(38 80% 65%)',
  ],
};

export const premiumGrid = {
  strokeDasharray: '3 3',
  stroke: 'hsl(var(--color-border-default))',
  strokeOpacity: 0.6,
  vertical: false,
} as const;

export const premiumXAxis = {
  tick: {
    fontSize: 11,
    fontFamily: 'Inter, sans-serif',
    fill: 'hsl(var(--color-text-tertiary))',
  },
  axisLine:  { stroke: 'hsl(var(--color-border-default))' },
  tickLine:  false,
} as const;

export const premiumYAxis = {
  tick: {
    fontSize: 11,
    fontFamily: 'Inter, sans-serif',
    fill: 'hsl(var(--color-text-tertiary))',
  },
  axisLine:  false,
  tickLine:  false,
  width: 72,
} as const;

export const premiumTooltipStyle = {
  contentStyle: {
    background:    'hsl(var(--color-surface-raised))',
    border:        '1px solid hsl(var(--color-border-default))',
    borderRadius:  '8px',
    boxShadow:     'var(--shadow-lg)',
    fontSize:      '12px',
    fontFamily:    'Inter, sans-serif',
    color:         'hsl(var(--color-text-primary))',
    padding:       '10px 14px',
  },
  labelStyle: {
    fontWeight: 600,
    color: 'hsl(var(--color-text-primary))',
    marginBottom: '4px',
  },
  itemStyle: {
    color: 'hsl(var(--color-text-secondary))',
  },
  cursor: {
    stroke: 'hsl(var(--color-border-strong))',
    strokeWidth: 1,
    strokeDasharray: '4 4',
  },
} as const;

export function formatBRLCompact(value: number): string {
  if (value >= 1_000_000) return `R$\u00A0${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `R$\u00A0${(value / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

// ─── Backward compatibility (same interface as before) ─────────────────────
export const formatBRL = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const CHART_PALETTE = [
  chartColors.series[0],
  chartColors.series[1],
  chartColors.series[2],
  chartColors.series[3],
  chartColors.series[4],
  chartColors.series[5],
  chartColors.series[6],
  'hsl(262, 83%, 58%)',
  'hsl(199, 89%, 48%)',
  'hsl(339, 82%, 51%)',
  'hsl(173, 80%, 40%)',
  'hsl(31, 90%, 55%)',
  'hsl(145, 63%, 42%)',
  'hsl(47, 96%, 53%)',
  'hsl(15, 85%, 55%)',
  'hsl(280, 65%, 60%)',
] as const;

export const CHART_OTHERS_COLOR = chartColors.muted;

export const makeGradientStops = (color: string, topOpacity = 0.2, bottomOpacity = 0) => ({
  top: { stopColor: color, stopOpacity: topOpacity },
  bottom: { stopColor: color, stopOpacity: bottomOpacity },
});

export const premiumLineDefaults = {
  type: 'monotone' as const,
  strokeWidth: 3,
  dot: false,
  activeDot: { r: 5, strokeWidth: 2, stroke: 'hsl(var(--color-surface-base))' },
};

export const premiumAreaDefaults = {
  type: 'monotone' as const,
  strokeWidth: 3,
  fillOpacity: 1,
};
