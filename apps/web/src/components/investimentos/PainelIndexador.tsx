import React from 'react'
import { cn } from '@/lib/utils'
import type { BlocoByIndexador } from '@/hooks/useBensInvestimentos'
import { formatCurrencyCompact } from '@/utils/investimentos'

const BLOCO_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pre_fixado: { label: 'Pré-fixado', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950' },
  pos_fixado: { label: 'Pós-fixado', color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950' },
  inflacao: { label: 'Inflação', color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-950' },
  renda_variavel: { label: 'Renda Var.', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950' },
  fii: { label: 'FIIs', color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950' },
  fundo: { label: 'Fundos', color: 'text-violet-700 dark:text-violet-400', bgColor: 'bg-violet-50 dark:bg-violet-950' },
  etf: { label: 'ETFs', color: 'text-cyan-700 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-950' },
  previdencia: { label: 'Previdência', color: 'text-pink-700 dark:text-pink-400', bgColor: 'bg-pink-50 dark:bg-pink-950' },
  outros: { label: 'Outros', color: 'text-gray-600 dark:text-gray-300', bgColor: 'bg-gray-50 dark:bg-gray-900' },
}

const BLOCO_BAR_COLOR: Record<string, string> = {
  pre_fixado: '#3B82F6',
  pos_fixado: '#10B981',
  inflacao: '#F97316',
  renda_variavel: '#8B5CF6',
  fii: '#F59E0B',
  fundo: '#7C3AED',
  etf: '#06B6D4',
  previdencia: '#EC4899',
  outros: '#6B7280',
}

export function PainelIndexador({ byIndexador }: { byIndexador: BlocoByIndexador[] }) {
  return (
    <div className="px-4 py-3 border-b border-border/50">
      <div className="flex h-1.5 rounded-full overflow-hidden gap-px mb-3">
        {byIndexador.map((b) => (
          <div key={b.bloco} style={{ width: `${b.pct_carteira}%`, background: BLOCO_BAR_COLOR[b.bloco] ?? '#6B7280' }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {byIndexador.map((b) => {
          const cfg = BLOCO_CONFIG[b.bloco]
          if (!cfg) return null
          return (
            <div key={b.bloco} className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs', cfg.bgColor, cfg.color)}>
              <span className="font-medium">{cfg.label}</span>
              <span className="opacity-70">{b.pct_carteira}%</span>
              <span className="opacity-50">·</span>
              <span className="font-semibold tabular-nums">{formatCurrencyCompact(b.total)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

