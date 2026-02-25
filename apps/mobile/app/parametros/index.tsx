import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { SectionCard } from '@/components/ui/SectionCard'
import { theme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

interface Profile {
  notify_due_dates: boolean
  notify_weekly_summary: boolean
  notify_news: boolean
  push_notifications_enabled: boolean
  theme_preference: 'light' | 'dark' | 'system'
  finance_mode: string | null
}

export default function ParametrosScreen() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile>({
    notify_due_dates: false, notify_weekly_summary: false, notify_news: false,
    push_notifications_enabled: false, theme_preference: 'system', finance_mode: null,
  })

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select(
        'notify_due_dates, notify_weekly_summary, notify_news, push_notifications_enabled, theme_preference, finance_mode'
      ).eq('id', user.id).single()
      if (data) setProfile(data as any)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  async function update(key: keyof Profile, value: any) {
    setProfile(prev => ({ ...prev, [key]: value }))
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ [key]: value }).eq('id', user.id)
  }

  const THEMES = [
    { value: 'light', label: 'Claro', icon: 'sunny' },
    { value: 'dark', label: 'Escuro', icon: 'moon' },
    { value: 'system', label: 'Sistema', icon: 'phone-portrait' },
  ]

  const MODES = [
    { value: 'pessoal', label: 'Pessoal', icon: 'person', desc: 'Finanças individuais' },
    { value: 'casal', label: 'Casal', icon: 'people', desc: 'Finanças compartilhadas' },
    { value: 'familia', label: 'Família', icon: 'home', desc: 'Gestão familiar completa' },
  ]

  return (
    <ScreenLayout titulo="Parâmetros">
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.heroIcone}><Ionicons name="settings" size={28} color={theme.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitulo}>Parâmetros</Text>
            <Text style={s.heroDesc}>Personalize seu app financeiro.</Text>
          </View>
        </View>

        {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> : (
          <>
            <SectionCard titulo="Aparência">
              <View style={s.themeRow}>
                {THEMES.map(t => (
                  <TouchableOpacity key={t.value}
                    style={[s.themeBtn, profile.theme_preference === t.value && s.themeBtnAtivo]}
                    onPress={() => update('theme_preference', t.value)}>
                    <Ionicons name={t.icon as any} size={20}
                      color={profile.theme_preference === t.value ? '#fff' : theme.textMuted} />
                    <Text style={[s.themeText, profile.theme_preference === t.value && { color: '#fff' }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </SectionCard>

            <SectionCard titulo="Modo financeiro">
              <View style={s.modeCol}>
                {MODES.map(m => (
                  <TouchableOpacity key={m.value}
                    style={[s.modeBtn, profile.finance_mode === m.value && s.modeBtnAtivo]}
                    onPress={() => update('finance_mode', m.value)}>
                    <View style={[s.modeIcone, profile.finance_mode === m.value && { backgroundColor: theme.primary }]}>
                      <Ionicons name={m.icon as any} size={18}
                        color={profile.finance_mode === m.value ? '#fff' : theme.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.modeLabel, profile.finance_mode === m.value && { color: theme.primary }]}>{m.label}</Text>
                      <Text style={s.modeDesc}>{m.desc}</Text>
                    </View>
                    {profile.finance_mode === m.value && <Ionicons name="checkmark-circle" size={20} color={theme.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            </SectionCard>

            <SectionCard titulo="Notificações">
              <ToggleRow icon="calendar" label="Lembrete de vencimentos"
                desc="Notificar antes de contas vencerem"
                value={profile.notify_due_dates} onChange={v => update('notify_due_dates', v)} />
              <ToggleRow icon="bar-chart" label="Resumo semanal"
                desc="Receber resumo financeiro toda semana"
                value={profile.notify_weekly_summary} onChange={v => update('notify_weekly_summary', v)} />
              <ToggleRow icon="megaphone" label="Novidades"
                desc="Novas funcionalidades e dicas"
                value={profile.notify_news} onChange={v => update('notify_news', v)} />
              <ToggleRow icon="notifications" label="Push notifications"
                desc="Notificações no celular"
                value={profile.push_notifications_enabled} onChange={v => update('push_notifications_enabled', v)} />
            </SectionCard>
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  )
}

function ToggleRow({ icon, label, desc, value, onChange }: {
  icon: string; label: string; desc: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <View style={tr.row}>
      <Ionicons name={icon as any} size={18} color={theme.primary} />
      <View style={{ flex: 1 }}>
        <Text style={tr.label}>{label}</Text>
        <Text style={tr.desc}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.primary }} thumbColor="#fff" />
    </View>
  )
}

const tr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
  label: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  desc: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
})

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.surface, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  heroIcone: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  heroTitulo: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  heroDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  themeRow: { flexDirection: 'row', gap: 8, padding: 14 },
  themeBtn: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface },
  themeBtnAtivo: { backgroundColor: theme.primary, borderColor: theme.primary },
  themeText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  modeCol: { padding: 10, gap: 8 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface },
  modeBtnAtivo: { borderColor: theme.primary, backgroundColor: '#f0fdf4' },
  modeIcone: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  modeLabel: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  modeDesc: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
})
