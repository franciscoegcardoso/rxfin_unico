import { useEffect, useState, useMemo, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { ImpersonationContext } from '@/contexts/ImpersonationContext';

export type SubscriptionRole = 'sem_cadastro' | 'free' | 'starter' | 'pro' | 'premium' | 'admin';

// Plan hierarchy: lower index = more restricted, higher = more access
// (1) Sem Cadastro → (2) Free → (3) RX Starter → (4) RX Pro
const PLAN_HIERARCHY: Record<string, number> = {
  sem_cadastro: 1,
  free: 2,
  starter: 3, // RX Starter
  basic: 3,   // Legacy alias for starter
  pro: 4,     // RX Pro
  premium: 4, // Legacy, same as pro
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
  const [realSubscriptionRole, setRealSubscriptionRole] = useState<SubscriptionRole>('free');
  const [pages, setPages] = useState<PageWithPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine effective subscription role (real or impersonated)
  const subscriptionRole = useMemo((): SubscriptionRole => {
    if (impersonationContext?.isImpersonating && impersonationContext.impersonatedRole) {
      return impersonationContext.impersonatedRole as SubscriptionRole;
    }
    return realSubscriptionRole;
  }, [impersonationContext?.isImpersonating, impersonationContext?.impersonatedRole, realSubscriptionRole]);

  // Get user's plan hierarchy level
  const userPlanLevel = useMemo(() => {
    if (impersonationContext?.impersonatedRole === 'admin') return Infinity;
    if (!impersonationContext?.isImpersonating && isAdmin) return Infinity;
    return PLAN_HIERARCHY[subscriptionRole] || PLAN_HIERARCHY.free;
  }, [subscriptionRole, isAdmin, impersonationContext?.isImpersonating, impersonationContext?.impersonatedRole]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch pages with path and min_plan_slug for dynamic permission checking
      const { data: pagesData } = await supabase
        .from('pages')
        .select('slug, path, min_plan_slug, is_active_users');
      
      if (pagesData) {
        setPages(pagesData as PageWithPlan[]);
      }

      if (!user?.id) {
        setRealSubscriptionRole('sem_cadastro');
        setLoading(false);
        return;
      }

      try {
        // Derive subscription role from workspace → subscription_plans
        const { data: workspaceData, error: wsError } = await supabase
          .from('workspaces')
          .select(`
            plan_id,
            plan_expires_at,
            subscription_plans:plan_id(slug, order_index)
          `)
          .eq('owner_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (wsError) {
          console.error('Error fetching workspace plan:', wsError);
          setRealSubscriptionRole('free');
          setLoading(false);
          return;
        }

        if (!workspaceData || !workspaceData.subscription_plans) {
          setRealSubscriptionRole('free');
          setLoading(false);
          return;
        }

        const planSlug = (workspaceData.subscription_plans as any)?.slug || 'free';
        
        // Check if plan is expired - if so, treat as free
        const isExpired = workspaceData.plan_expires_at 
          ? new Date(workspaceData.plan_expires_at) < new Date()
          : false;

        const role = (isExpired ? 'free' : planSlug) as SubscriptionRole;
        setRealSubscriptionRole(role);
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        setRealSubscriptionRole('free');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const hasPermission = (featureSlug: string): boolean => {
    if (impersonationContext?.impersonatedRole === 'admin') return true;
    if (!impersonationContext?.isImpersonating && isAdmin) return true;

    const page = pages.find(p => p.slug === featureSlug);
    if (!page) return true;
    if (!page.is_active_users) return false;

    const minPlanSlug = page.min_plan_slug || 'free';
    const requiredLevel = PLAN_HIERARCHY[minPlanSlug] || PLAN_HIERARCHY.free;
    return userPlanLevel >= requiredLevel;
  };

  const hasRoutePermission = (route: string): boolean => {
    if (impersonationContext?.impersonatedRole === 'admin') return true;
    if (!impersonationContext?.isImpersonating && isAdmin) return true;

    const page = pages.find(p => p.path === route);
    if (!page) return true;
    if (!page.is_active_users) return false;

    const minPlanSlug = page.min_plan_slug || 'sem_cadastro';
    const requiredLevel = PLAN_HIERARCHY[minPlanSlug] || PLAN_HIERARCHY.sem_cadastro;
    return userPlanLevel >= requiredLevel;
  };

  const getRequiredPlanForRoute = (route: string): string | null => {
    const page = pages.find(p => p.path === route);
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
