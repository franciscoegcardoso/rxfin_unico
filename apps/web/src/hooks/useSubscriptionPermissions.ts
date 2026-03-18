import { useMemo, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { ImpersonationContext } from '@/contexts/ImpersonationContext';

export type SubscriptionRole = 'sem_cadastro' | 'free' | 'starter' | 'pro' | 'premium' | 'admin';

const PLAN_HIERARCHY: Record<string, number> = {
  sem_cadastro: 1,
  free: 2,
  starter: 3,
  basic: 3,
  pro: 4,
  premium: 4,
};

interface PageWithPlan {
  slug: string;
  path: string;
  min_plan_slug: string | null;
  is_active_users: boolean;
}

export const useSubscriptionPermissions = () => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const impersonationContext = useContext(ImpersonationContext);

  const { data: pages = [], isLoading: pagesLoading } = useQuery({
    queryKey: ['pages', 'permission-slugs'],
    queryFn: async () => {
      const { data: pagesData, error } = await supabase
        .from('pages')
        .select('slug, path, min_plan_slug, is_active_users');
      if (error) {
        console.error('Error fetching pages for permissions:', error);
        return [];
      }
      return (pagesData ?? []) as PageWithPlan[];
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { data: fetchedRole, isLoading: roleLoading } = useQuery({
    queryKey: ['workspace-subscription-role', user?.id],
    queryFn: async (): Promise<SubscriptionRole> => {
      const { data: workspaceData, error: wsError } = await supabase
        .from('workspaces')
        .select(
          `
            plan_id,
            plan_expires_at,
            subscription_plans:plan_id(slug, order_index)
          `
        )
        .eq('owner_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (wsError) {
        console.error('Error fetching workspace plan:', wsError);
        return 'free';
      }
      if (!workspaceData || !workspaceData.subscription_plans) return 'free';
      const planSlug = (workspaceData.subscription_plans as { slug?: string })?.slug || 'free';
      const isExpired = workspaceData.plan_expires_at
        ? new Date(workspaceData.plan_expires_at) < new Date()
        : false;
      return (isExpired ? 'free' : planSlug) as SubscriptionRole;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const realSubscriptionRole: SubscriptionRole = !user?.id ? 'sem_cadastro' : (fetchedRole ?? 'free');

  const subscriptionRole = useMemo((): SubscriptionRole => {
    if (impersonationContext?.isImpersonating && impersonationContext.impersonatedRole) {
      return impersonationContext.impersonatedRole as SubscriptionRole;
    }
    return realSubscriptionRole;
  }, [impersonationContext?.isImpersonating, impersonationContext?.impersonatedRole, realSubscriptionRole]);

  const userPlanLevel = useMemo(() => {
    if (impersonationContext?.impersonatedRole === 'admin') return Infinity;
    if (!impersonationContext?.isImpersonating && isAdmin) return Infinity;
    return PLAN_HIERARCHY[subscriptionRole] || PLAN_HIERARCHY.free;
  }, [subscriptionRole, isAdmin, impersonationContext?.isImpersonating, impersonationContext?.impersonatedRole]);

  const loading = !!user?.id && (pagesLoading || roleLoading);

  const hasPermission = (featureSlug: string): boolean => {
    if (impersonationContext?.impersonatedRole === 'admin') return true;
    if (!impersonationContext?.isImpersonating && isAdmin) return true;

    const page = pages.find((p) => p.slug === featureSlug);
    if (!page) return true;
    if (!page.is_active_users) return false;

    const minPlanSlug = page.min_plan_slug || 'free';
    const requiredLevel = PLAN_HIERARCHY[minPlanSlug] || PLAN_HIERARCHY.free;
    return userPlanLevel >= requiredLevel;
  };

  const hasRoutePermission = (route: string): boolean => {
    if (impersonationContext?.impersonatedRole === 'admin') return true;
    if (!impersonationContext?.isImpersonating && isAdmin) return true;

    const page = pages.find((p) => p.path === route);
    if (!page) return true;
    if (!page.is_active_users) return false;

    const minPlanSlug = page.min_plan_slug || 'sem_cadastro';
    const requiredLevel = PLAN_HIERARCHY[minPlanSlug] || PLAN_HIERARCHY.sem_cadastro;
    return userPlanLevel >= requiredLevel;
  };

  const getRequiredPlanForRoute = (route: string): string | null => {
    const page = pages.find((p) => p.path === route);
    return page?.min_plan_slug || null;
  };

  const isOperatingAsAdmin = useMemo(() => {
    if (impersonationContext?.impersonatedRole === 'admin') return true;
    if (!impersonationContext?.isImpersonating && isAdmin) return true;
    return false;
  }, [isAdmin, impersonationContext?.isImpersonating, impersonationContext?.impersonatedRole]);

  return {
    subscriptionRole,
    loading,
    hasPermission,
    hasRoutePermission,
    getRequiredPlanForRoute,
    userPlanLevel,
    isAdmin: isOperatingAsAdmin,
    isImpersonating: impersonationContext?.isImpersonating ?? false,
  };
};
