import React from 'react'
import { AssetLogo, isFixedIncomeAssetType } from '@/components/ui/AssetLogo'
import { Badge } from '@/components/ui/badge'
import type { PluggyInvestment } from '@/hooks/useBensInvestimentos'
import { simplifyFundSubtype } from '@/utils/investimentos'

function shouldShowTicker(item: PluggyInvestment): boolean {
  const ticker = item.ticker ?? item.code ?? ''
  return ['EQUITY', 'ETF'].includes(item.type ?? '') && /^[A-Z]{4}\d{1,2}$/.test(ticker)
}

function getAssetSubtitle(item: PluggyInvestment): string {
  const subtype = item.subtype ?? ''
  if (item.type === 'EQUITY') {
    if (subtype === 'STOCK') return 'Ação'
    if (subtype === 'REAL_ESTATE_FUND') return 'FII'
    if (subtype === 'BDR') return 'BDR'
  }
  if (item.type === 'FIXED_INCOME') {
    const indexador = item.rate_type ?? (item.fixed_annual_rate ? 'Pré' : 'CDI')
    const taxa = item.fixed_annual_rate ? `${item.fixed_annual_rate}% a.a.` : ''
    return [subtype, indexador, taxa].filter(Boolean).join(' · ')
  }
  if (item.type === 'MUTUAL_FUND') return simplifyFundSubtype(subtype)
  if (item.type === 'ETF') return 'ETF'
  return subtype
}

export function AssetNameCell({ item, dy12mBadge }: { item: PluggyInvestment; dy12mBadge?: number }) {
  const display = item.display_name ?? item.name ?? item.full_name ?? 'Ativo'
  const ticker = item.ticker ?? item.code ?? null
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <AssetLogo
        ticker={ticker}
        assetType={item.type ?? ''}
        logoUrl={item.logo_url ?? null}
        companyDomain={
          isFixedIncomeAssetType(item.type) ? null : item.company_domain ?? null
        }
        name={display}
        size="sm"
      />
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-medium truncate">{display}</span>
          {shouldShowTicker(item) && <span className="text-xs text-muted-foreground shrink-0">{ticker}</span>}
          {dy12mBadge != null && dy12mBadge > 0 && (
            <Badge variant="success" className="text-[10px] px-1.5 py-0 shrink-0 tabular-nums">
              DY {dy12mBadge.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
            </Badge>
          )}
          {item.ir_exempt && <span className="text-[10px] text-emerald-700 dark:text-emerald-400 shrink-0">Isento IR</span>}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{getAssetSubtitle(item)}</div>
      </div>
    </div>
  )
}

