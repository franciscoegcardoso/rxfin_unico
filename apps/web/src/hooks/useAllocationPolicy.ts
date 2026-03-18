import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  AllocationPolicy,
  AllocationTarget,
  AssetClass,
  OnboardingPersona,
  RiskProfile,
} from '@/types/allocation';

export function useAllocationPolicy() {
  return useQuery({
    queryKey: ['allocation-policy'],
    queryFn: async (): Promise<AllocationPolicy | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('allocation_policies')
        .select(
          `
          *,
          allocation_targets (*)
        `
        )
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as AllocationPolicy | null;
    },
  });
}

export const PERSONA_DEFAULTS: Record<OnboardingPersona, Record<AssetClass, number>> = {
  acumulador: {
    renda_fixa: 40,
    acoes: 35,
    fii: 20,
    internacional: 5,
    cripto: 0,
    alternativo: 0,
  },
  engenheiro: {
    renda_fixa: 25,
    acoes: 45,
    fii: 15,
    internacional: 15,
    cripto: 0,
    alternativo: 0,
  },
  fii_dependente: {
    renda_fixa: 10,
    acoes: 15,
    fii: 70,
    internacional: 5,
    cripto: 0,
    alternativo: 0,
  },
  iniciante: {
    renda_fixa: 50,
    acoes: 30,
    fii: 20,
    internacional: 0,
    cripto: 0,
    alternativo: 0,
  },
};

export const PERSONA_RISK: Record<OnboardingPersona, RiskProfile> = {
  acumulador: 'moderado',
  engenheiro: 'arrojado',
  fii_dependente: 'moderado',
  iniciante: 'conservador',
};

export function useCreateAllocationPolicy() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      persona,
      targets,
    }: {
      persona: OnboardingPersona;
      targets: Record<AssetClass, number>;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: policy, error: pErr } = await supabase
        .from('allocation_policies')
        .insert({
          user_id: user.id,
          name: 'Minha Política',
          risk_profile: PERSONA_RISK[persona],
          onboarding_persona: persona,
          rebalancing_threshold_pct: 5.0,
          is_active: true,
        })
        .select('id')
        .single();

      if (pErr) throw pErr;

      const targetRows = (
        Object.entries(targets) as [AssetClass, number][]
      )
        .filter(([, pct]) => pct > 0)
        .map(([asset_class, target_pct]) => ({
          policy_id: policy.id,
          asset_class,
          target_pct,
          tolerance_pct: 5.0,
        }));

      const { error: tErr } = await supabase
        .from('allocation_targets')
        .insert(targetRows);

      if (tErr) throw tErr;

      return policy;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allocation-policy'] });
      qc.invalidateQueries({ queryKey: ['allocation-status'] });
    },
  });
}
