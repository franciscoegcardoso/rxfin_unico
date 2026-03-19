import React from 'react'
import type { BensInvestimentosSummary } from '@/hooks/useBensInvestimentos'
import { formatCurrency } from '@/utils/investimentos'

export function PainelFiscal({ summary }: { summary: BensInvestimentosSummary }) {
  if (!summary.total_ir_retido && !summary.total_iof_retido) return null
  return (
    <div className="px-4 py-2.5 border-b border-border/50 bg-muted/10 flex items-center gap-4 flex-wrap">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Impostos retidos</span>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
        <span className="text-xs text-muted-foreground">IR:</span>
        <span className="text-xs font-semibold tabular-nums">{formatCurrency(summary.total_ir_retido ?? 0)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
        <span className="text-xs text-muted-foreground">IOF:</span>
        <span className="text-xs font-semibold tabular-nums">{formatCurrency(summary.total_iof_retido ?? 0)}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">· estimativa Pluggy</span>
    </div>
  )
}

