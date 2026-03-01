import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface FinancialReportData {
  periodo?: { inicio: string; fim: string };
  gerado_em?: string;
  totais?: {
    receitas: number;
    despesas: number;
    saldo: number;
    total_lancamentos: number;
    media_mensal_despesas: number;
  };
  mensal?: Array<{
    mes: string;
    receitas: number;
    despesas: number;
    saldo: number;
    pagos?: number;
    total_lancamentos?: number;
  }>;
  categorias_despesa?: Array<{
    categoria: string;
    total: number;
    count?: number;
    percentual?: number;
  }>;
}

export function useFinancialReport(startMonth: string, endMonth: string) {
  const [data, setData] = useState<FinancialReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: rpcError } = await supabase.rpc('get_financial_report', {
        p_start_month: startMonth,
        p_end_month: endMonth,
      });
      if (rpcError) {
        setError(rpcError.message);
        setData(null);
        return null;
      }
      setData((result as FinancialReportData) ?? null);
      return result as FinancialReportData;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [startMonth, endMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
