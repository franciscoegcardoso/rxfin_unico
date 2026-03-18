import type { InvestmentListItem } from '@/hooks/useInvestmentsList';

function simplifyFundSubtype(subtype: string | null): string | null {
  if (!subtype) return 'Fundo';
  const map: Record<string, string> = {
    FIXED_INCOME_FUND: 'RF',
    EQUITY_FUND: 'FIA',
    MULTIMARKET_FUND: 'Multimercado',
    REAL_ESTATE_FUND: 'FII',
  };
  return map[subtype] ?? 'Fundo';
}

export function getInvestmentLabel(item: InvestmentListItem): {
  primaryName: string;
  badge: string | null;
} {
  const isEquity = item.investment_type === 'EQUITY';
  const isFixedIncome = item.investment_type === 'FIXED_INCOME';
  const isMutualFund = item.investment_type === 'MUTUAL_FUND';
  const isETF = item.investment_type === 'ETF';

  const primaryName = item.display_name;

  let badge: string | null = null;

  if (isEquity || isETF) {
    badge = item.ticker;
  } else if (isFixedIncome) {
    badge = item.subtype;
  } else if (isMutualFund) {
    badge = simplifyFundSubtype(item.subtype);
  } else {
    badge = item.subtype;
  }

  return { primaryName, badge };
}

/** Enriquece linha da lista “Meus Investimentos” com dados da RPC quando o id bate. */
export function enrichPatrimonioInvestRow(
  row: { id?: string; name?: string; ticker?: string; _source?: string },
  rpcById: Map<string, InvestmentListItem>
): {
  displayName: string;
  tickerColumn: string;
  detailLine?: string;
  logoUrl: string | null;
  typeForLogo: string;
  tickerForAvatar: string | null;
} {
  const rpc = row.id ? rpcById.get(row.id) : undefined;
  if (rpc) {
    const { primaryName, badge } = getInvestmentLabel(rpc);
    const isEq = rpc.investment_type === 'EQUITY' || rpc.investment_type === 'ETF';
    return {
      displayName: primaryName,
      tickerColumn: isEq ? (rpc.ticker ?? '—') : (badge ?? rpc.subtype ?? '—'),
      detailLine: badge ?? undefined,
      logoUrl: rpc.logo_url,
      typeForLogo: rpc.investment_type,
      tickerForAvatar: rpc.ticker,
    };
  }
  return {
    displayName: row.name ?? '—',
    tickerColumn: row.ticker ?? '—',
    logoUrl: null,
    typeForLogo: 'OTHER',
    tickerForAvatar: row.ticker ?? null,
  };
}
