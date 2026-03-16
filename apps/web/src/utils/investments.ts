/**
 * Formata a rentabilidade de um investimento para exibição.
 * Retorna string legível ou null se nenhum dado disponível.
 */
export function formatInvestmentYield(inv: {
  rate?: number | null;
  rate_type?: string | null;
  fixed_annual_rate?: number | null;
  annual_rate?: number | null;
}): string | null {
  const rate = inv.rate ?? null;
  const rateType = inv.rate_type ?? null;
  const fixedAnnual = inv.fixed_annual_rate ?? null;
  const annualRate = inv.annual_rate ?? null;

  const hasFixed = fixedAnnual != null && Number(fixedAnnual) > 0;
  const hasRate = rate != null && rateType;
  const hasAnnualOnly = annualRate != null && Number(annualRate) !== 0 && !hasFixed && !hasRate;

  if (hasRate && hasFixed) {
    return `${rate}% ${rateType} + ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(fixedAnnual))}% a.a.`;
  }
  if (hasRate) {
    return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(rate))}% ${rateType}`;
  }
  if (hasFixed) {
    return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(fixedAnnual))}% a.a.`;
  }
  if (hasAnnualOnly) {
    return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(annualRate))}% a.a.`;
  }
  return null;
}

export type InvestmentStatusBadgeVariant = 'success' | 'warning' | 'neutral';

/**
 * Retorna o badge de status com label PT-BR e variante de cor.
 * status === null é tratado como ACTIVE (conectores que não retornam status).
 * Retorna null se ACTIVE para não exibir badge (evitar ruído).
 */
export function getInvestmentStatusBadge(status: string | null): {
  label: string;
  variant: InvestmentStatusBadgeVariant;
} | null {
  const s = status?.toUpperCase() ?? 'ACTIVE';
  if (s === 'ACTIVE') return null;
  if (s === 'PENDING') return { label: 'Pendente', variant: 'warning' };
  if (s === 'TOTAL_WITHDRAWAL') return { label: 'Encerrado', variant: 'neutral' };
  return { label: status ?? 'Ativo', variant: 'neutral' };
}

/**
 * Calcula dias até o vencimento e retorna urgência.
 */
export function getDueDateUrgency(dueDate: string | null): {
  label: string;
  variant: 'danger' | 'warning';
} | null {
  if (!dueDate) return null;
  const due = new Date(dueDate + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { label: 'Vencido', variant: 'danger' };
  if (days <= 30) return { label: `Vence em ${days}d`, variant: 'warning' };
  return null;
}
