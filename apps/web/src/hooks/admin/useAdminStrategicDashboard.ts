import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RoadmapPhaseTargets {
  users?: number;
  leads?: number;
  subs?: number;
  mrr?: number;
  nps?: number;
  cac?: number;
}

export interface RoadmapPhase {
  id?: string;
  name: string;
  period?: string;
  status?: 'ativa' | 'proxima' | 'completada' | 'estendida';
  progress_pct?: number;
  days_remaining?: number;
  targets?: RoadmapPhaseTargets;
  actuals?: RoadmapPhaseTargets;
}

export interface ValuationData {
  current_arr?: number;
  arr_target?: number;
  current_mrr?: number;
  mrr_target?: number;
  paying_users?: number;
  paying_target?: number;
  free_users?: number;
  free_target?: number;
  conversion_rate?: number;
  conversion_target_pct?: number;
  arpu?: number;
}

export interface AarrrAcquisition {
  total_users?: number;
  new_7d?: number;
  new_30d?: number;
  total_leads?: number;
  lead_to_signup_rate?: number;
}

export interface AarrrActivation {
  onboarding_rate?: number;
  has_lancamentos?: number;
  has_cc?: number;
  has_assets?: number;
  activation_rate?: number;
}

export interface AarrrRevenue {
  mrr?: number;
  paying_users?: number;
  free_to_paid_conversion?: number;
  mix_by_plan?: { plan: string; count: number; mrr: number }[];
}

export interface AarrrRetention {
  dau?: number;
  wau?: number;
  mau?: number;
  dau_mau_ratio?: number;
  churn_30d?: number;
  churn_rate?: number;
  at_risk?: number;
}

export interface AarrrReferral {
  total_referrals?: number;
  referral_signups?: number;
}

export interface AarrrData {
  acquisition?: AarrrAcquisition;
  activation?: AarrrActivation;
  revenue?: AarrrRevenue;
  retention?: AarrrRetention;
  referral?: AarrrReferral;
}

export interface SimulatorsData {
  page_views_7d?: number;
  page_views_total?: number;
  unique_visitors_7d?: number;
  conversions_7d?: number;
  conversions_total?: number;
  completion_rate_target?: number;
  top_simulators?: { page: string; views: number; sessions: number }[];
}

export interface CronogramaMilestone {
  label: string;
  date: string;
  target?: string;
}

export interface CronogramaData {
  milestones?: CronogramaMilestone[];
  today?: string;
}

export interface CampaignRow {
  nome?: string;
  canal?: string;
  onda?: string;
  budget?: number;
  gasto?: number;
  leads?: number;
  cpl?: number;
  conversoes?: number;
  cpa?: number;
  status?: string;
}

export interface AdminStrategicDashboardData {
  roadmap?: RoadmapPhase[];
  valuation?: ValuationData;
  aarrr?: AarrrData;
  simulators?: SimulatorsData;
  nps?: { score?: number; promoters?: number; passives?: number; detractors?: number };
  campaigns?: CampaignRow[];
  unit_economics?: { cac?: number; ltv?: number; ltv_cac_ratio?: number };
  monthly_trend?: Record<string, unknown>[];
  cronograma?: CronogramaData;
  generated_at?: string;
}

const ARR_TARGET = 1_000_000;
const MRR_TARGET = 83_333;

function emptyStrategicData(): AdminStrategicDashboardData {
  return {
    generated_at: new Date().toISOString(),
    valuation: {
      current_arr: 0,
      arr_target: ARR_TARGET,
      current_mrr: 0,
      mrr_target: MRR_TARGET,
      paying_users: 0,
      paying_target: 3333,
      free_users: 0,
      free_target: 66600,
      conversion_rate: 0,
      conversion_target_pct: 5,
    },
    roadmap: [],
    aarrr: {},
    campaigns: [],
  };
}

export function useAdminStrategicDashboard() {
  return useQuery({
    queryKey: ['admin', 'strategic-dashboard'],
    queryFn: async (): Promise<AdminStrategicDashboardData | null> => {
      try {
        const { data, error } = await supabase.rpc('get_admin_strategic_dashboard_cached', { p_force_refresh: false });
        if (error) {
          console.warn('[Estrategico] get_admin_strategic_dashboard_cached RPC failed:', error.message);
          return emptyStrategicData();
        }
        const raw = Array.isArray(data) ? data[0] : data;
        const parsed = (raw as AdminStrategicDashboardData | null) ?? null;
        return parsed ?? emptyStrategicData();
      } catch (e) {
        console.warn('[Estrategico] get_admin_strategic_dashboard_cached error:', e);
        return emptyStrategicData();
      }
    },
    staleTime: 60 * 1000,
  });
}
