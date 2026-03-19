import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SnapshotPoint {
  date: string;
  total_brl: number;
  by_class: Record<string, number>;
}

export interface ContribMonth {
  month: string;
  amount: number;
}

export interface AnnualRow {
  ano: number;
  aportes: number;
  ir_pago: number;
  iof_pago: number;
  cdi_pct: number;
  ipca_pct: number;
}

export interface BenchmarkSeries {
  no_mes: number;
  no_semestre: number;
  no_ano: number;
  doze_meses: number;
  desde_inicio: number;
}

export interface Benchmarks {
  cdi: BenchmarkSeries;
  ipca: BenchmarkSeries;
  ibovespa: BenchmarkSeries;
  rf_rent_pct: number;
}

export interface PerformanceSummary {
  patrimonio_atual: number;
  total_aplicado: number;
  rendimento_total: number;
  rendimento_pct: number;
  primeira_aportacao: string;
  data_referencia: string;
  snapshot_count: number;
  total_ir_retido: number;
}

export interface PortfolioPerformance {
  snapshot_history: SnapshotPoint[];
  contributions_by_month: ContribMonth[];
  annual_evolution: AnnualRow[];
  benchmarks: Benchmarks;
  summary: PerformanceSummary;
}

export function usePortfolioPerformance() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['portfolio-performance', user?.id ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_portfolio_performance');
      if (error) throw error;
      return data as PortfolioPerformance | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
