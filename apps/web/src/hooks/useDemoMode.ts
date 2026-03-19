import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Demo desliga assim que o usuário inicia o wizard (fase 'started').
// 'not_started' = único estado onde dados fictícios fazem sentido.
const DEMO_INACTIVE_PHASES = ['started', 'block_a_done', 'block_b_done', 'block_c_done', 'completed'];

/**
 * Determines if the app is in "Demo Mode" (showing fictional data).
 * Demo is off as soon as user starts the Raio-X wizard (started); only ProgressBanner shows.
 */
export function useDemoMode() {
  const { user } = useAuth();

  const { data: phase, isPending } = useQuery({
    queryKey: ['onboarding-phase', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'not_started';
      const { data: stateRow, error } = await supabase
        .from('onboarding_state' as never)
        .select('onboarding_phase')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_phase')
          .eq('id', user.id)
          .maybeSingle();
        return (profile as { onboarding_phase?: string } | null)?.onboarding_phase ?? 'not_started';
      }
      return (stateRow as { onboarding_phase?: string } | null)?.onboarding_phase ?? 'not_started';
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const isDemoMode = !isPending && !DEMO_INACTIVE_PHASES.includes(phase ?? 'not_started');

  return { isDemoMode, isLoading: isPending };
}
