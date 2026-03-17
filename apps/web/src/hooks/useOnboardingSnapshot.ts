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

function defaultOnboardingSnapshot(): OnboardingSnapshot {
  return {
    pluggy_connections_count: 0,
    pluggy_connections: [],
    has_cpf: false,
    transactions_count: 0,
    transactions_categorized_count: 0,
    has_onboarding_profile: false,
    has_financial_config: false,
    snapshot_at: new Date().toISOString(),
  };
}

export function useOnboardingSnapshot(enabled = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['onboarding-snapshot', user?.id],
    queryFn: async (): Promise<OnboardingSnapshot> => {
      const { data, error } = await supabase.rpc('get_onboarding_data_snapshot', {
        p_user_id: user?.id ?? null,
      });
      if (error) {
        if (error.code === 'PGRST202' || error.message?.includes('400')) {
          console.warn('[onboarding-snapshot] RPC 400/unavailable, using default snapshot:', error.message);
          return defaultOnboardingSnapshot();
        }
        throw error;
      }
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
