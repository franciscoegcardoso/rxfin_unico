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

  const { data: profile, isPending: profilePending } = useQuery({
    queryKey: ['profile-onboarding-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, status, onboarding_phase, onboarding_control_done, onboarding_control_phase')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('Error fetching onboarding status:', error);
        return null;
      }
      return data as any;
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  const isLoading = settingsLoading || (!!user?.id && profilePending);

  const onboardingPhase: string = profile?.onboarding_phase ?? 'not_started';
  const isFirstLogin = profile ? profile.onboarding_completed !== true : false;

  // v3: Users are NOT forced to onboarding — they see dashboard with demo mode.
  // shouldShowOnboarding is now only true when explicitly navigating to /onboarding.
  const shouldShowOnboarding = false;

  // Always send to the returning user route (dashboard).
  // Demo mode banner handles the onboarding CTA.
  const targetRoute = settings.returning_user_route || '/simuladores';
  const skipRoute = settings.onboarding_skip_route || '/simuladores';

  console.log('[AuthRedirect]', {
    userId: user?.id, profilePending, onboardingPhase,
    onboardingCompleted: profile?.onboarding_completed,
    shouldShowOnboarding, targetRoute,
  });

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
