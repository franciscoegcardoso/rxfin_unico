import { useEffect, useState, useCallback } from 'react'
import { getProfile, updateProfile, registerPushToken, disablePushNotifications } from '@/core/services/perfil'
import type { Profile, ProfileUpdate, PushPlatform } from '@/core/services/perfil'

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    getProfile(userId)
      .then(setProfile)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [userId])

  const update = useCallback(async (updates: ProfileUpdate) => {
    if (!userId) return
    const updated = await updateProfile(userId, updates)
    setProfile(updated)
    return updated
  }, [userId])

  const registerPush = useCallback(async (token: string, platform: PushPlatform) => {
    if (!userId) return
    await registerPushToken(userId, token, platform)
    const updated = await getProfile(userId)
    setProfile(updated)
  }, [userId])

  const disablePush = useCallback(async () => {
    if (!userId) return
    await disablePushNotifications(userId)
    const updated = await getProfile(userId)
    setProfile(updated)
  }, [userId])

  return { profile, loading, error, update, registerPush, disablePush }
}
