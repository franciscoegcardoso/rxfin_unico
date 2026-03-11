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

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: redirectUrl },
  });

  return { error: error as Error | null };
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
