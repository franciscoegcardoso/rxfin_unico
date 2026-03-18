import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  AllocationDashboard,
  OnboardingPersona,
  AssetClass,
  AllocationPolicy,
  PortfolioSnapshot,
} from '@/types/allocation';

export const PERSONA_DEFAULTS: Record<OnboardingPersona, Record<AssetClass, number>> = {
  acumulador: { renda_fixa: 40, acoes: 35, fii: 20, internacional: 5, cripto: 0, alternativo: 0 },
  engenheiro: { renda_fixa: 25, acoes: 45, fii: 15, internacional: 15, cripto: 0, alternativo: 0 },
  fii_dependente: { renda_fixa: 10, acoes: 15, fii: 70, internacional: 5, cripto: 0, alternativo: 0 },
  iniciante: { renda_fixa: 50, acoes: 30, fii: 20, internacional: 0, cripto: 0, alternativo: 0 },
};

export const PERSONA_RISK: Record<OnboardingPersona, string> = {
  acumulador: 'moderado',
  engenheiro: 'arrojado',
  fii_dependente: 'moderado',
  iniciante: 'conservador',
};

function normalizePolicy(raw: Record<string, unknown> | null): AllocationPolicy | null {
  if (!raw || typeof raw !== 'object') return null;
  const targets =
    (Array.isArray(raw.targets) ? raw.targets : null) ??
    (Array.isArray(raw.allocation_targets) ? raw.allocation_targets : []) ??
    [];
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    risk_profile: (raw.risk_profile as AllocationPolicy['risk_profile']) ?? 'moderado',
    onboarding_persona: (raw.onboarding_persona as OnboardingPersona | null) ?? null,
    rebalancing_threshold_pct: Number(raw.rebalancing_threshold_pct ?? 5),
    targets: targets as AllocationPolicy['targets'],
  };
}

function normalizeSnapshot(raw: Record<string, unknown> | null): PortfolioSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const items =
    (Array.isArray(raw.items) ? raw.items : null) ??
    (Array.isArray(raw.portfolio_snapshot_items) ? raw.portfolio_snapshot_items : []) ??
    [];
  return {
    id: String(raw.id ?? ''),
    snapshot_date: String(raw.snapshot_date ?? ''),
    total_brl: Number(raw.total_brl ?? 0),
    portfolio_tier: (raw.portfolio_tier as PortfolioSnapshot['portfolio_tier']) ?? 'starter',
    completeness_pct:
      raw.completeness_pct != null ? Number(raw.completeness_pct) : null,
    items: items as PortfolioSnapshot['items'],
  };
}

function normalizeDashboard(raw: Record<string, unknown>): AllocationDashboard {
  const policy = normalizePolicy((raw.policy as Record<string, unknown>) ?? null);
  const snapshot = normalizeSnapshot((raw.snapshot as Record<string, unknown>) ?? null);
  const status = Array.isArray(raw.allocation_status)
    ? raw.allocation_status
    : Array.isArray(raw.allocationStatus)
      ? raw.allocationStatus
      : [];
  const primary = raw.primary_goal ?? raw.primaryGoal;
  return {
    policy,
    allocation_status: status as AllocationDashboard['allocation_status'],
    snapshot,
    health_score: Number(raw.health_score ?? raw.healthScore ?? 0),
    primary_goal:
      primary && typeof primary === 'object'
        ? (primary as AllocationDashboard['primary_goal'])
        : null,
    unread_notifications_count: Number(
      raw.unread_notifications_count ?? raw.unreadNotificationsCount ?? 0
    ),
    completeness_threshold: Number(raw.completeness_threshold ?? raw.completenessThreshold ?? 85),
    market_stress_active: Boolean(raw.market_stress_active ?? raw.marketStressActive),
  };
}

export function useAllocationDashboard() {
  return useQuery({
    queryKey: ['allocation-dashboard'],
    queryFn: async (): Promise<AllocationDashboard | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_allocation_dashboard', {
        p_user_id: user.id,
      });
      if (error) throw error;
      const row = data as Record<string, unknown> | null;
      if (!row) return null;
      if (row.error && typeof row.error === 'string') throw new Error(row.error);
      return normalizeDashboard(row);
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useUpsertAllocationPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      persona,
      targets,
      policyName,
    }: {
      persona: OnboardingPersona;
      targets: Record<AssetClass, number>;
      policyName?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const targetArray = (Object.entries(targets) as [AssetClass, number][])
        .filter(([, pct]) => pct > 0)
        .map(([asset_class, target_pct]) => ({
          asset_class,
          target_pct,
          tolerance_pct: asset_class === 'internacional' ? 3 : 5,
        }));

      const { data, error } = await supabase.rpc('upsert_allocation_policy', {
        p_user_id: user.id,
        p_persona: persona,
        p_risk_profile: PERSONA_RISK[persona],
        p_policy_name: policyName ?? 'Minha Política',
        p_targets: targetArray,
      });
      if (error) throw error;
      const out = data as { success?: boolean; error?: string; policy_id?: string } | null;
      if (out?.error) throw new Error(out.error);
      return out;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allocation-dashboard'] });
    },
  });
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excelente alinhamento';
  if (score >= 75) return 'Pequenos ajustes';
  if (score >= 55) return 'Ajustes necessários';
  if (score >= 35) return 'Revisão recomendada';
  return 'Fora da estratégia';
}

export function getScoreColor(score: number): string {
  if (score >= 75) return '#00C896';
  if (score >= 55) return '#F59E0B';
  return '#EF4444';
}
