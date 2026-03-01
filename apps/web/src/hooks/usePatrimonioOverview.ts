import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/** Response shape from get_patrimonio_overview RPC */
export interface PatrimonioOverviewData {
  assets?: Array<{
    name: string;
    type: string;
    current_value: number;
    purchase_value?: number;
    monthly_cost?: number;
  }>;
  assets_total?: number;
  vehicles?: Array<{
    brand: string;
    model: string;
    year: number;
    fipe_value?: number;
    display_name?: string;
  }>;
  financiamentos?: Array<{
    nome: string;
    valor_parcela: number;
    saldo_devedor: number;
    progress_pct?: number;
  }>;
  consorcios?: Array<{
    nome: string;
    valor_carta: number;
    contemplado: boolean;
    administradora?: string;
  }>;
  seguros?: Array<{
    nome: string;
    tipo: string;
    seguradora: string;
    data_fim: string;
    is_active: boolean;
  }>;
  goals?: Array<{ name: string; target: number; current: number; pct: number }>;
  net_worth?: {
    total_assets: number;
    total_vehicles: number;
    total_debt: number;
    total_goals_saved: number;
  };
}

export function usePatrimonioOverview() {
  const [data, setData] = useState<PatrimonioOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: rpcError } = await supabase.rpc('get_patrimonio_overview', {});
      if (rpcError) {
        setError(rpcError.message);
        setData(null);
        return null;
      }
      setData((result as PatrimonioOverviewData) ?? null);
      return result as PatrimonioOverviewData;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
