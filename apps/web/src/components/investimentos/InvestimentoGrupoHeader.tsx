import React from 'react'
import { BarChart2, Building2, ChevronDown, Globe, Globe2, Layers, PieChart, Shield, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/utils/investimentos'

const ICONS = {
  'Renda Fixa': TrendingUp,
  Ações: BarChart2,
  FIIs: Building2,
  Fundos: PieChart,
  ETFs: Globe,
  BDRs: Globe2,
  Previdência: Shield,
  Outros: Layers,
} as const

const COLOR_CLASS = {
  blue: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  emerald: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  amber: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
  purple: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400',
  cyan: 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400',
  rose: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400',
  pink: 'bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-400',
  gray: 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300',
}

interface Props {
  label: keyof typeof ICONS
  count: number
  totalBalance: number
  allocationPct: number
  perf12m?: number | null
  isStale?: boolean
  isOpen: boolean
  onToggle: () => void
  colorKey: keyof typeof COLOR_CLASS
}

export function InvestimentoGrupoHeader({
  label,
  count,
  totalBalance,
  allocationPct,
  perf12m,
  isStale,
  isOpen,
  onToggle,
  colorKey,
}: Props) {
  const Icon = ICONS[label]
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-3 md:px-4 py-2 bg-muted/20 border-y border-border/50 hover:bg-muted/40 transition-colors"
    >
      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', COLOR_CLASS[colorKey])}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-[11px] text-muted-foreground">{count} ativos</span>
      {isStale && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          Cota desatualizada
        </span>
      )}
      <div className="flex-1" />
      <span className="hidden sm:inline text-[11px] text-muted-foreground mr-1 tabular-nums">{allocationPct.toFixed(1)}%</span>
      {perf12m != null && (
        <span className={cn('hidden md:inline text-[11px] mr-1.5 tabular-nums', perf12m >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
          12m: {perf12m >= 0 ? '+' : ''}
          {perf12m.toFixed(2)}%
        </span>
      )}
      <span className="text-sm font-semibold tabular-nums">{formatCurrency(totalBalance)}</span>
      <ChevronDown className={cn('w-4 h-4 text-muted-foreground ml-1 transition-transform duration-200', isOpen && 'rotate-180')} />
    </button>
  )
}

