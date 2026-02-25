/**
 * Utilidades de cálculos financeiros para simuladores de renegociação.
 */

/**
 * Calcula o valor da parcela pelo sistema Price (parcelas fixas).
 */
export function calcPriceParcela(principal: number, taxaMensal: number, prazo: number): number {
  if (taxaMensal === 0) return principal / prazo;
  const i = taxaMensal / 100;
  return principal * (i * Math.pow(1 + i, prazo)) / (Math.pow(1 + i, prazo) - 1);
}

/**
 * Calcula o custo total de um financiamento Price.
 */
export function calcCustoTotal(parcela: number, prazo: number): number {
  return parcela * prazo;
}

/**
 * Calcula o valor presente de uma série de parcelas futuras.
 */
export function calcValorPresente(parcela: number, taxaMensal: number, prazoRestante: number): number {
  if (taxaMensal === 0) return parcela * prazoRestante;
  const i = taxaMensal / 100;
  return parcela * (1 - Math.pow(1 + i, -prazoRestante)) / i;
}

/**
 * Calcula quanto será pago no total das parcelas restantes.
 */
export function calcTotalRestante(parcela: number, prazoRestante: number): number {
  return parcela * prazoRestante;
}

/**
 * Formata valor em BRL.
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata percentual.
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}
