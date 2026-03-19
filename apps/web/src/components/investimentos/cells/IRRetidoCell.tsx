import React from 'react'
import type { PluggyInvestment } from '@/hooks/useBensInvestimentos'
import { formatCurrency, getAliquotaRegressiva } from '@/utils/investimentos'

export function IRRetidoCell({ item }: { item: PluggyInvestment }) {
  if (item.ir_exempt) {
    return <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">Isento</span>
  }
  if (!item.ir_retido) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <div className="text-right">
      <div className="text-xs font-medium tabular-nums text-foreground">{formatCurrency(item.ir_retido)}</div>
      <div className="text-[10px] text-muted-foreground">{getAliquotaRegressiva(item.issue_date)}% alíq.</div>
    </div>
  )
}

