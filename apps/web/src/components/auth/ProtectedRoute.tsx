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
  '/movimentacoes': 'Movimentações',
  '/movimentacoes/extrato': 'Movimentações',
  '/movimentacoes/cartao-credito': 'Cartão de Crédito',
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
  const isInicio = location.pathname === '/inicio';

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
  const ONBOARDING_RPC_TIMEOUT_MS = 8_000;

  const { data: settingsData, isPending: onboardingCheckPending } = useQuery({
    queryKey: ['onboarding-status', user?.id],
    queryFn: async () => {
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), ONBOARDING_RPC_TIMEOUT_MS);
      });
      const rpcPromise = Promise.all([
        supabase.rpc('get_user_profile_settings'),
        user?.id
          ? supabase
              .from('onboarding_state')
              .select('onboarding_phase')
              .eq('user_id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]).then(([settingsRes, stateRes]) => {
        if (settingsRes.error) return null;
        return {
          ...(settingsRes.data as object),
          onboarding_phase: stateRes.data?.onboarding_phase ?? (settingsRes.data as any)?.onboarding_phase ?? null,
        };
      });
      try {
        return await Promise.race([rpcPromise, timeoutPromise]);
      } catch {
        return null;
      }
    },
    enabled: !!user?.id && needsOnboardingCheck,
    staleTime: 60_000,
    retry: 1,
  });

  // Considerar "não redirecionar" se: onboarding concluído OU já está em andamento
  // (qualquer fase além de not_started significa que o usuário já iniciou)
  const onboardingPhaseFromDb = (settingsData as any)?.onboarding_phase as string | undefined;
  const onboardingCompleteFromDb =
    settingsData?.profile?.onboarding_completed === true ||
    (onboardingPhaseFromDb != null && onboardingPhaseFromDb !== 'not_started');
  const onboardingRpcFailedOrNull = !onboardingCheckPending && needsOnboardingCheck && settingsData == null && !!user?.id;

  useEffect(() => {
    if (onboardingCompleteFromDb) {
      localStorage.setItem(ONBOARDING_CACHE_KEY, 'true');
    }
  }, [onboardingCompleteFromDb]);

  useEffect(() => {
    if (onboardingRpcFailedOrNull) {
      localStorage.setItem(ONBOARDING_CACHE_KEY, 'true');
    }
  }, [onboardingRpcFailedOrNull]);

  const redirectTo = location.pathname + location.search;
  const loginRedirect = redirectTo && redirectTo !== '/login' ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login';

  const onboardingLoading = needsOnboardingCheck && onboardingCheckPending;
  const waitForAvailability = !isInicio && availabilityLoading;
  const isWaiting = authLoading || permissionsLoading || waitForAvailability || (!!user?.id && profilePending) || onboardingLoading;

  // Timeout de segurança: se o loading passar de 15s, não travar (redirecionar ou liberar)
  const [loadingTimedOut, setLoadingTimedOut] = React.useState(false);
  const LOADING_TIMEOUT_MS = 15_000;
  React.useEffect(() => {
    if (!isWaiting) {
      setLoadingTimedOut(false);
      return;
    }
    const t = setTimeout(() => setLoadingTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isWaiting]);

  if (isWaiting && !loadingTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RXFinLoadingSpinner size={56} />
      </div>
    );
  }
  if (loadingTimedOut && authLoading) {
    return <Navigate to={loginRedirect} replace />;
  }
  // loadingTimedOut sem authLoading: deixar seguir (permissões/perfil/onboarding podem estar lentos)

  if (!user) {
    return <Navigate to={loginRedirect} replace />;
  }

  if (profile?.status === 'pending') {
    return <Navigate to={`/verificar-email?email=${encodeURIComponent(user.email ?? '')}`} replace />;
  }

  // Post-auth onboarding: cache first; if missing, use onboarding_state via RPC. Em falha/timeout do RPC, permitir /inicio.
  if (location.pathname === '/inicio') {
    const cacheSet = !!localStorage.getItem(ONBOARDING_CACHE_KEY);
    if (!cacheSet && !onboardingCheckPending) {
      if (onboardingRpcFailedOrNull) {
        // RPC falhou ou deu timeout: não bloquear; cache já foi setado no useEffect
      } else if (!onboardingCompleteFromDb) {
        // Redireciona para o wizard canônico.
        // O OnboardingWizardV3 detecta currentPhase === 'completed' e redireciona
        // de volta para /inicio automaticamente, evitando loop.
        return <Navigate to="/onboarding" replace />;
      }
    }
  }

  // Admin has access to everything — real admin or impersonating as admin
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check if page is available (is_active_users = true). /inicio is always available.
  if (!isInicio && !isAvailable) {
    const featureName = pageName || ROUTE_FEATURE_NAMES[location.pathname];
    return <ComingSoon featureName={featureName} />;
  }

  // Check if user has permission for this route (based on plan hierarchy)
  if (!isInicio && !hasRoutePermission(location.pathname)) {
    const featureName = pageName || ROUTE_FEATURE_NAMES[location.pathname];
    return <ComingSoon featureName={featureName} />;
  }

  return <>{children}</>;
};
