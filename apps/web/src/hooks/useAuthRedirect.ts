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
}

/**
 * Hook that determines where to redirect users after authentication
 * based on admin-configured settings and user state
 */
export function useAuthRedirect(): AuthRedirectConfig {
  const { user } = useAuth();
  const { settings, isLoading: settingsLoading } = useAppSettings();

  // Check if user has completed onboarding
  const { data: profile, isPending: profilePending } = useQuery({
    queryKey: ['profile-onboarding-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, status')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching onboarding status:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // CRITICAL: Use isPending (not isLoading) to avoid TanStack Query v5 race condition.
  // isPending = true whenever there's no data, regardless of whether fetch started.
  // This eliminates the 1-render gap where isLoading=false but data=undefined.
  const isLoading = settingsLoading || (!!user?.id && profilePending);
  
  // Determine if this is a first login (onboarding not completed)
  const isFirstLogin = profile ? profile.onboarding_completed !== true : false;
  
  // Should show onboarding if enabled AND user hasn't completed it
  const shouldShowOnboarding = settings.onboarding_enabled && isFirstLogin;
  
  // Determine target route based on settings and user state
  let targetRoute: string;
  if (shouldShowOnboarding) {
    targetRoute = settings.first_login_route || '/onboarding';
  } else {
    targetRoute = settings.returning_user_route || '/simuladores';
  }
  
  // Route to use when skipping onboarding
  const skipRoute = settings.onboarding_skip_route || '/simuladores';

  console.log('[AuthRedirect]', {
    userId: user?.id, profilePending, onboardingCompleted: profile?.onboarding_completed,
    shouldShowOnboarding, targetRoute,
  });

  return {
    shouldShowOnboarding,
    targetRoute,
    skipRoute,
    isLoading,
    isFirstLogin,
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
      status: 'active' 
    })
    .eq('id', userId);
  
  if (error) {
    console.error('Error marking onboarding complete:', error);
    return false;
  }
  
  return true;
}
// sync
