import { supabase } from '@/integrations/supabase/client'
import type { Tables, TablesUpdate } from '@/integrations/supabase/types'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Profile = Tables<'profiles'>
export type ProfileUpdate = TablesUpdate<'profiles'>
export type PushPlatform = 'ios' | 'android'

// ─── Perfil ────────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function updateProfile(userId: string, updates: ProfileUpdate) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Push Notifications ────────────────────────────────────────────────────────

/**
 * Registra ou atualiza o push token do dispositivo mobile.
 * Usa array para suportar múltiplos dispositivos por usuário.
 */
export async function registerPushToken(
  userId: string,
  token: string,
  platform: PushPlatform
): Promise<void> {
  // Busca tokens atuais para não duplicar
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('push_tokens')
    .eq('id', userId)
    .single()

  if (fetchError) throw fetchError

  const currentTokens = profile.push_tokens ?? []
  const updatedTokens = currentTokens.includes(token)
    ? currentTokens
    : [...currentTokens, token]

  const { error } = await supabase
    .from('profiles')
    .update({
      push_tokens: updatedTokens,
      push_platform: platform,
      push_notifications_enabled: true,
      last_auth_platform: platform,
    })
    .eq('id', userId)

  if (error) throw error
}

/**
 * Remove o push token quando o usuário faz logout ou desativa notificações.
 */
export async function unregisterPushToken(userId: string, token: string): Promise<void> {
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('push_tokens')
    .eq('id', userId)
    .single()

  if (fetchError) throw fetchError

  const updatedTokens = (profile.push_tokens ?? []).filter((t: string) => t !== token)

  const { error } = await supabase
    .from('profiles')
    .update({
      push_tokens: updatedTokens,
      push_notifications_enabled: updatedTokens.length > 0,
    })
    .eq('id', userId)

  if (error) throw error
}

/**
 * Desativa completamente as notificações push do usuário.
 */
export async function disablePushNotifications(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      push_tokens: [],
      push_notifications_enabled: false,
    })
    .eq('id', userId)

  if (error) throw error
}

// ─── Preferências ──────────────────────────────────────────────────────────────

export async function updateNotificationPreferences(
  userId: string,
  prefs: {
    notify_due_dates?: boolean
    notify_weekly_summary?: boolean
    notify_news?: boolean
  }
) {
  return updateProfile(userId, prefs)
}

export async function updateThemePreference(
  userId: string,
  theme: 'light' | 'dark' | 'system'
) {
  return updateProfile(userId, { theme_preference: theme })
}
