import React from 'react'
import type { PluggyInvestment } from '@/hooks/useBensInvestimentos'
import type { AssetFundamentalsRow } from '@/hooks/useAssetFundamentals'
import { getFundamentalsForInvestment } from '@/hooks/useAssetFundamentals'
import { AssetNameCell } from './cells/AssetNameCell'
import { FundamentalsCard } from './FundamentalsCard'
import { RentabilidadeCell } from './cells/RentabilidadeCell'
import { VencimentoCell } from './cells/VencimentoCell'
import { ValorizacaoChip } from './cells/ValorizacaoChip'
import { IRRetidoCell } from './cells/IRRetidoCell'
import { AlocacaoCell } from './cells/AlocacaoCell'
import { formatCurrency, formatDate, simplifyFundSubtype } from '@/utils/investimentos'

function valPct(item: PluggyInvestment): number | null {
  const aplicado = item.amount_original ?? 0
  const saldo = item.balance ?? 0
  if (aplicado <= 0) return null
  return ((saldo - aplicado) / aplicado) * 100
}

function valAbs(item: PluggyInvestment): number | null {
  const aplicado = item.amount_original ?? 0
  const saldo = item.balance ?? 0
  if (aplicado <= 0) return null
  return saldo - aplicado
}

export function InvestimentoTabela({
  items,
  grupoLabel,
  totalCarteira,
  colorKey,
  fundamentalsByCode = new Map<string, AssetFundamentalsRow>(),
}: {
  items: PluggyInvestment[]
  grupoLabel: string
  totalCarteira: number
  colorKey: string
  fundamentalsByCode?: Map<string, AssetFundamentalsRow>
}) {
  const isRF = grupoLabel === 'Renda Fixa'
  const isFund = grupoLabel === 'Fundos'

  return (
    <table className="w-full text-xs">
      <thead className="bg-muted/25 border-b border-border/50">
        <tr>
          <th className="text-left px-3 py-2 min-w-[220px] font-medium">{isFund ? 'Fundo' : 'Ativo'}</th>
          {isRF ? (
            <>
              <th className="text-right px-2 py-2 font-medium">Rentabilidade</th>
              <th className="text-right px-2 py-2 font-medium">Aplicado</th>
              <th className="text-right px-2 py-2 font-medium">Valor atual</th>
              <th className="text-right px-2 py-2 font-medium">Valoriz.</th>
              <th className="text-right px-2 py-2 font-medium">IR retido</th>
              <th className="text-right px-2 py-2 font-medium">IOF</th>
              <th className="text-right px-2 py-2 font-medium">Emissão</th>
              <th className="text-right px-2 py-2 font-medium">Vencimento</th>
            </>
          ) : isFund ? (
            <>
              <th className="text-right px-2 py-2 font-medium">Qtd. cotas</th>
              <th className="text-right px-2 py-2 font-medium">Cota atual</th>
              <th className="text-right px-2 py-2 font-medium">Valor total</th>
              <th className="text-right px-2 py-2 font-medium">12m %</th>
              <th className="text-right px-2 py-2 font-medium">Come-cotas</th>
              <th className="text-right px-2 py-2 font-medium">Tipo</th>
            </>
          ) : (
            <>
              <th className="text-right px-2 py-2 font-medium">Qtd. cotas</th>
              <th className="text-right px-2 py-2 font-medium">Preço médio</th>
              <th className="text-right px-2 py-2 font-medium">Preço atual</th>
              <th className="text-right px-2 py-2 font-medium">Valor total</th>
              <th className="text-right px-2 py-2 font-medium">Valoriz.</th>
              <th className="text-right px-2 py-2 font-medium">12m %</th>
              <th className="text-right px-2 py-2 font-medium">IR</th>
            </>
          )}
          <th className="text-right px-2 py-2 font-medium">Alocação</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const qty = item.quantity ?? 0
          const balance = item.balance ?? 0
          const applied = item.amount_original ?? 0
          const avg = qty > 0 && applied > 0 ? applied / qty : null
          const current = qty > 0 ? balance / qty : null
          const alloc = totalCarteira > 0 ? (balance / totalCarteira) * 100 : 0
          const fundamentals = getFundamentalsForInvestment(item, fundamentalsByCode)
          const dyBadge =
            item.subtype === 'REAL_ESTATE_FUND' &&
            fundamentals?.dy_12m != null &&
            fundamentals.dy_12m > 0
              ? fundamentals.dy_12m
              : undefined

          return (
            <tr key={item.id} className="border-b border-border/30 hover:bg-muted/15">
              <td className="px-3 py-2.5">
                <div className="space-y-2.5 min-w-0">
                  <AssetNameCell item={item} dy12mBadge={dyBadge} />
                  {fundamentals ? <FundamentalsCard fundamentals={fundamentals} /> : null}
                </div>
              </td>
              {isRF ? (
                <>
                  <td className="px-2 py-2 text-right"><RentabilidadeCell item={item} /></td>
                  <td className="px-2 py-2 text-right tabular-nums">{applied > 0 ? formatCurrency(applied) : '—'}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(balance)}</td>
                  <td className="px-2 py-2 text-right"><ValorizacaoChip pct={valPct(item)} abs={valAbs(item)} /></td>
                  <td className="px-2 py-2 text-right"><IRRetidoCell item={item} /></td>
                  <td className="px-2 py-2 text-right tabular-nums">{(item.iof_retido ?? 0) > 0 ? formatCurrency(item.iof_retido ?? 0) : '—'}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{item.issue_date ? formatDate(item.issue_date) : '—'}</td>
                  <td className="px-2 py-2 text-right"><VencimentoCell dueDate={item.due_date} /></td>
                </>
              ) : isFund ? (
                <>
                  <td className="px-2 py-2 text-right tabular-nums">{qty.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{current ? formatCurrency(current) : '—'}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(balance)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{item.last_twelve_months_rate != null ? `${item.last_twelve_months_rate >= 0 ? '+' : ''}${item.last_twelve_months_rate.toFixed(2)}%` : '—'}</td>
                  <td className="px-2 py-2 text-right">{item.ir_regime === 'fundo_cp' ? '20%' : item.ir_regime === 'fundo_lp' ? '15%' : '—'}</td>
                  <td className="px-2 py-2 text-right">{simplifyFundSubtype(item.subtype)}</td>
                </>
              ) : (
                <>
                  <td className="px-2 py-2 text-right tabular-nums">{qty.toLocaleString('pt-BR')}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{avg ? formatCurrency(avg) : '—'}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{current ? formatCurrency(current) : '—'}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(balance)}</td>
                  <td className="px-2 py-2 text-right"><ValorizacaoChip pct={valPct(item)} abs={valAbs(item)} /></td>
                  <td className="px-2 py-2 text-right tabular-nums">{item.last_twelve_months_rate != null ? `${item.last_twelve_months_rate >= 0 ? '+' : ''}${item.last_twelve_months_rate.toFixed(2)}%` : '—'}</td>
                  <td className="px-2 py-2 text-right">{item.ir_exempt ? 'Isento' : (item.ir_rate_pct != null ? `${item.ir_rate_pct}%` : '15%')}</td>
                </>
              )}
              <td className="px-2 py-2 text-right"><AlocacaoCell pct={alloc} colorKey={colorKey} /></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

