import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { router } from 'expo-router'
import { theme } from '@/lib/theme'

interface Profile {
  full_name: string
  email: string
  phone: string | null
  birth_date: string | null
  created_at: string
  push_notifications_enabled: boolean
  notify_due_dates: boolean
  notify_weekly_summary: boolean
  onboarding_completed: boolean
  finance_mode: string | null
  account_type: string | null
}

export default function PerfilScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, phone, birth_date, created_at, push_notifications_enabled, notify_due_dates, notify_weekly_summary, onboarding_completed, finance_mode, account_type')
        .eq('id', user.id)
        .single()

      if (error) console.error('Perfil error:', error)
      setProfile(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/(auth)/login')
        }
      },
    ])
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    )
  }

  const iniciais = profile?.full_name
    ?.split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('') ?? '?'

  const membroDesde = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '—'

  const nascimento = profile?.birth_date
    ? new Date(profile.birth_date).toLocaleDateString('pt-BR')
    : 'Não informado'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{iniciais}</Text>
        </View>
        <Text style={styles.nome}>{profile?.full_name ?? '—'}</Text>
        <Text style={styles.email}>{profile?.email ?? '—'}</Text>
        <Text style={styles.membro}>Membro desde {membroDesde}</Text>
      </View>

      {/* Dados pessoais */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DADOS PESSOAIS</Text>
        <InfoRow icon="person-outline" label="Nome" value={profile?.full_name ?? '—'} />
        <InfoRow icon="mail-outline" label="Email" value={profile?.email ?? '—'} />
        <InfoRow icon="call-outline" label="Telefone" value={profile?.phone ?? 'Não informado'} />
        <InfoRow icon="calendar-outline" label="Nascimento" value={nascimento} />
        <InfoRow icon="briefcase-outline" label="Modo financeiro" value={profile?.finance_mode ?? 'Padrão'} />
      </View>

      {/* Notificações */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NOTIFICAÇÕES</Text>
        <NotifRow label="Push ativas" ativo={profile?.push_notifications_enabled ?? false} />
        <NotifRow label="Vencimentos" ativo={profile?.notify_due_dates ?? false} />
        <NotifRow label="Resumo semanal" ativo={profile?.notify_weekly_summary ?? false} />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={theme.expense} />
        <Text style={styles.logoutText}>Encerrar sessão</Text>
      </TouchableOpacity>

    </ScrollView>
  )
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={18} color={theme.primary} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  )
}

function NotifRow({ label, ativo }: { label: string; ativo: boolean }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons
          name={ativo ? 'notifications' : 'notifications-off-outline'}
          size={18}
          color={ativo ? theme.primary : theme.textMuted}
        />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: ativo ? '#052e16' : theme.surfaceHigh }]}>
        <Text style={[styles.badgeText, { color: ativo ? theme.income : theme.textMuted }]}>
          {ativo ? 'Ativo' : 'Inativo'}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  nome: { color: theme.textPrimary, fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  email: { color: theme.textSecondary, fontSize: 14, marginBottom: 4 },
  membro: { color: theme.textMuted, fontSize: 12 },
  section: { marginBottom: 24 },
  sectionTitle: { color: theme.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: theme.border },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { color: theme.textSecondary, fontSize: 14 },
  infoValue: { color: theme.textPrimary, fontSize: 14, maxWidth: 180, textAlign: 'right' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 12, padding: 16, marginTop: 8, borderWidth: 1, borderColor: theme.border },
  logoutText: { color: theme.expense, fontSize: 15, fontWeight: '600' },
})