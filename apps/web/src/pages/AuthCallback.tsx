import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * Resolve the redirect route for an authenticated user.
 * Uses get_user_profile_settings (onboarding_state JOIN) for onboarding_completed.
 */
async function resolveRedirectRoute(): Promise<string> {
  const { data, error } = await supabase.rpc('get_user_profile_settings');
  if (error) {
    console.error('[AuthCallback] get_user_profile_settings error:', error);
    return '/inicio';
  }
  const profile = (data as { profile?: { onboarding_completed?: boolean | null } | null })?.profile;
  if (profile?.onboarding_completed !== true) {
    return '/onboarding';
  }

  const { data: settingsRows } = await supabase
    .from('app_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['returning_user_route']);

  const settingsMap: Record<string, string> = {};
  settingsRows?.forEach((row) => {
    settingsMap[row.setting_key] = row.setting_value as string;
  });

  return settingsMap['returning_user_route'] || '/inicio';
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

    const handleAuthenticated = async () => {
      clearTimeout(timeout);
      if (isPopup) {
        window.close();
        return;
      }
      try {
        let route = await resolveRedirectRoute();
        if (route === '/inicio' && !localStorage.getItem('rxfin-onboarding-done')) {
          route = '/onboarding';
        }
        navigate(route, { replace: true });
      } catch (err) {
        console.error('[AuthCallback] Error resolving redirect:', err);
        navigate('/inicio', { replace: true });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        handleAuthenticated();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleAuthenticated();
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
