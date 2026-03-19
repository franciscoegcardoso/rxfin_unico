import React from 'react'

const BAR_COLORS: Record<string, string> = {
  blue: '#3B82F6',
  emerald: '#10B981',
  amber: '#F59E0B',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  rose: '#F43F5E',
  pink: '#EC4899',
  gray: '#6B7280',
}

export function AlocacaoCell({ pct, colorKey }: { pct: number; colorKey: string }) {
  return (
    <div className="flex items-center gap-1.5 justify-end">
      <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(pct * 3, 100)}%`,
            background: BAR_COLORS[colorKey] ?? '#6B7280',
          }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{pct.toFixed(1)}%</span>
    </div>
  )
}

