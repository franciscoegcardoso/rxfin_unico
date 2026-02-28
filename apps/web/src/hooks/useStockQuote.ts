import { useState, useCallback } from 'react';

interface StockQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
}

interface UseStockQuoteReturn {
  quote: StockQuote | null;
  isLoading: boolean;
  error: string | null;
  fetchQuote: (ticker: string) => Promise<StockQuote | null>;
  reset: () => void;
}

export const useStockQuote = (): UseStockQuoteReturn => {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async (ticker: string): Promise<StockQuote | null> => {
    if (!ticker || ticker.length < 4) {
      setError('Ticker inválido');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Using BRAPI - Brazilian Stock API (free tier)
      const response = await fetch(
        `https://brapi.dev/api/quote/${ticker.toUpperCase()}?token=demo`
      );

      if (!response.ok) {
        throw new Error('Ativo não encontrado');
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        throw new Error('Ativo não encontrado');
      }

      const result = data.results[0];
      const stockQuote: StockQuote = {
        symbol: result.symbol,
        shortName: result.shortName || result.longName || ticker,
        regularMarketPrice: result.regularMarketPrice || 0,
        regularMarketChange: result.regularMarketChange || 0,
        regularMarketChangePercent: result.regularMarketChangePercent || 0,
      };

      setQuote(stockQuote);
      return stockQuote;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar cotação';
      setError(message);
      setQuote(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setQuote(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    quote,
    isLoading,
    error,
    fetchQuote,
    reset,
  };
};
