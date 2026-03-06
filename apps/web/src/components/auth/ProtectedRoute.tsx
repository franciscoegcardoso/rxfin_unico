import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionPermissions } from '@/hooks/useSubscriptionPermissions';
import { usePageAvailability } from '@/hooks/useNavMenuPages';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import ComingSoon from '@/pages/ComingSoon';

const ONBOARDING_CACHE_KEY = 'rxfin-onboarding-done';

// Map routes to human-readable feature names
const ROUTE_FEATURE_NAMES: Record<string, string> = {
  '/lancamentos': 'Lançamentos',
  '/gestao-veiculos': 'Gestão de Veículos',
  '/seguros': 'Seguros',
  '/planejamento': 'Planejamento Mensal',
  '/planejamento-anual': 'Projeção 30 Anos',
  '/pacotes-orcamento': 'Pacotes de Orçamento',
  '/registro-compras': 'Registro de Compras',
  '/presentes': 'Presentes',
  '/dashboard': 'Início',
  '/sonhos': 'Sonhos',
  '/metas-mensais': 'Metas Mensais',
};

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { hasRoutePermission, loading: permissionsLoading, isAdmin, isImpersonating } = useSubscriptionPermissions();
  const location = useLocation();
  const { isAvailable, isLoading: availabilityLoading, pageName, canAdminBypass } = usePageAvailability(location.pathname);

  const { data: profile, isPending: profilePending } = useQuery({
    queryKey: ['profile-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .single();
      if (error) return null;
      return data as { status: string };
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  const needsOnboardingCheck = location.pathname === '/inicio' && !localStorage.getItem(ONBOARDING_CACHE_KEY);
  const { data: settingsData, isPending: onboardingCheckPending } = useQuery({
    queryKey: ['onboarding-status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_profile_settings');
      if (error) return null;
      return data as { profile?: { onboarding_completed?: boolean | null } | null };
    },
    enabled: !!user?.id && needsOnboardingCheck,
    staleTime: 60_000,
  });

  const onboardingCompleteFromDb = settingsData?.profile?.onboarding_completed === true;

  useEffect(() => {
    if (onboardingCompleteFromDb) {
      localStorage.setItem(ONBOARDING_CACHE_KEY, 'true');
    }
  }, [onboardingCompleteFromDb]);

  const redirectTo = location.pathname + location.search;
  const loginRedirect = redirectTo && redirectTo !== '/login' ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login';

  const onboardingLoading = needsOnboardingCheck && onboardingCheckPending;
  if (authLoading || permissionsLoading || availabilityLoading || (!!user?.id && profilePending) || onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RXFinLoadingSpinner size={56} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={loginRedirect} replace />;
  }

  if (profile?.status === 'pending') {
    return <Navigate to={`/verificar-email?email=${encodeURIComponent(user.email ?? '')}`} replace />;
  }

  // Post-auth onboarding: cache first; if missing, use onboarding_state via RPC
  if (location.pathname === '/inicio') {
    const cacheSet = !!localStorage.getItem(ONBOARDING_CACHE_KEY);
    if (!cacheSet && !onboardingCheckPending) {
      if (!onboardingCompleteFromDb) {
        return <Navigate to="/onboarding" replace />;
      }
    }
  }

  // Admin has access to everything — real admin or impersonating as admin
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check if page is available (is_active_users = true)
  // If page is disabled, show "Coming Soon" regardless of plan
  if (!isAvailable) {
    const featureName = pageName || ROUTE_FEATURE_NAMES[location.pathname];
    return <ComingSoon featureName={featureName} />;
  }

  // Check if user has permission for this route (based on plan hierarchy)
  if (!hasRoutePermission(location.pathname)) {
    const featureName = pageName || ROUTE_FEATURE_NAMES[location.pathname];
    return <ComingSoon featureName={featureName} />;
  }

  return <>{children}</>;
};
