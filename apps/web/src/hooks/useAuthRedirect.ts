import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from './useAppSettings';

interface AuthRedirectConfig {
  shouldShowOnboarding: boolean;
  targetRoute: string;
  skipRoute: string;
  isLoading: boolean;
  isFirstLogin: boolean;
  onboardingPhase: string;
}

/**
 * Hook that determines where to redirect users after authentication.
 * 
 * KEY CHANGE (v3): Users with incomplete onboarding are NO LONGER forced
 * to the onboarding wizard. They see the dashboard with demo data + banner.
 * Onboarding is started only via the banner CTA.
 */
export function useAuthRedirect(): AuthRedirectConfig {
  const { user } = useAuth();
  const { settings, isLoading: settingsLoading } = useAppSettings();

  const { data: profileData, isPending: profilePending } = useQuery({
    queryKey: ['profile-onboarding-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc('get_user_profile_settings');
      if (error) {
        console.error('Error fetching profile settings (onboarding status):', error);
        return null;
      }
      return (data as { profile?: { onboarding_completed?: boolean | null; onboarding_phase?: string | null } | null })?.profile ?? null;
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  const isLoading = settingsLoading || (!!user?.id && profilePending);

  const profile = profileData;
  const onboardingPhase: string = profile?.onboarding_phase ?? 'not_started';
  const isFirstLogin = profile ? profile.onboarding_completed !== true : false;

  const shouldShowOnboarding = false;
  const skipRoute = settings.onboarding_skip_route || '/inicio';

  // Post-login redirect: only when profile loaded (!isLoading). Use onboarding_completed from onboarding_state (RPC).
  let targetRoute =
    profile && profile.onboarding_completed === true
      ? (settings.returning_user_route || '/inicio')
      : '/onboarding';
  if (targetRoute === '/inicio' && typeof window !== 'undefined' && !localStorage.getItem('rxfin-onboarding-done')) {
    targetRoute = '/onboarding';
  }

  return {
    shouldShowOnboarding,
    targetRoute,
    skipRoute,
    isLoading,
    isFirstLogin,
    onboardingPhase,
  };
}

/**
 * Mark onboarding as completed for the current user
 */
export async function markOnboardingComplete(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      onboarding_completed: true,
      onboarding_phase: 'completed',
      status: 'active' 
    })
    .eq('id', userId);
  
  if (error) {
    console.error('Error marking onboarding complete:', error);
    return false;
  }
  
  return true;
}
