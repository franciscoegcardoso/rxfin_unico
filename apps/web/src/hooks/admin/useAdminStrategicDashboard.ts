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

export function useAdminStrategicDashboard() {
  return useQuery({
    queryKey: ['admin', 'strategic-dashboard'],
    queryFn: async (): Promise<AdminStrategicDashboardData | null> => {
      const { data, error } = await supabase.rpc('get_admin_strategic_dashboard');
      if (error) throw error;
      return (data as AdminStrategicDashboardData) ?? null;
    },
    staleTime: 60 * 1000,
  });
}
