import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats currency with abbreviations for large numbers
 */
export function formatCompactCurrency(value: number, isHidden: boolean = false): string {
  if (isHidden) return '••••••';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}R$ ${(absValue / 1_000_000_000).toFixed(1)}Bn`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}R$ ${(absValue / 1_000_000).toFixed(1)}Mn`;
  }
  if (absValue >= 1_000) {
    return `${sign}R$ ${(absValue / 1_000).toFixed(1)}k`;
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
