import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface PassivosConsolidadoData {
  totals: {
    total_passivos: number;
    total_dividas: number;
    total_financiamentos: number;
    total_consorcios: number;
    parcela_mensal_total: number;
  };
  counts: {
    dividas_total: number;
    dividas_pluggy: number;
    dividas_manuais: number;
    financiamentos: number;
    consorcios: number;
    consorcios_contemplados: number;
    consorcios_aguardando: number;
  };
  alerts: {
    has_overdue: boolean;
    overdue_count: number;
  };
  distribution: Array<{
    category: string;
    slug: string;
    value: number;
    color: string;
  }>;
  top_dividas_pluggy: Array<{
    id: string;
    product_name: string;
    type: string;
    outstanding_balance: number;
    cet_annual_pct: number;
    is_overdue: boolean;
    past_due: number;
    progress_pct: number;
    connector_name: string | null;
    connector_image_url: string | null;
    source: 'pluggy';
  }>;
  top_financiamentos: Array<{
    id: string;
    nome: string;
    instituicao: string;
    saldo_devedor: number;
    valor_parcela: number;
    taxa_mensal: number;
    progress_pct: number;
    parcelas_restantes: number;
    source: 'manual';
  }>;
  top_consorcios: Array<{
    id: string;
    nome: string;
    administradora: string;
    valor_carta: number;
    valor_parcela: number;
    contemplado: boolean;
    progress_pct: number;
    parcelas_restantes: number;
  }>;
  monthly_evolution: unknown[];
  fetched_at: string;
}

/**
 * Busca os dados consolidados da página /passivos (visão geral) via RPC.
 */
export function usePassivosConsolidado() {
  const [data, setData] = useState<PassivosConsolidadoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchConsolidado() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: result, error: rpcError } = await supabase.rpc('get_passivos_consolidado');
        if (rpcError) throw rpcError;
        if (cancelled) return;
        setData((result ?? null) as PassivosConsolidadoData | null);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchConsolidado();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading, error };
}
