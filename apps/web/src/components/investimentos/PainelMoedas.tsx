import React from 'react'
import type { BlocoByCurrency, FxRates } from '@/hooks/useBensInvestimentos'
import { formatCurrency } from '@/utils/investimentos'

export function PainelMoedas({ byCurrency, fxRates }: { byCurrency: BlocoByCurrency[]; fxRates?: FxRates }) {
  if (byCurrency.length <= 1) return null
  return (
    <div className="px-4 py-2.5 border-b border-border/50 flex flex-wrap gap-3">
      {byCurrency.map((item) => (
        <div key={item.currency} className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">{item.currency}</span>
          <span className="text-xs font-medium tabular-nums">{formatCurrency(item.total_brl)}</span>
          <span className="text-xs text-muted-foreground">{item.pct_carteira}%</span>
          {item.currency !== 'BRL' && fxRates && (
            <span className="text-[10px] text-muted-foreground">
              (1 {item.currency} = R$ {Number((fxRates as Record<string, number>)[`${item.currency}_BRL`] ?? 0).toFixed(2)})
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

