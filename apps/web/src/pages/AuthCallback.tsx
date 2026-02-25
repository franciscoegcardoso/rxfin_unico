import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * Resolve the redirect route for an authenticated user based on:
 * 1. Their active workspace
 * 2. Onboarding status (profiles.onboarding_completed)
 * 3. Admin-configured app_settings (first_login_route / returning_user_route)
 */
async function resolveRedirectRoute(userId: string): Promise<string> {
  // 1. Fetch onboarding status from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, status')
    .eq('id', userId)
    .single();

  // 2. Fetch relevant app_settings in a single query
  const { data: settingsRows } = await supabase
    .from('app_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [
      'onboarding_enabled',
      'first_login_route',
      'returning_user_route',
    ]);

  const settingsMap: Record<string, string | boolean> = {};
  settingsRows?.forEach((row) => {
    settingsMap[row.setting_key] = row.setting_value as string | boolean;
  });

  const onboardingEnabled = settingsMap['onboarding_enabled'] === true || settingsMap['onboarding_enabled'] === 'true';
  const firstLoginRoute = (settingsMap['first_login_route'] as string) || '/onboarding';
  const returningUserRoute = (settingsMap['returning_user_route'] as string) || '/simuladores';

  const isFirstLogin = profile ? profile.onboarding_completed !== true : false;
  const shouldOnboard = onboardingEnabled && isFirstLogin;

  if (shouldOnboard) {
    console.log('[AuthCallback] New user → first login route:', firstLoginRoute);
    return firstLoginRoute;
  }

  console.log('[AuthCallback] Returning user → route:', returningUserRoute);
  return returningUserRoute;
}

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isPopup = !!window.opener;

    const timeout = setTimeout(() => {
      setError('Tempo limite atingido. Redirecionando para login...');
      setTimeout(() => {
        if (isPopup) {
          window.close();
        } else {
          navigate('/login', { replace: true });
        }
      }, 2000);
    }, 10000);

    const handleAuthenticated = async (userId: string) => {
      clearTimeout(timeout);
      if (isPopup) {
        window.close();
        return;
      }
      try {
        const route = await resolveRedirectRoute(userId);
        navigate(route, { replace: true });
      } catch (err) {
        console.error('[AuthCallback] Error resolving redirect:', err);
        navigate('/inicio', { replace: true });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        handleAuthenticated(session.user.id);
      }
    });

    // Check if already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleAuthenticated(session.user.id);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-sm">Autenticando...</p>
        </>
      )}
    </div>
  );
};

export default AuthCallback;
