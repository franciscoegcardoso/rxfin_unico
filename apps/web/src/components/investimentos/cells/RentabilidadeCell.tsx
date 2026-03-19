import React from 'react'
import type { PluggyInvestment } from '@/hooks/useBensInvestimentos'

export function RentabilidadeCell({ item }: { item: PluggyInvestment }) {
  const tipo = item.rate_type ?? (item.fixed_annual_rate ? 'Pré' : 'CDI')
  const taxa = item.fixed_annual_rate ? `${item.fixed_annual_rate}% a.a.` : 'CDI'
  const main = tipo === 'IPCA' ? `IPCA+${item.fixed_annual_rate ?? 0}%` : tipo === 'CDI' ? 'CDI' : taxa

  return (
    <div className="text-right">
      <div className="text-xs font-medium">{main}</div>
      <div className="text-xs text-muted-foreground">{item.subtype ?? '—'}</div>
    </div>
  )
}

