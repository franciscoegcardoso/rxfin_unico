/**
 * Regras fiscais por tipo de ativo (IR/IOF) e cores por bloco de indexador.
 */

export interface RegimeFiscal {
  descricao: string;
  aliquota: string;
  observacao?: string;
}

/** Item mínimo para inferir regime fiscal (type, subtype). */
export interface InvestmentItemFiscal {
  type?: string | null;
  subtype?: string | null;
}

export function getRegimeFiscal(item: InvestmentItemFiscal): RegimeFiscal {
  const type = item.type ?? '';
  const subtype = (item.subtype ?? '').toUpperCase();

  // LCA/LCI/CRI/CRA — isentos pessoa física
  if (['LCA', 'LCI', 'CRI', 'CRA'].includes(subtype)) {
    return { descricao: 'Isento de IR', aliquota: '0%', observacao: 'Pessoa física' };
  }

  // FIIs — rendimentos isentos, ganho de capital 20%
  if (type === 'EQUITY' && subtype === 'REAL_ESTATE_FUND') {
    return { descricao: 'Rendimentos isentos', aliquota: '20% no ganho de capital' };
  }

  // Ações — 15% swing trade, 20% day trade, isenção vendas < R$20k/mês
  if (type === 'EQUITY' && (subtype === 'STOCK' || subtype === 'BDR')) {
    return {
      descricao: 'Swing trade',
      aliquota: '15%',
      observacao: 'Isento se vendas < R$ 20.000/mês',
    };
  }

  // ETF — 15%
  if (type === 'ETF') {
    return { descricao: 'ETF', aliquota: '15%' };
  }

  // Renda Fixa — tabela regressiva 22,5% → 15%
  if (type === 'FIXED_INCOME') {
    return {
      descricao: 'Tabela regressiva',
      aliquota: '22,5% (até 6m) → 15% (acima 24m)',
      observacao: 'Retido na fonte',
    };
  }

  // Fundos — "come-cotas" maio/novembro + resgate
  if (type === 'MUTUAL_FUND') {
    return {
      descricao: 'Come-cotas semestral',
      aliquota: '15% (LP) ou 20% (CP)',
    };
  }

  return { descricao: 'Consulte seu assessor', aliquota: '—' };
}

const BLOCOS_BAR_COLORS: Record<string, string> = {
  pre_fixado: 'bg-blue-500',
  pos_fixado: 'bg-green-500',
  inflacao: 'bg-orange-400',
  renda_variavel: 'bg-purple-500',
  fii: 'bg-amber-500',
  fundo: 'bg-indigo-500',
  etf: 'bg-cyan-500',
  previdencia: 'bg-pink-500',
  cripto: 'bg-yellow-500',
  internacional: 'bg-teal-500',
  outros: 'bg-gray-400',
};

export function getBlocoBarColor(bloco: string): string {
  return BLOCOS_BAR_COLORS[bloco] ?? 'bg-gray-400';
}

/** Blocos de renda fixa para agregar % (pré + pós + inflação). */
export const BLOCOS_RENDA_FIXA = ['pre_fixado', 'pos_fixado', 'inflacao'];

/** Blocos de renda variável para agregar %. */
export const BLOCOS_RENDA_VARIAVEL = ['renda_variavel', 'fii', 'etf', 'fundo', 'previdencia', 'cripto', 'internacional'];
