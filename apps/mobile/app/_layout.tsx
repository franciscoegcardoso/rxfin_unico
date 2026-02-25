import { useEffect, useRef, useState } from 'react'
import { Stack } from 'expo-router'
import { Session } from '@supabase/supabase-js'
import * as Notifications from 'expo-notifications'
import { supabase } from '@/lib/supabase'
import {
  inicializarNotificacoes,
  adicionarListenerNotificacao,
  adicionarListenerToque,
} from '@/lib/notifications'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const notificationListener = useRef<any>()
  const responseListener = useRef<any>()

  useEffect(() => {
    // Sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session) inicializarNotificacoes()
    })

    // Mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) inicializarNotificacoes()
    })

    // Listener: notificação recebida com app aberto
    notificationListener.current = adicionarListenerNotificacao(notification => {
      console.log('[Push] Recebida:', notification.request.content.title)
    })

    // Listener: usuário tocou na notificação
    responseListener.current = adicionarListenerToque(response => {
      const data = response.notification.request.content.data
      console.log('[Push] Tocada, data:', data)
    })

    return () => {
      subscription.unsubscribe()
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [])

  if (loading) return null

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {session ? (
        <Stack.Screen name="(tabs)" />
      ) : (
        <Stack.Screen name="(auth)" />
      )}
    </Stack>
  )
}