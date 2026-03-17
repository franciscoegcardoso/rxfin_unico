import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as authService from '@/core/services/auth';
import type { OAuthProvider } from '@/core/types/auth';
import { setSentryUser } from '@/lib/sentry';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null; data: { user: User | null } | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Cache da primeira getSession() para evitar múltiplas chamadas (ex.: React Strict Mode monta 2x).
 * Reduz contenção no lock do Gotrue e o aviso "Lock was not released within 5000ms". */
let initialSessionPromise: Promise<{ data: { session: Session | null } }> | null = null;
function getInitialSession() {
  if (!initialSessionPromise) {
    initialSessionPromise = supabase.auth.getSession();
  }
  return initialSessionPromise;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Nota: o aviso "@supabase/gotrue-js: Lock ... was not released within 5000ms" é conhecido.
    // Ocorre com muitas chamadas concorrentes a getSession() (ex.: várias páginas/hooks) ou
    // em React Strict Mode (dev). A lib recupera sozinha (force-acquire). Preferir useAuth().session
    // em novos códigos em vez de supabase.auth.getSession() para reduzir contenção.
    //
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setSentryUser(session?.user?.id ?? null);
        setLoading(false);
        
        // Clear React Query cache on auth state changes to prevent data leakage
        if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          queryClient.clear();
        }
        
        // On sign in: invalidate queries; do NOT set status to 'active' here (only email verification does that)
        if (event === 'SIGNED_IN' && session?.user) {
          queryClient.invalidateQueries();
          const provider = session.user.app_metadata?.provider;
          if (provider && provider !== 'email') {
            toast.success('Login realizado com sucesso!');
          }
          setTimeout(async () => {
            await supabase
              .from('profiles')
              .update({ last_login_at: new Date().toISOString() })
              .eq('id', session.user.id);
            supabase.rpc('check_and_create_sync_job', { p_user_id: session.user.id })
              .then(({ data, error }) => {
                if (error) console.error('[DailySync] RPC error:', error.message);
                else {
                  const result = data as unknown as { created: boolean; job_id?: string; reason?: string };
                  if (result?.created) console.log('[DailySync] Job created:', result.job_id);
                  else console.log('[DailySync] Skipped:', result?.reason);
                }
              });
          }, 0);
        }
      }
    );

    // THEN check for existing session (uma única getSession() compartilhada evita lock contention no Strict Mode)
    const SESSION_TIMEOUT_MS = 12_000;
    const timeoutId = setTimeout(() => {
      setSession(null);
      setUser(null);
      setSentryUser(null);
      setLoading(false);
    }, SESSION_TIMEOUT_MS);

    getInitialSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setSentryUser(session?.user?.id ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[Auth] Failed to get session:', err);
        setSession(null);
        setUser(null);
        setSentryUser(null);
        setLoading(false);
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const handleSignUp = async (email: string, password: string, fullName?: string) => {
    return authService.signUp(email, password, fullName);
  };

  const handleSignIn = async (email: string, password: string) => {
    const result = await authService.signIn(email, password);
    if (result.error?.message.includes('desativada')) {
      toast.error(result.error.message);
    }
    return result;
  };

  const handleSignInWithOAuth = async (provider: OAuthProvider) => {
    const result = await authService.signInWithOAuth(provider);
    if (result.error?.message.includes('Popup bloqueado')) {
      toast.error('Popup bloqueado. Permita popups para este site e tente novamente.');
    }
    return result;
  };

  const handleSignOut = async () => {
    queryClient.clear();
    await authService.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp: handleSignUp,
      signIn: handleSignIn,
      signInWithOAuth: handleSignInWithOAuth,
      signOut: handleSignOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
