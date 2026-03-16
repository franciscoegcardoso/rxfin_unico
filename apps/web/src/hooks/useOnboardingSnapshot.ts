import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface OnboardingSnapshot {
  pluggy_connections_count: number;
  pluggy_connections: Array<{
    item_id?: string;
    connector_id: number;
    connector_name: string;
    connector_image_url: string | null;
    connector_primary_color?: string | null;
    status: string;
    created_at: string;
  }>;
  has_cpf: boolean;
  transactions_count: number;
  transactions_categorized_count: number;
  has_onboarding_profile: boolean;
  has_financial_config: boolean;
  snapshot_at: string;
}

export function useOnboardingSnapshot(enabled = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['onboarding-snapshot', user?.id],
    queryFn: async (): Promise<OnboardingSnapshot> => {
      const { data, error } = await supabase.rpc('get_onboarding_data_snapshot');
      if (error) throw error;
      return data as OnboardingSnapshot;
    },
    enabled: !!user?.id && enabled,
    staleTime: 60_000, // 1 min — não precisa ser tempo-real
    gcTime: 5 * 60_000,
  });
}

/** Invalida o snapshot após operações que mudam os dados de onboarding */
export function invalidateOnboardingSnapshot(
  queryClient: { invalidateQueries: (opts: { queryKey: unknown[] }) => void },
  userId?: string
) {
  queryClient.invalidateQueries({ queryKey: ['onboarding-snapshot', userId] });
}
