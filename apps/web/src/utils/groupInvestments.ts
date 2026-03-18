import type { InvestmentListItem } from '@/hooks/useInvestmentsList';

export interface InvestmentGroup {
  label: string;
  items: InvestmentListItem[];
  totalBalance: number;
}

export function groupInvestments(items: InvestmentListItem[]): InvestmentGroup[] {
  const groups = new Map<string, InvestmentListItem[]>();

  for (const item of items) {
    let key: string;
    const t = (item.investment_type || '').toUpperCase();
    if (t === 'REAL_ESTATE_FUND' || t.includes('REAL_ESTATE') && t.includes('FUND')) {
      key = 'FIIs';
    } else if (item.investment_type === 'EQUITY') {
      key = item.subtype === 'REAL_ESTATE_FUND' ? 'FIIs' : 'Ações';
    } else if (item.investment_type === 'FIXED_INCOME') {
      key = 'Renda Fixa';
    } else if (item.investment_type === 'MUTUAL_FUND') {
      key = 'Fundos';
    } else if (item.investment_type?.includes('PENSION')) {
      key = 'Previdência';
    } else if (item.investment_type === 'ETF') {
      key = 'ETFs';
    } else {
      key = 'Outros';
    }

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  return Array.from(groups.entries())
    .map(([label, groupItems]) => ({
      label,
      items: groupItems,
      totalBalance: groupItems.reduce((sum, i) => sum + (i.balance ?? 0), 0),
    }))
    .sort((a, b) => b.totalBalance - a.totalBalance);
}
