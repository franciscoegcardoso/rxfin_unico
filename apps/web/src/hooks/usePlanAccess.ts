import { useMemo, useCallback } from 'react';
import { useSubscriptionPermissions } from '@/hooks/useSubscriptionPermissions';

export const usePlanAccess = () => {
  const {
    subscriptionRole,
    loading,
    hasPermission,
    hasRoutePermission,
    getRequiredPlanForRoute,
    userPlanLevel,
    isAdmin,
    isImpersonating,
  } = useSubscriptionPermissions();

  const planSlug = subscriptionRole;
  const planLevel = userPlanLevel;

  const isFree = useMemo(() => planSlug === 'free' || planSlug === 'sem_cadastro', [planSlug]);
  const isStarter = useMemo(() => planSlug === 'starter' || (planSlug as string) === 'basic', [planSlug]);
  const isPro = useMemo(() => planSlug === 'pro' || planSlug === 'premium', [planSlug]);

  const canAccess = useCallback(
    (featureSlug: string): boolean => hasPermission(featureSlug),
    [hasPermission],
  );

  const canAccessRoute = useCallback(
    (route: string): boolean => hasRoutePermission(route),
    [hasRoutePermission],
  );

  const getRequiredPlan = useCallback(
    (featureSlug: string): string | null => getRequiredPlanForRoute(featureSlug),
    [getRequiredPlanForRoute],
  );

  return {
    planSlug,
    planLevel,
    loading,
    isAdmin,
    isImpersonating,
    isFree,
    isStarter,
    isPro,
    canAccess,
    canAccessRoute,
    getRequiredPlan,
  };
};
// sync
