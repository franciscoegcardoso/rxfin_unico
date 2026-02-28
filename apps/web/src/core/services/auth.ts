/**
 * Serviço de autenticação — lógica de negócio pura, sem dependência de React.
 * Reutilizável no app mobile.
 */
import { supabase } from '@/core/supabase';
import type { OAuthProvider, SignUpResult, SignInResult, OAuthResult } from '@/core/types/auth';

// ─── Sign Up ─────────────────────────────────────────────
export async function signUp(
  email: string,
  password: string,
  fullName?: string,
  redirectOrigin?: string,
): Promise<SignUpResult> {
  const redirectUrl = `${redirectOrigin ?? window.location.origin}/`;

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: { full_name: fullName },
    },
  });

  return {
    error: error as Error | null,
    data: data?.user ? { user: data.user } : null,
  };
}

// ─── Sign In (email + password) ──────────────────────────
export async function signIn(email: string, password: string): Promise<SignInResult> {
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error as Error };

  if (data?.user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_active, status')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Error checking user status:', profileError);
      return { error: null };
    }

    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      return {
        error: new Error('Sua conta está desativada. Entre em contato com o suporte.'),
      };
    }
  }

  return { error: null };
}

// ─── OAuth ───────────────────────────────────────────────
export async function signInWithOAuth(provider: OAuthProvider): Promise<OAuthResult> {
  const redirectUrl = `${window.location.origin}/auth/callback`;

  const isLovableDomain =
    window.location.hostname.includes('lovable.app') ||
    window.location.hostname.includes('lovableproject.com');

  if (isLovableDomain) {
    return signInWithOAuthPopup(provider, redirectUrl);
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: redirectUrl },
  });

  return { error: error as Error | null };
}

async function signInWithOAuthPopup(
  provider: OAuthProvider,
  redirectUrl: string,
): Promise<OAuthResult> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
  });

  if (error) return { error: error as Error };

  if (data?.url) {
    const oauthUrl = new URL(data.url);
    const allowedHosts = [
      'accounts.google.com',
      'www.facebook.com',
      'kneaniaifzgqibpajyji.supabase.co',
    ];

    if (!allowedHosts.some((host) => oauthUrl.hostname.includes(host))) {
      return { error: new Error('URL de OAuth inválida') };
    }

    const popup = window.open(data.url, 'oauth-popup', 'width=500,height=600,scrollbars=yes');

    if (!popup || popup.closed) {
      return { error: new Error('Popup bloqueado pelo navegador') };
    }

    const pollTimer = setInterval(async () => {
      if (popup.closed) {
        clearInterval(pollTimer);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          window.location.reload();
        }
      }
    }, 500);
  }

  return { error: null };
}

// ─── Sign Out ────────────────────────────────────────────
export async function signOut(): Promise<void> {
  sessionStorage.removeItem('rxfin_impersonated_role');
  await supabase.auth.signOut();
}

// ─── Reset Password ─────────────────────────────────────
export async function resetPassword(email: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/update-password`,
  });
  return { error: error as Error | null };
}
