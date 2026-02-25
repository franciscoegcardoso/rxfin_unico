// EconoGraph Data Generator - Simulated historical data

import { DataPoint } from './types';

/**
 * Generates simulated historical data from Jan 1995 to current date
 * Following realistic patterns for Brazilian and global economic indicators
 */
export const generateHistoricalData = (): DataPoint[] => {
  const data: DataPoint[] = [];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // Initial values (approximate historical values)
  let currIbov = 4300;
  let currUsd = 0.84;
  let currSp = 460;
  let currNasdaq = 400;
  let currBtc = 0.0001;
  let currOuro = 380;
  let currIfix = 1000;

  for (let year = 1995; year <= currentYear; year++) {
    const maxMonth = year === currentYear ? currentMonth : 12;
    
    for (let month = 1; month <= maxMonth; month++) {
      const date = `${year}-${month.toString().padStart(2, '0')}`;
      
      // Base inflation, INCC, and interest rates vary by period
      let baseInflation = 0.5;
      let baseIncc = 0.6; // INCC typically runs slightly higher than IPCA
      let baseSelic = 0.8;
      
      if (year < 2000) {
        // Pre-stabilization period
        baseInflation = 0.8;
        baseIncc = 1.0;
        baseSelic = 2.0;
      } else if (year < 2010) {
        // Post-stabilization
        baseInflation = 0.5;
        baseIncc = 0.6;
        baseSelic = 1.1;
      } else if (year < 2016) {
        // Low interest period
        baseInflation = 0.45;
        baseIncc = 0.55;
        baseSelic = 0.7;
      } else if (year < 2021) {
        // Recovery period
        baseInflation = 0.35;
        baseIncc = 0.45;
        baseSelic = 0.5;
      } else {
        // Post-pandemic
        baseInflation = 0.5;
        baseIncc = 0.7;
        baseSelic = 1.0;
      }

      // Calculate monthly rates with some randomness
      const ipca = Math.max(0.1, baseInflation + (Math.random() - 0.5) * 0.4);
      const incc = Math.max(0.1, baseIncc + (Math.random() - 0.5) * 0.5);
      const selic = Math.max(0.2, baseSelic + (Math.random() - 0.5) * 0.3);
      const cdi = selic - 0.01;
      const selicAnual = (Math.pow(1 + selic / 100, 12) - 1) * 100;
      const poupanca = selicAnual > 8.5 ? 0.5 : selic * 0.7;

      // Market events simulation
      // 2008 Financial Crisis
      if (year === 2008 && month >= 9 && month <= 11) {
        currIbov *= 0.85;
        currSp *= 0.88;
        currNasdaq *= 0.87;
      }
      // 2020 COVID Crash (March)
      else if (year === 2020 && month === 3) {
        currIbov *= 0.70;
        currSp *= 0.80;
        currNasdaq *= 0.75;
        currBtc *= 0.60;
      }
      // 2020 Recovery (April-Dec)
      else if (year === 2020 && month > 3) {
        currIbov *= 1.08 + (Math.random() - 0.3) * 0.06;
        currSp *= 1.06 + (Math.random() - 0.3) * 0.04;
        currNasdaq *= 1.08 + (Math.random() - 0.3) * 0.06;
        currBtc *= 1.15 + (Math.random() - 0.3) * 0.15;
      }
      // 2021 Crypto Boom
      else if (year === 2021) {
        currBtc *= 1.08 + (Math.random() - 0.5) * 0.20;
        currIbov *= 1.005 + (Math.random() - 0.5) * 0.06;
        currSp *= 1.015 + (Math.random() - 0.5) * 0.04;
        currNasdaq *= 1.02 + (Math.random() - 0.5) * 0.05;
      }
      // 2022 Bear Market
      else if (year === 2022) {
        currBtc *= 0.97 + (Math.random() - 0.5) * 0.12;
        currNasdaq *= 0.98 + (Math.random() - 0.5) * 0.06;
        currSp *= 0.99 + (Math.random() - 0.5) * 0.04;
      }
      // Normal market conditions
      else {
        currIbov *= 1.008 + (Math.random() - 0.5) * 0.08;
        currSp *= 1.007 + (Math.random() - 0.5) * 0.04;
        currNasdaq *= 1.009 + (Math.random() - 0.5) * 0.06;
        if (year >= 2010) {
          currBtc *= 1.05 + (Math.random() - 0.5) * 0.25;
        }
      }

      // Other assets
      currUsd *= 1.004 + (Math.random() - 0.5) * 0.05;
      currOuro *= 1.005 + (Math.random() - 0.5) * 0.04;
      currIfix *= 1.006 + (Math.random() - 0.5) * 0.03;

      // Bitcoin only exists from 2010
      const btcValue = year >= 2010 ? parseFloat(currBtc.toFixed(2)) : 0;

      data.push({
        date,
        ipca: parseFloat(ipca.toFixed(2)),
        incc: parseFloat(incc.toFixed(2)),
        cdi: parseFloat(cdi.toFixed(2)),
        poupanca: parseFloat(poupanca.toFixed(2)),
        ibov: Math.round(currIbov),
        usd: parseFloat(currUsd.toFixed(2)),
        sp500: Math.round(currSp),
        nasdaq: Math.round(currNasdaq),
        btc: btcValue,
        ouro: Math.round(currOuro),
        ifix: Math.round(currIfix),
      });
    }
  }

  return data;
};

// Memoized data generation
let cachedData: DataPoint[] | null = null;

export const getHistoricalData = (): DataPoint[] => {
  if (!cachedData) {
    cachedData = generateHistoricalData();
  }
  return cachedData;
};
