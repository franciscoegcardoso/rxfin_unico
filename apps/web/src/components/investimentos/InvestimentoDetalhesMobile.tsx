import React from 'react'
import { differenceInDays } from 'date-fns'
import type { PluggyInvestment } from '@/hooks/useBensInvestimentos'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate, getAliquotaRegressiva } from '@/utils/investimentos'

function getDetalheRows(item: PluggyInvestment, totalCarteira: number) {
  const rows: { label: string; value: string; className?: string }[] = []
  const balance = item.balance ?? 0
  const quantity = item.quantity ?? 0
  const aplicado = item.amount_original ?? 0

  rows.push({ label: 'Valor total', value: formatCurrency(balance) })
  rows.push({ label: 'Alocação na carteira', value: `${totalCarteira > 0 ? ((balance / totalCarteira) * 100).toFixed(2) : '0.00'}%` })

  if (['EQUITY', 'ETF'].includes(item.type ?? '')) {
    rows.push({ label: 'Qtd. cotas', value: quantity.toLocaleString('pt-BR') })
    rows.push({ label: 'Preço atual (est.)', value: quantity > 0 ? formatCurrency(balance / quantity) : '—' })
    if (aplicado > 0) {
      const pct = ((balance - aplicado) / aplicado) * 100
      const abs = balance - aplicado
      rows.push({
        label: 'Valorização',
        value: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% (${pct >= 0 ? '+' : ''}${formatCurrency(abs)})`,
        className: pct >= 0 ? 'text-emerald-600' : 'text-red-500',
      })
    }
    if (item.last_twelve_months_rate) rows.push({ label: 'Rentabilidade 12m', value: `+${item.last_twelve_months_rate.toFixed(2)}%`, className: 'text-emerald-600' })
    if (item.ir_exempt) rows.push({ label: 'IR', value: 'Isento', className: 'text-emerald-600' })
    else if (item.ir_rate_pct) rows.push({ label: 'Alíquota IR', value: `${item.ir_rate_pct}%` })
  }

  if (item.type === 'FIXED_INCOME') {
    if (aplicado > 0) {
      const ganho = balance - aplicado
      const pct = (ganho / aplicado) * 100
      rows.push({ label: 'Aplicado', value: formatCurrency(aplicado) })
      rows.push({ label: 'Ganho acumulado', value: `${formatCurrency(ganho)} (+${pct.toFixed(2)}%)`, className: 'text-emerald-600' })
    }
    const rentDisplay =
      item.rate_type === 'CDI'
        ? 'CDI'
        : item.rate_type === 'IPCA'
          ? `IPCA+${item.fixed_annual_rate ?? 0}%`
          : item.fixed_annual_rate
            ? `${item.fixed_annual_rate}% a.a.`
            : '—'
    rows.push({ label: 'Rentabilidade', value: rentDisplay })
    if (item.issue_date) rows.push({ label: 'Emissão', value: formatDate(item.issue_date) })
    if (item.due_date) {
      const dias = differenceInDays(new Date(item.due_date), new Date())
      rows.push({
        label: 'Vencimento',
        value: `${formatDate(item.due_date)}${dias <= 30 ? ` (${dias <= 0 ? 'vencido' : `${dias}d`})` : ''}`,
        className: dias <= 30 ? 'text-amber-600' : undefined,
      })
    }
    if (item.ir_exempt) rows.push({ label: 'IR', value: 'Isento (LCA/LCI)', className: 'text-emerald-600' })
    else if ((item.ir_retido ?? 0) > 0) {
      rows.push({ label: 'IR retido', value: formatCurrency(item.ir_retido ?? 0) })
      const aliquota = getAliquotaRegressiva(item.issue_date)
      if (aliquota) rows.push({ label: 'Alíquota atual', value: `${aliquota}%` })
    }
  }

  return rows
}

export function InvestimentoDetalhesMobile({ item, totalCarteira }: { item: PluggyInvestment; totalCarteira: number }) {
  const rows = getDetalheRows(item, totalCarteira)
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Detalhes</p>
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between py-1.5 border-b border-border/20 last:border-0">
          <span className="text-xs text-muted-foreground">{row.label}</span>
          <span className={cn('text-xs font-medium', row.className)}>{row.value}</span>
        </div>
      ))}
    </div>
  )
}

