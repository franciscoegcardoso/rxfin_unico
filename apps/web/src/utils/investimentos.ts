import { differenceInDays } from 'date-fns'

export const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatCurrencyCompact = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`
  return formatCurrency(v)
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

export const formatDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

export function getAliquotaRegressiva(issueDate: string | null): number | null {
  if (!issueDate) return null
  const dias = differenceInDays(new Date(), new Date(issueDate))
  if (dias <= 180) return 22.5
  if (dias <= 360) return 20.0
  if (dias <= 720) return 17.5
  return 15.0
}

export function simplifyFundSubtype(subtype: string | null | undefined): string {
  const map: Record<string, string> = {
    FIXED_INCOME_FUND: 'Renda Fixa',
    EQUITY_FUND: 'Ações (FIA)',
    MULTIMARKET_FUND: 'Multimercado',
    REAL_ESTATE_FUND: 'Imobiliário',
    INVESTMENT_FUND: 'Fundo',
  }
  if (!subtype) return 'Fundo'
  return map[subtype] ?? 'Fundo'
}
