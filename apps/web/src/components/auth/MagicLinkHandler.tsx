import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';

/**
 * MagicLinkHandler - Processa tokens de Magic Link na URL
 * 
 * O Supabase coloca tokens no hash fragment (#access_token=...)
 * Este componente detecta e processa automaticamente
 */
export const MagicLinkHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isProcessingMagicLink, setIsProcessingMagicLink] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { settings } = useAppSettings();

  useEffect(() => {
    const handleMagicLink = async () => {
      // Check if there's a hash fragment with access_token (magic link)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      // Also check for error in hash (e.g., expired link)
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      if (error) {
        console.error('[MagicLink] Error in URL:', error, errorDescription);
        // Clean up URL and redirect to login
        window.history.replaceState({}, document.title, window.location.pathname);
        navigate('/login', { 
          replace: true, 
          state: { error: errorDescription || 'Link inválido ou expirado' } 
        });
        return;
      }

      if (accessToken && refreshToken) {
        console.log('[MagicLink] Token detected in URL, processing...', { type });
        setIsProcessingMagicLink(true);

        try {
          // Set the session with the tokens from the URL
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[MagicLink] Error setting session:', sessionError);
            navigate('/login', { 
              replace: true, 
              state: { error: 'Erro ao processar link de acesso' } 
            });
            return;
          }

          console.log('[MagicLink] Session established successfully', data.user?.email);

          // Clean the URL (remove hash fragment)
          window.history.replaceState({}, document.title, window.location.pathname);

          // Password recovery flow: keep the user on /update-password to set the new password.
          // Without this guard, the global magic-link redirect would override the recovery screen.
          if (type === 'recovery' || location.pathname === '/update-password') {
            console.log('[MagicLink] Password recovery detected, staying on /update-password');
            if (location.pathname !== '/update-password') {
              navigate('/update-password', { replace: true });
            }
            return;
          }

          // Check if user needs onboarding (first access); use get_user_profile_settings (onboarding_state) as source of truth
          if (data.user) {
            const { data: settings } = await supabase.rpc('get_user_profile_settings');
            const profile = (settings as { profile?: { onboarding_completed?: boolean | null } | null })?.profile;

            // Check if onboarding is enabled and user hasn't completed it
            const isFirstLogin = profile?.onboarding_completed !== true;
            const shouldOnboard = settings.onboarding_enabled && isFirstLogin;

            if (shouldOnboard) {
              console.log('[MagicLink] New user, redirecting to first login route');
              navigate(settings.first_login_route || '/inicio', { replace: true });
            } else {
              // Existing user or onboarding disabled, go to returning user route
              console.log('[MagicLink] Existing user, redirecting to returning user route');
              navigate(settings.returning_user_route || '/inicio', { replace: true });
            }
          }
        } catch (err) {
          console.error('[MagicLink] Unexpected error:', err);
          navigate('/login', { 
            replace: true, 
            state: { error: 'Erro inesperado ao processar link' } 
          });
        } finally {
          setIsProcessingMagicLink(false);
        }
      }
    };

    // Only process if we're on the home page or a page that might receive magic links
    if (window.location.hash.includes('access_token')) {
      handleMagicLink();
    }
  }, [navigate, location]);

  // Show loading screen while processing magic link
  if (isProcessingMagicLink) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <RXFinLoadingSpinner size={80} message="Autenticando..." />
          <p className="text-sm text-muted-foreground">Aguarde enquanto validamos seu acesso</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
