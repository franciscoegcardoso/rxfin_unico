/**
 * Normaliza nomes de marcas vindos da API FIPE para matching confiável.
 */
export function normalizeBrandName(name: string): string {
  if (!name) return '';

  let result = name.toUpperCase().trim();
  if (result.includes(' - ')) {
    result = result.split(' - ').slice(1).join(' - ').trim();
  }
  if (result.includes('/')) {
    result = result.split('/')[0].trim();
  }
  result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return result;
}
