/**
 * Normaliza nomes de marcas para matching com marcas.json (ex: "GM - Chevrolet" → "CHEVROLET").
 */
export function normalizeBrandName(name: string): string {
  if (!name) return '';
  let result = name.toUpperCase().trim();
  if (result.includes(' - ')) result = result.split(' - ').slice(1).join(' - ').trim();
  if (result.includes('/')) result = result.split('/')[0].trim();
  return result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export const APP_LOGOS_BASE = 'https://app.rxfin.com.br';
