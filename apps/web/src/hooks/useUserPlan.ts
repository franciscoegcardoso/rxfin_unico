import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { mergeUserPlanView, type UserPlanViewFields } from '@/lib/userPlanDefaults';

/**
 * Plano do usuário a partir de `v_user_plan` (SECURITY INVOKER).
 * Sempre retorna defaults `free`/`Free` quando a view não tem linha ou campos null.
 */
export function useUserPlan() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-plan-view', user?.id],
    queryFn: async (): Promise<UserPlanViewFields> => {
      const { data, error } = await supabase
        .from('v_user_plan')
        .select('plan_slug, plan_name, plan_expires_at, workspace_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return mergeUserPlanView(
        data as Partial<UserPlanViewFields> | null,
      );
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}
