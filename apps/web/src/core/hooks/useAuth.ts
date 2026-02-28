import { useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/core/supabase'
import { signIn as signInService, signOut as signOutService, signInWithOAuth as oauthService, resetPassword as resetPwService } from '@/core/services/auth'
import type { OAuthProvider } from '@/core/types/auth'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface UseAuthReturn {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOutUser: () => Promise<void>
  loginWithOAuth: (provider: OAuthProvider) => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Carrega sessão inicial
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // Escuta mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await signInService(email, password)
    if (result.error) throw result.error
  }, [])

  const signOutUser = useCallback(async () => {
    await signOutService()
  }, [])

  const loginWithOAuth = useCallback(async (provider: OAuthProvider) => {
    const result = await oauthService(provider)
    if (result.error) throw result.error
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const result = await resetPwService(email)
    if (result.error) throw result.error
  }, [])

  return { user, session, loading, signIn, signOutUser, loginWithOAuth, resetPassword }
}
