import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DEMO_INACTIVE_PHASES = ['block_b_done', 'block_c_done', 'completed'];

/**
 * Determines if the app is in "Demo Mode" (showing fictional data).
 * Demo stays active until user completes at least Block B (Patrimônio),
 * preventing empty dashboards after Block A.
 */
export function useDemoMode() {
  const { user } = useAuth();

  const { data: phase, isPending } = useQuery({
    queryKey: ['onboarding-phase', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'not_started';
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_phase')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('[useDemoMode] Error:', error);
        return 'not_started';
      }
      return (data as any)?.onboarding_phase ?? 'not_started';
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const isDemoMode = !isPending && !DEMO_INACTIVE_PHASES.includes(phase ?? 'not_started');

  return { isDemoMode, isLoading: isPending };
}
