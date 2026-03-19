import React from 'react';
import { formatCurrency } from '@/lib/utils';
import type { BensInvestimentosSummary } from '@/hooks/useBensInvestimentos';

interface Props {
  summary: BensInvestimentosSummary;
}

export function InvestimentosFiscal({ summary }: Props) {
  const total_ir_retido = summary.total_ir_retido ?? 0;
  const total_iof_retido = summary.total_iof_retido ?? 0;

  if (!total_ir_retido && !total_iof_retido) return null;

  return (
    <div className="px-4 py-3 border-b border-border bg-muted/20">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Impostos retidos (estimativa Pluggy)
      </div>
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-xs text-muted-foreground">IR retido:</span>
          <span className="text-sm font-medium text-foreground tabular-nums">
            {formatCurrency(total_ir_retido)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-400" />
          <span className="text-xs text-muted-foreground">IOF retido:</span>
          <span className="text-sm font-medium text-foreground tabular-nums">
            {formatCurrency(total_iof_retido)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground self-center">
          · valor estimado com base nos dados da corretora
        </span>
      </div>
    </div>
  );
}
