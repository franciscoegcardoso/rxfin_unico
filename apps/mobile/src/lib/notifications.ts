import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Push] Simulador detectado — token não disponível')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permissão negada pelo usuário')
    return null
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'RXFin',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1a7a4a',
    })
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    })
    console.log('[Push] Token obtido:', tokenData.data)
    return tokenData.data
  } catch (e) {
    console.log('[Push] Erro ao obter token:', e)
    return null
  }
}

export async function salvarTokenNoPerfil(token: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('push_tokens')
      .eq('id', user.id)
      .single()

    const existentes: string[] = profile?.push_tokens ?? []

    if (!existentes.includes(token)) {
      const novos = [...existentes, token].slice(-5)
      await supabase
        .from('profiles')
        .update({
          push_tokens: novos,
          push_notifications_enabled: true,
          push_platform: Platform.OS,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      console.log('[Push] Token salvo com sucesso')
    } else {
      console.log('[Push] Token já registrado')
    }
  } catch (e) {
    console.error('[Push] Erro ao salvar token:', e)
  }
}

export async function inicializarNotificacoes() {
  try {
    const token = await getPushToken()
    if (token) await salvarTokenNoPerfil(token)
  } catch (e) {
    console.log('[Push] Inicialização ignorada:', e)
  }
}

export function adicionarListenerNotificacao(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback)
}

export function adicionarListenerToque(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback)
}