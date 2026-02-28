import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as authService from '@/core/services/auth';
import type { OAuthProvider } from '@/core/types/auth';

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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Clear React Query cache on auth state changes to prevent data leakage
        if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          queryClient.clear();
        }
        
        // Update last_login_at on sign in and activate user
        if (event === 'SIGNED_IN' && session?.user) {
          // Invalidate all queries to fetch fresh data for the new user
          queryClient.invalidateQueries();
          
          // Show success toast for OAuth logins (detected by checking provider)
          const provider = session.user.app_metadata?.provider;
          if (provider && provider !== 'email') {
            toast.success('Login realizado com sucesso!');
          }
          
          setTimeout(async () => {
            await supabase
              .from('profiles')
              .update({ 
                last_login_at: new Date().toISOString(),
                status: 'active' // Activate user after email confirmation
              })
              .eq('id', session.user.id);
            
            // Trigger daily auto-sync (once per day per user)
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

    // THEN check for existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[Auth] Failed to get session:', err);
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
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
