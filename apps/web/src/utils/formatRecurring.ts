/**
 * Helpers para exibição de compromissos/recorrentes (Fase 2 Pluggy).
 */

export interface RecurringPayment {
  average_amount?: number;
  regularity_pct?: number;
  occurrence_count?: number;
  description?: string;
  [key: string]: unknown;
}

export function formatRegularity(pct: number): {
  label: string;
  color: 'green' | 'amber' | 'gray';
} {
  if (pct >= 90) return { label: 'Alta regularidade', color: 'green' };
  if (pct >= 70) return { label: 'Boa regularidade', color: 'amber' };
  return { label: 'Irregular', color: 'gray' };
}

export function describeRecurring(item: RecurringPayment): string {
  const count = item.occurrence_count ?? 0;
  const avg = item.average_amount ?? 0;
  const fmt = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(avg);
  return `Identificado em ${count} ${count === 1 ? 'mês' : 'meses'} · Média ${fmt}/mês`;
}
