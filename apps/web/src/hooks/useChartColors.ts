/**
 * useChartColors — resolve CSS custom properties para valores computados
 *
 * PROBLEMA: Recharts serializa cores como atributos SVG nativos:
 *   <rect fill="hsl(var(--color-income))">
 * CSS custom properties NÃO resolvem em atributos SVG — só em style="".
 * Resultado: barras com fill inválido → invisíveis no browser.
 *
 * SOLUÇÃO: getComputedStyle lê o token já resolvido pelo browser e
 * retorna o valor hsl computado que funciona em qualquer contexto SVG.
 *
 * LIMITAÇÃO v1: cores computadas no mount. Se o usuário trocar o tema
 * sem recarregar, o gráfico mantém as cores do tema anterior.
 * Aceitável para v1 — documentado como known limitation.
 */
import { useMemo } from 'react'

function resolveToken(token: string): string {
  if (typeof window === 'undefined') {
    // SSR / test fallback
    const fallbacks: Record<string, string> = {
      '--color-income':          'hsl(142 71% 40%)',
      '--color-expense':         'hsl(0 65% 40%)',
      '--color-brand-600':       'hsl(161 72% 30%)',
      '--color-border-subtle':   'hsl(210 16% 93%)',
      '--color-surface-overlay': 'hsl(0 0% 100%)',
      '--color-border-default':  'hsl(210 14% 89%)',
      '--color-text-primary':    'hsl(220 26% 14%)',
      '--color-text-secondary':  'hsl(218 14% 42%)',
    }
    return fallbacks[token] ?? '#888'
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim()
  if (!raw) return '#888'
  // Tokens DS v2 têm formato "142 71% 40%" (sem hsl()) → envolver
  return raw.includes('%') || /^\d/.test(raw) ? `hsl(${raw})` : raw
}

export interface ChartColors {
  /** Receitas — verde brand, resolvido do token --color-income */
  income: string
  /** Despesas — vermelho enterprise, resolvido do token --color-expense */
  expense: string
  /** Primary brand */
  brand: string
  /** Grid lines e eixos */
  neutral: string
  /** Fundo do tooltip */
  overlay: string
  /** Borda do tooltip */
  border: string
  /** Labels dos eixos */
  textPrimary: string
  /** Texto da legenda */
  textSecondary: string
}

/**
 * Retorna um objeto de cores já computadas (hex/hsl calculado),
 * seguras para uso como atributos SVG (fill, stroke) no Recharts.
 * Deve ser chamado dentro de um componente React.
 */
export function useChartColors(): ChartColors {
  return useMemo((): ChartColors => ({
    income:        resolveToken('--color-income'),
    expense:       resolveToken('--color-expense'),
    brand:         resolveToken('--color-brand-600'),
    neutral:       resolveToken('--color-border-subtle'),
    overlay:       resolveToken('--color-surface-overlay'),
    border:        resolveToken('--color-border-default'),
    textPrimary:   resolveToken('--color-text-primary'),
    textSecondary: resolveToken('--color-text-secondary'),
  }), [])
}
