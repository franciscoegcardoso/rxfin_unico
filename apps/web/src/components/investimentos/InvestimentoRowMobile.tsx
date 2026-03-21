import React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AssetLogo, isFixedIncomeAssetType } from '@/components/ui/AssetLogo'
import { Badge } from '@/components/ui/badge'
import type { PluggyInvestment } from '@/hooks/useBensInvestimentos'
import type { AssetFundamentalsRow } from '@/hooks/useAssetFundamentals'
import { getFundamentalsForInvestment } from '@/hooks/useAssetFundamentals'
import { formatCurrency, formatDateShort } from '@/utils/investimentos'
import { InvestimentoDetalhesMobile } from './InvestimentoDetalhesMobile'

export function InvestimentoRowMobile({
  item,
  totalCarteira,
  onToggle,
  isOpen,
  fundamentalsByCode = new Map<string, AssetFundamentalsRow>(),
}: {
  item: PluggyInvestment
  totalCarteira: number
  onToggle: () => void
  isOpen: boolean
  fundamentalsByCode?: Map<string, AssetFundamentalsRow>
}) {
  const aplicado = item.amount_original ?? 0
  const balance = item.balance ?? 0
  const valorizacao = aplicado > 0 ? ((balance - aplicado) / aplicado) * 100 : (item.last_twelve_months_rate ?? null)
  const display = item.display_name ?? item.name ?? item.full_name ?? 'Ativo'
  const ticker = item.ticker ?? item.code ?? ''

  return (
    <>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border/40 hover:bg-muted/20 active:bg-muted/40 transition-colors text-left"
      >
        <AssetLogo
          ticker={ticker}
          assetType={item.type ?? ''}
          logoUrl={item.logo_url ?? null}
          companyDomain={
            isFixedIncomeAssetType(item.type) ? null : item.company_domain ?? null
          }
          name={display}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm font-medium truncate max-w-[180px]">{display}</span>
            {['EQUITY', 'ETF'].includes(item.type ?? '') && /^[A-Z]{4}\d{1,2}$/.test(ticker) && (
              <span className="text-xs text-muted-foreground shrink-0">{ticker}</span>
            )}
            {dyBadge != null && (
              <Badge variant="success" className="text-[10px] px-1.5 py-0 shrink-0 tabular-nums">
                DY {dyBadge.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {(item.quantity ?? 0).toLocaleString('pt-BR')} cotas
            {item.due_date && ` · vence ${formatDateShort(item.due_date)}`}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold tabular-nums leading-none">{formatCurrency(balance)}</div>
          <div className="text-[11px] mt-1">
            {valorizacao !== null ? (
              <span className={cn('font-medium tabular-nums', valorizacao >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                {valorizacao >= 0 ? '+' : ''}
                {valorizacao.toFixed(2)}%
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground ml-1 shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="bg-muted/10 border-b border-border/40 px-4 py-3">
          <InvestimentoDetalhesMobile
            item={item}
            totalCarteira={totalCarteira}
            fundamentalsByCode={fundamentalsByCode}
          />
        </div>
      )}
    </>
  )
}

