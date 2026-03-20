import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePatrimonioOverview } from '@/hooks/usePatrimonioOverview';
import { usePassivosPage } from '@/hooks/usePassivosPage';
import { useConsolidatedExpenses } from '@/hooks/useConsolidatedExpenses';
import type { SnapshotPoint } from '@/types/investments';

const STALE_MS = 5 * 60 * 1000;

export type HealthClassification = 'excelente' | 'bom' | 'regular' | 'atenção';

export interface OverviewSummaryData {
  net_worth_liquid: number;
  total_assets: number;
  total_debt: number;
  month_expenses: number;
  month_income: number;
  month_balance: number;
  has_overdue: boolean;
  overdue_count: number;
  parcela_mensal: number;
  health_score: number | null;
  health_classification: HealthClassification | null;
  sparkline: Array<{ date: string; total_brl: number }>;
  /** Variação % entre os dois últimos pontos do histórico de investimentos (proxy). */
  net_worth_delta_pct: number | null;
  isLoading: boolean;
}

interface InvestmentsPageSnapshot {
  snapshot_history?: unknown;
}

function parseSnapshotHistory(raw: unknown): SnapshotPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      const o = p as Record<string, unknown>;
      return {
        date: String(o.date ?? ''),
        total_brl: Number(o.total_brl ?? 0),
        by_class: {},
      };
    })
    .filter((p) => p.date.length > 0);
}

function normalizeHealthClassification(raw: string | null | undefined): HealthClassification | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (s.includes('excel') || s.includes('otimo')) return 'excelente';
  if (s.includes('bom')) return 'bom';
  if (s.includes('regul') || s.includes('medi')) return 'regular';
  if (s.includes('atenc') || s.includes('alert') || s.includes('ruim')) return 'atenção';
  return null;
}

interface HealthRpcRow {
  score?: number;
  classification?: string;
}

export function useOverviewSummary(): { data: OverviewSummaryData | undefined; isLoading: boolean } {
  const { user } = useAuth();
  const userId = user?.id;
  const monthRef = format(new Date(), 'yyyy-MM');

  const { data: patrimonio, loading: patrimonioLoading } = usePatrimonioOverview();
  const { data: passivosData, isLoading: passivosLoading } = usePassivosPage(userId, 'consolidado');
  const passivosHeader = passivosData?.header;
  const { data: consolidated, loading: consolidatedLoading } = useConsolidatedExpenses(monthRef);

  const healthQuery = useQuery({
    queryKey: ['financial_health_score', userId],
    queryFn: async (): Promise<HealthRpcRow | null> => {
      const { data, error } = await supabase.rpc('get_financial_health_score');
      if (error) return null;
      if (!data || typeof data !== 'object') return null;
      return data as HealthRpcRow;
    },
    enabled: !!userId,
    staleTime: STALE_MS,
  });

  const investmentsQuery = useQuery({
    queryKey: ['investments_page_data', userId],
    queryFn: async (): Promise<SnapshotPoint[]> => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc('get_investments_page_data', { p_user_id: userId });
      if (error) return [];
      const page = data as InvestmentsPageSnapshot | null;
      return parseSnapshotHistory(page?.snapshot_history);
    },
    enabled: !!userId,
    staleTime: STALE_MS,
  });

  const base = useMemo(() => {
    const totalAssets = patrimonio?.net_worth?.total_assets ?? 0;
    const totalDebt = patrimonio?.net_worth?.total_debt ?? 0;
    const kpis = consolidated?.kpis;
    const monthIncome = kpis?.total_receitas ?? 0;
    const monthExpenses = kpis?.total_despesas ?? 0;
    const monthBalance = kpis?.saldo_real ?? monthIncome - monthExpenses;

    const rawHistory = investmentsQuery.data ?? [];
    const sparkline = rawHistory.slice(-12).map((p) => ({ date: p.date, total_brl: p.total_brl }));

    let netWorthDeltaPct: number | null = null;
    if (sparkline.length >= 2) {
      const prev = sparkline[sparkline.length - 2].total_brl;
      const last = sparkline[sparkline.length - 1].total_brl;
      if (prev !== 0 && Number.isFinite(prev) && Number.isFinite(last)) {
        netWorthDeltaPct = ((last - prev) / Math.abs(prev)) * 100;
      }
    }

    const healthRaw = healthQuery.data;
    const score =
      healthRaw != null && typeof healthRaw.score === 'number' && !Number.isNaN(healthRaw.score)
        ? Math.round(Math.min(100, Math.max(0, healthRaw.score)))
        : null;
    const health_classification = normalizeHealthClassification(healthRaw?.classification);

    return {
      net_worth_liquid: totalAssets - totalDebt,
      total_assets: totalAssets,
      total_debt: totalDebt,
      month_expenses: monthExpenses,
      month_income: monthIncome,
      month_balance: monthBalance,
      has_overdue: passivosHeader?.has_overdue ?? false,
      overdue_count: passivosHeader?.overdue_count ?? 0,
      parcela_mensal: passivosHeader?.parcela_mensal_total ?? 0,
      health_score: score,
      health_classification,
      sparkline,
      net_worth_delta_pct: netWorthDeltaPct,
    };
  }, [patrimonio, passivosHeader, consolidated, healthQuery.data, investmentsQuery.data]);

  const isLoading =
    patrimonioLoading ||
    passivosLoading ||
    consolidatedLoading ||
    (!!userId && healthQuery.isPending) ||
    (!!userId && investmentsQuery.isPending);

  const data: OverviewSummaryData = { ...base, isLoading };

  return { data, isLoading };
}
