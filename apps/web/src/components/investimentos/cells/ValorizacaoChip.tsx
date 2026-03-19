import React from 'react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/utils/investimentos'

export function ValorizacaoChip({ pct, abs }: { pct: number | null; abs?: number | null }) {
  if (pct === null) return <span className="text-xs text-muted-foreground">—</span>
  const pos = pct >= 0
  return (
    <div className="text-right">
      <span
        className={cn(
          'inline-block text-xs font-medium px-1.5 py-0.5 rounded tabular-nums',
          pos
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
            : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
        )}
      >
        {pos ? '+' : ''}
        {pct.toFixed(2)}%
      </span>
      {abs != null && (
        <div className={cn('text-[10px] mt-0.5 tabular-nums', pos ? 'text-emerald-600' : 'text-red-500')}>
          {pos ? '+' : ''}
          {formatCurrency(abs)}
        </div>
      )}
    </div>
  )
}

