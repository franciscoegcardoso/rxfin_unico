import type { PluggyInvestment } from '@/hooks/useBensInvestimentos'

export type InvestmentGroupKey =
  | 'Renda Fixa'
  | 'Ações'
  | 'FIIs'
  | 'Fundos'
  | 'ETFs'
  | 'BDRs'
  | 'Previdência'
  | 'Outros'

export interface InvestmentGroupView {
  label: InvestmentGroupKey
  items: PluggyInvestment[]
  totalBalance: number
  perf12m: number | null
  isStale: boolean
  colorKey: 'blue' | 'emerald' | 'amber' | 'purple' | 'cyan' | 'rose' | 'pink' | 'gray'
}
