// EconoGraph Types

export type AssetType = 'rate' | 'price';

export interface AssetConfig {
  id: string;
  label: string;
  group: 'Nacional' | 'Global' | 'Alternativos';
  color: string;
  defaultWeight: number;
  defaultBenchmark: boolean;
  type: AssetType;
  startYear?: number; // For assets like Bitcoin that start later
}

export interface DataPoint {
  date: string;
  ipca: number;
  incc: number;
  cdi: number;
  poupanca: number;
  ibov: number;
  ifix: number;
  usd: number;
  sp500: number;
  nasdaq: number;
  btc: number;
  ouro: number;
  [key: string]: string | number;
}

export interface PortfolioResults {
  points: number[];
  totalReturn: number;
  volatility: number;
  bestMonth: number;
  worstMonth: number;
}

export interface ChartDataset {
  label: string;
  data: number[];
  borderColor: string;
  borderWidth: number;
  pointRadius: number;
  tension: number;
  borderDash?: number[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

// Asset configuration
export const ASSETS_CONFIG: Record<string, AssetConfig> = {
  ipca: { id: 'ipca', label: 'IPCA', group: 'Nacional', color: '#3b82f6', defaultWeight: 0, defaultBenchmark: true, type: 'rate' },
  incc: { id: 'incc', label: 'INCC', group: 'Nacional', color: '#06b6d4', defaultWeight: 0, defaultBenchmark: false, type: 'rate' },
  cdi: { id: 'cdi', label: 'CDI', group: 'Nacional', color: '#0ea5e9', defaultWeight: 20, defaultBenchmark: true, type: 'rate' },
  poupanca: { id: 'poupanca', label: 'Poupança', group: 'Nacional', color: '#64748b', defaultWeight: 0, defaultBenchmark: false, type: 'rate' },
  ibov: { id: 'ibov', label: 'Ibovespa', group: 'Nacional', color: '#10b981', defaultWeight: 30, defaultBenchmark: true, type: 'price' },
  ifix: { id: 'ifix', label: 'IFIX (FIIs)', group: 'Nacional', color: '#f59e0b', defaultWeight: 0, defaultBenchmark: false, type: 'price' },
  usd: { id: 'usd', label: 'Dólar', group: 'Global', color: '#a855f7', defaultWeight: 0, defaultBenchmark: false, type: 'price' },
  sp500: { id: 'sp500', label: 'S&P 500', group: 'Global', color: '#ef4444', defaultWeight: 20, defaultBenchmark: true, type: 'price' },
  nasdaq: { id: 'nasdaq', label: 'Nasdaq-100', group: 'Global', color: '#ec4899', defaultWeight: 10, defaultBenchmark: false, type: 'price' },
  btc: { id: 'btc', label: 'Bitcoin', group: 'Alternativos', color: '#f7931a', defaultWeight: 10, defaultBenchmark: true, type: 'price', startYear: 2010 },
  ouro: { id: 'ouro', label: 'Ouro', group: 'Alternativos', color: '#fbbf24', defaultWeight: 10, defaultBenchmark: false, type: 'price' },
};

export const ASSET_GROUPS = ['Nacional', 'Global', 'Alternativos'] as const;
