import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import type { Page } from './usePages';

export interface SimulatorItem extends Page {
  isComingSoon: boolean;
}

export function usePublicSimulators() {
  const { user } = useAuth();
  const { impersonatedRole, isImpersonating } = useImpersonation();
  const { isAdmin: rawIsAdmin, isLoading: adminLoading } = useIsAdmin();

  const confirmedAdmin = !adminLoading && rawIsAdmin === true;
  const effectiveAdmin = confirmedAdmin && (!isImpersonating || impersonatedRole === 'admin');

  // Derive subscription role from workspace
  const { data: planSlug } = useQuery({
    queryKey: ['user-plan-slug', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'free';
      
      const { data, error } = await supabase
        .from('workspaces')
        .select('plan_expires_at, subscription_plans:plan_id(slug)')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error || !data?.subscription_plans) return 'free';
      
      const isExpired = data.plan_expires_at 
        ? new Date(data.plan_expires_at) < new Date()
        : false;
      
      return isExpired ? 'free' : (data.subscription_plans as any)?.slug || 'free';
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const effectiveRole = isImpersonating && impersonatedRole
    ? impersonatedRole
    : planSlug || 'free';

  const getAllowedAccessLevels = (): string[] => {
    if (!user) return ['public'];
    if (effectiveRole === 'pro' || effectiveRole === 'premium' || effectiveRole === 'admin') {
      return ['public', 'free', 'premium', 'admin'];
    }
    return ['public', 'free'];
  };

  const { data: simulators = [], isLoading, error } = useQuery({
    queryKey: ['public-simulators', user?.id, effectiveRole, effectiveAdmin],
    queryFn: async () => {
      const allowedLevels = getAllowedAccessLevels();

      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('category', 'simuladores')
        .neq('path', '/simuladores')
        .in('access_level', allowedLevels)
        .order('order_index', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pages = (data || []) as Page[];

      return pages
        .filter(page => {
          if (page.is_active_users) return true;
          if (effectiveAdmin) return true;
          return page.show_when_unavailable;
        })
        .map(page => ({
          ...page,
          isComingSoon: effectiveAdmin ? false : !page.is_active_users,
        })) as SimulatorItem[];
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  return {
    simulators,
    isLoading,
    error,
    isAuthenticated: !!user,
    subscriptionRole: effectiveRole,
    isImpersonating,
    isAdmin: effectiveAdmin,
  };
}
