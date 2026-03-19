import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { differenceInDays } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

/** Item com campos fiscais para células da tabela de investimentos (RF). */
export interface InvestmentItemFiscalCells {
  ir_retido?: number | null;
  iof_retido?: number | null;
  ir_exempt?: boolean;
  ir_rate_pct?: number | null;
  due_date?: string | null;
}

export function IRRetidoCell({ item }: { item: InvestmentItemFiscalCells }) {
  if (item.ir_exempt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400 px-1.5 py-0.5 rounded">
        Isento
      </span>
    );
  }
  if (!item.ir_retido || item.ir_retido === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="text-right">
      <div className="text-xs font-medium text-foreground tabular-nums">
        {formatCurrency(item.ir_retido)}
      </div>
      {item.ir_rate_pct != null && (
        <div className="text-xs text-muted-foreground">alíq. {item.ir_rate_pct}%</div>
      )}
    </div>
  );
}

export function IOFRetidoCell({ item }: { item: InvestmentItemFiscalCells }) {
  if (!item.iof_retido || item.iof_retido === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <span className="text-xs font-medium tabular-nums">
      {formatCurrency(item.iof_retido)}
    </span>
  );
}

export function VencimentoCell({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return <span className="text-xs text-muted-foreground">—</span>;

  const date = new Date(dueDate);
  const today = new Date();
  const dias = differenceInDays(date, today);

  return (
    <div className="text-right">
      <div
        className={cn(
          'text-xs font-medium tabular-nums',
          dias <= 0
            ? 'text-red-600 dark:text-red-400'
            : dias <= 30
              ? 'text-amber-600 dark:text-amber-400'
              : dias <= 90
                ? 'text-yellow-600 dark:text-yellow-500'
                : 'text-foreground'
        )}
      >
        {format(date, 'dd/MM/yy', { locale: ptBR })}
      </div>
      <div className="text-xs text-muted-foreground">
        {dias <= 0 ? 'Vencido' : dias < 30 ? `${dias}d` : dias <= 365 ? `${Math.round(dias / 30)}m` : `${(dias / 365).toFixed(1)}a`}
      </div>
    </div>
  );
}
