import React from 'react'
import { differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export function VencimentoCell({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return <span className="text-xs text-muted-foreground">—</span>
  const dias = differenceInDays(new Date(dueDate), new Date())
  return (
    <div className="text-right">
      <div
        className={cn(
          'text-xs font-medium tabular-nums',
          dias <= 0 ? 'text-red-600' : dias <= 30 ? 'text-amber-600' : dias <= 90 ? 'text-yellow-600' : 'text-foreground'
        )}
      >
        {format(new Date(dueDate), 'dd/MM/yy', { locale: ptBR })}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">
        {dias <= 0 ? 'Vencido' : dias <= 30 ? `${dias}d` : dias <= 365 ? `${Math.round(dias / 30)}m` : `${(dias / 365).toFixed(1)}a`}
      </div>
    </div>
  )
}

