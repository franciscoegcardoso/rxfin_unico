/**
 * Dados históricos de índices econômicos brasileiros.
 * Fonte única para todos os módulos de planejamento.
 * Substitui as cópias inline em PlanejamentoAnual.tsx e Plano30AnosTab.tsx.
 */

export type IndexType = 'ipca' | 'igpm' | 'ibovespa' | 'cdi' | 'custom';

export const indexLabels: Record<IndexType, string> = {
  ipca:     'IPCA',
  igpm:     'IGP-M',
  ibovespa: 'Ibovespa',
  cdi:      'CDI',
  custom:   'Personalizado',
};

export const historicalData: Record<number, { ipca: number; igpm: number; ibovespa: number; cdi: number }> = {
  2010: { ipca: 5.91, igpm: 11.32, ibovespa: 1.04,   cdi: 9.75  },
  2011: { ipca: 6.50, igpm: 5.10,  ibovespa: -18.11, cdi: 11.60 },
  2012: { ipca: 5.84, igpm: 7.82,  ibovespa: 7.40,   cdi: 8.40  },
  2013: { ipca: 5.91, igpm: 5.51,  ibovespa: -15.50, cdi: 8.06  },
  2014: { ipca: 6.41, igpm: 3.69,  ibovespa: -2.91,  cdi: 10.81 },
  2015: { ipca: 10.67, igpm: 10.54, ibovespa: -13.31, cdi: 13.24 },
  2016: { ipca: 6.29, igpm: 7.17,  ibovespa: 38.93,  cdi: 14.00 },
  2017: { ipca: 2.95, igpm: -0.52, ibovespa: 26.86,  cdi: 9.93  },
  2018: { ipca: 3.75, igpm: 7.55,  ibovespa: 15.03,  cdi: 6.42  },
  2019: { ipca: 4.31, igpm: 7.30,  ibovespa: 31.58,  cdi: 5.97  },
  2020: { ipca: 4.52, igpm: 23.14, ibovespa: 2.92,   cdi: 2.76  },
  2021: { ipca: 10.06, igpm: 17.78, ibovespa: -11.93, cdi: 4.42 },
  2022: { ipca: 5.79, igpm: 5.45,  ibovespa: 4.69,   cdi: 12.39 },
  2023: { ipca: 4.62, igpm: -3.18, ibovespa: 22.28,  cdi: 13.04 },
  2024: { ipca: 4.83, igpm: 6.54,  ibovespa: -10.36, cdi: 10.87 },
};

/**
 * Calcula a média de um índice nos últimos N anos.
 * @param index - Nome do índice
 * @param years - Número de anos para a média (padrão 5)
 */
export function calculateAverageIndex(
  index: 'ipca' | 'igpm' | 'ibovespa' | 'cdi',
  years: number = 5
): number {
  const availableYears = Object.keys(historicalData)
    .map(Number)
    .sort((a, b) => b - a)
    .slice(0, years);
  const sum = availableYears.reduce((acc, year) => acc + historicalData[year][index], 0);
  return sum / availableYears.length;
}
