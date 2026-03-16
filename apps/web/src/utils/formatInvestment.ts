/**
 * Mapeamento de tipos Pluggy para rótulos em PT-BR (Bens & Investimentos).
 */
export const PLUGGY_TYPE_TO_LABEL: Record<string, string> = {
  FIXED_INCOME: 'Renda Fixa',
  EQUITY: 'Ações',
  FUND: 'Fundos',
  PENSION: 'Previdência',
  TREASURE: 'Tesouro Direto',
  ETF: 'ETF',
  OTHER: 'Outros',
  BOND: 'Renda Fixa',
  SECURITY: 'Renda Fixa',
  STOCK: 'Ações',
  MUTUAL_FUND: 'Fundos',
  REAL_ESTATE_FUND: 'FIIs',
  CRYPTOCURRENCY: 'Outros',
  COE: 'Outros',
  LOAN: 'Outros',
};

export function formatPluggyType(type: string | null | undefined): string {
  if (!type) return 'Outros';
  return PLUGGY_TYPE_TO_LABEL[type] ?? 'Outros';
}
