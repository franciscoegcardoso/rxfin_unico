// EconoGraph Calculation Engine

import { DataPoint, ASSETS_CONFIG, PortfolioResults, ChartData, ChartDataset } from './types';

/**
 * Calculate cumulative returns for rate-based assets (IPCA, CDI, Poupança)
 * Uses compound interest: accumulated *= (1 + rate/100)
 */
export const calculateRateCumulative = (data: DataPoint[], assetKey: string): number[] => {
  let accumulated = 100;
  const points: number[] = [100];
  
  for (let i = 1; i < data.length; i++) {
    const rate = data[i][assetKey] as number;
    accumulated *= (1 + rate / 100);
    points.push(accumulated);
  }
  
  return points;
};

/**
 * Calculate cumulative returns for price-based assets (Ibovespa, Dólar, BTC, etc.)
 * Uses price variation: (currentPrice / initialPrice) * 100
 */
export const calculatePriceCumulative = (data: DataPoint[], assetKey: string): number[] => {
  const initialValue = data[0][assetKey] as number;
  if (initialValue === 0) return data.map(() => 100);
  
  return data.map(d => ((d[assetKey] as number) / initialValue) * 100);
};

/**
 * Calculate cumulative data for chart display
 */
export const calculateCumulativeData = (
  data: DataPoint[],
  activeIndicators: string[]
): ChartData => {
  const labels = data.map(d => d.date);
  
  const datasets = activeIndicators.map(key => {
    const config = ASSETS_CONFIG[key];
    const points = config.type === 'rate'
      ? calculateRateCumulative(data, key)
      : calculatePriceCumulative(data, key);
    
    return {
      label: config.label,
      data: points,
      borderColor: config.color,
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.2,
    };
  });
  
  return { labels, datasets };
};

/**
 * Calculate portfolio results with weighted allocation
 */
export const calculatePortfolioResults = (
  data: DataPoint[],
  weights: Record<string, number>
): PortfolioResults => {
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  
  // Normalize weights
  const normalizedWeights: Record<string, number> = {};
  const divisor = totalWeight === 0 ? 1 : totalWeight;
  Object.keys(weights).forEach(key => {
    normalizedWeights[key] = weights[key] / divisor;
  });
  
  let portfolioAccumulated = 100;
  const portfolioPoints: number[] = [100];
  const monthlyReturns: number[] = [0];
  
  for (let i = 1; i < data.length; i++) {
    let monthReturn = 0;
    
    Object.keys(normalizedWeights).forEach(key => {
      const weight = normalizedWeights[key];
      if (weight === 0) return;
      
      const config = ASSETS_CONFIG[key];
      let assetReturn: number;
      
      if (config.type === 'price') {
        const prevValue = data[i - 1][key] as number;
        const currValue = data[i][key] as number;
        assetReturn = prevValue !== 0 ? (currValue - prevValue) / prevValue : 0;
      } else {
        // Rate assets: monthly rate as decimal
        assetReturn = (data[i][key] as number) / 100;
      }
      
      monthReturn += weight * assetReturn;
    });
    
    portfolioAccumulated *= (1 + monthReturn);
    portfolioPoints.push(portfolioAccumulated);
    monthlyReturns.push(monthReturn * 100);
  }
  
  // Calculate statistics
  const validReturns = monthlyReturns.filter(r => !isNaN(r));
  const avgReturn = validReturns.reduce((a, b) => a + b, 0) / (validReturns.length || 1);
  const variance = validReturns.map(x => Math.pow(x - avgReturn, 2)).reduce((a, b) => a + b, 0) / (validReturns.length || 1);
  const volatility = Math.sqrt(variance);
  
  return {
    points: portfolioPoints,
    totalReturn: portfolioAccumulated - 100,
    volatility,
    bestMonth: Math.max(...validReturns),
    worstMonth: Math.min(...validReturns),
  };
};

/**
 * Calculate portfolio chart data with benchmarks
 */
export const calculatePortfolioChartData = (
  data: DataPoint[],
  portfolioResults: PortfolioResults,
  selectedBenchmarks: Record<string, boolean>,
  showBenchmarks: boolean
): ChartData => {
  const labels = data.map(d => d.date);
  
  const datasets: ChartDataset[] = [
    {
      label: 'Minha Carteira',
      data: portfolioResults.points,
      borderColor: '#0f172a',
      borderWidth: 4,
      pointRadius: 0,
      tension: 0.2,
    },
  ];
  
  if (showBenchmarks) {
    Object.keys(selectedBenchmarks)
      .filter(key => selectedBenchmarks[key])
      .forEach(key => {
        const config = ASSETS_CONFIG[key];
        const points = config.type === 'rate'
          ? calculateRateCumulative(data, key)
          : calculatePriceCumulative(data, key);
        
        datasets.push({
          label: config.label,
          data: points,
          borderColor: config.color + 'BB',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2,
          borderDash: [8, 5],
        });
      });
  }
  
  return { labels, datasets };
};
