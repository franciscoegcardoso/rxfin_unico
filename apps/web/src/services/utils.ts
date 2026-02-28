// ============================================================
// Currency formatting
// ============================================================

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatCompactBRL(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1)}K`
  }
  return formatBRL(value)
}

// ============================================================
// Date helpers
// ============================================================

export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-')
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ]
  return `${months[parseInt(m) - 1]} ${year}`
}

export function formatMonthLabelFull(month: string): string {
  const [year, m] = month.split('-')
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
  return `${months[parseInt(m) - 1]} de ${year}`
}

export function getPreviousMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const date = new Date(year, m - 2, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function getNextMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const date = new Date(year, m, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// ============================================================
// Percentage helpers
// ============================================================

export function formatPercentage(value: number | null): string {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export function getVariationColor(value: number | null): string {
  if (value === null) return 'text-gray-500'
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return 'text-gray-500'
}

// ============================================================
// Fuel type labels
// ============================================================

export function getFuelLabel(fuelType: number): string {
  const labels: Record<number, string> = {
    1: 'Gasolina',
    2: 'Álcool',
    3: 'Diesel',
    4: 'Flex',
  }
  return labels[fuelType] ?? 'Outro'
}

export function getVehicleTypeLabel(type: number): string {
  const labels: Record<number, string> = {
    1: 'Carro',
    2: 'Moto',
    3: 'Caminhão',
  }
  return labels[type] ?? 'Veículo'
}

// ============================================================
// cn utility (shadcn/ui)
// ============================================================

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
