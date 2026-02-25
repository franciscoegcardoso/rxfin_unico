// app/minha-conta/index.tsx
import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Switch, ActivityIndicator, Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { theme } from '../../src/lib/theme'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']
type Aba = 'perfil' | 'workspace' | 'seguranca' | 'assinatura' | 'preferencias'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Profile {
  full_name: string
  email: string
  birth_date: string
  account_type: 'individual' | 'shared'
  notify_due_dates: boolean
  notify_weekly_summary: boolean
  notify_news: boolean
  marketing_opt_in: boolean
  theme_preference: 'light' | 'dark' | 'system'
}

interface SharedPerson {
  id: string
  name: string
  email: string | null
  is_owner: boolean
}

interface Workspace {
  id: string
  name: string
  plan_name: string
  plan_slug: string
  plan_expires_at: string | null
}

interface Plan {
  id: string
  name: string
  slug: string
  price_monthly: number
  price_yearly: number
  highlight_label: string | null
  checkout_url: string | null
}

const DEFAULT_PROFILE: Profile = {
  full_name: '', email: '', birth_date: '',
  account_type: 'individual',
  notify_due_dates: false, notify_weekly_summary: false,
  notify_news: false, marketing_opt_in: true,
  theme_preference: 'system',
}

// ─── Sub-componentes utilitários ──────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: IoniconsName; title: string }) {
  return (
    <View style={u.sectionHeader}>
      <View style={u.sectionIcone}>
        <Ionicons name={icon} size={15} color={theme.primary} />
      </View>
      <Text style={u.sectionTitulo}>{title}</Text>
    </View>
  )
}

function Campo({
  label, value, placeholder, onChangeText, editable = true,
  keyboardType = 'default', secureTextEntry = false,
}: {
  label: string; value: string; placeholder?: string
  onChangeText?: (v: string) => void; editable?: boolean
  keyboardType?: 'default' | 'email-address'; secureTextEntry?: boolean
}) {
  return (
    <View style={u.campo}>
      <Text style={u.campoLabel}>{label}</Text>
      {editable ? (
        <TextInput
          style={u.campoInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
        />
      ) : (
        <View style={u.campoReadonly}>
          <Text style={{ color: theme.textMuted, fontSize: 14 }}>{value || '—'}</Text>
        </View>
      )}
    </View>
  )
}

function ToggleRow({
  icon, label, descricao, value, onValueChange,
}: {
  icon: IoniconsName; label: string; descricao?: string
  value: boolean; onValueChange: (v: boolean) => void
}) {
  return (
    <View style={u.toggleRow}>
      <View style={u.toggleIcone}>
        <Ionicons name={icon} size={15} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={u.toggleLabel}>{label}</Text>
        {descricao ? <Text style={u.toggleDesc}>{descricao}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.primary + '80' }}
        thumbColor={value ? theme.primary : theme.surfaceHigh}
      />
    </View>
  )
}

function EditActions({
  onCancel, onSave, saving,
}: { onCancel: () => void; onSave: () => void; saving: boolean }) {
  return (
    <View style={u.editActions}>
      <TouchableOpacity style={u.btnCancelar} onPress={onCancel}>
        <Ionicons name="close-outline" size={16} color={theme.textMuted} />
        <Text style={u.btnCancelarText}>Cancelar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[u.btnSalvar, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
        {saving
          ? <ActivityIndicator size="small" color="#fff" />
          : <Ionicons name="checkmark-outline" size={16} color="#fff" />}
        <Text style={u.btnSalvarText}>Salvar</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Abas ─────────────────────────────────────────────────────────────────────

function AbaPeril({ profile, onUpdated }: { profile: Profile; onUpdated: () => void }) {
  const [editando, setEditando] = useState(false)
  const [editData, setEditData] = useState(profile)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setEditData(profile) }, [profile])

  function iniciais() {
    const p = profile.full_name?.trim().split(' ') ?? []
    if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase()
    if (p.length === 1 && p[0]) return p[0][0].toUpperCase()
    return '?'
  }

  async function salvar() {
    if (!editData.full_name.trim()) {
      Alert.alert('Atenção', 'O nome completo é obrigatório.')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setSaving(false)

    const { error } = await supabase.from('profiles')
      .update({ full_name: editData.full_name.trim(), birth_date: editData.birth_date || null })
      .eq('id', user.id)

    setSaving(false)
    if (error) { Alert.alert('Erro', 'Não foi possível salvar.') }
    else { setEditando(false); onUpdated(); Alert.alert('Sucesso', 'Informações atualizadas!') }
  }

  return (
    <View style={{ gap: 12 }}>
      {/* Avatar */}
      <View style={s.heroCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{iniciais()}</Text>
        </View>
        <Text style={s.heroNome}>{profile.full_name || 'Sem nome'}</Text>
        <Text style={s.heroEmail}>{profile.email}</Text>
        <View style={s.heroBadge}>
          <Ionicons name="person-outline" size={11} color={theme.primary} />
          <Text style={s.heroBadgeText}>
            {profile.account_type === 'shared' ? 'Conta Compartilhada' : 'Conta Individual'}
          </Text>
        </View>
      </View>

      {/* Dados */}
      <View style={s.card}>
        <View style={s.cardHeaderRow}>
          <SectionHeader icon="person-circle-outline" title="Informações Pessoais" />
          {!editando && (
            <TouchableOpacity style={s.editBtn} onPress={() => { setEditData(profile); setEditando(true) }}>
              <Ionicons name="pencil-outline" size={13} color={theme.primary} />
              <Text style={s.editBtnText}>Editar</Text>
            </TouchableOpacity>
          )}
        </View>
        <Campo label="Nome Completo" value={editando ? editData.full_name : profile.full_name}
          placeholder="Seu nome" onChangeText={v => setEditData(p => ({ ...p, full_name: v }))} editable={editando} />
        <Campo label="E-mail" value={profile.email} editable={false} />
        <Campo label="Data de Nascimento" placeholder="AAAA-MM-DD"
          value={editando ? editData.birth_date : (profile.birth_date
            ? new Date(profile.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '')}
          onChangeText={v => setEditData(p => ({ ...p, birth_date: v }))} editable={editando} />
        {editando && (
          <EditActions onCancel={() => setEditando(false)} onSave={salvar} saving={saving} />
        )}
      </View>
    </View>
  )
}

function AbaWorkspace({
  profile, pessoas, onUpdated,
}: { profile: Profile; pessoas: SharedPerson[]; onUpdated: () => void }) {
  const [saving, setSaving] = useState(false)
  const [accountType, setAccountType] = useState<'individual' | 'shared'>(profile.account_type)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => { setAccountType(profile.account_type) }, [profile.account_type])

  async function salvarTipoConta(tipo: 'individual' | 'shared') {
    setAccountType(tipo)
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setSaving(false)
    await supabase.from('profiles').update({ account_type: tipo }).eq('id', user.id)
    setSaving(false)
    onUpdated()
  }

  async function adicionarPessoa() {
    if (!novoNome.trim()) { Alert.alert('Atenção', 'Informe o nome.'); return }
    if (pessoas.length >= 5) { Alert.alert('Limite', 'Máximo de 5 pessoas.'); return }
    setAddLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setAddLoading(false)

    await supabase.from('user_shared_persons').insert({
      user_id: user.id,
      name: novoNome.trim(),
      email: novoEmail.trim() || null,
      is_owner: false,
    })
    setAddLoading(false)
    setNovoNome(''); setNovoEmail(''); setAdicionando(false)
    onUpdated()
  }

  async function removerPessoa(id: string) {
    Alert.alert('Remover', 'Deseja remover esta pessoa?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive', onPress: async () => {
          await supabase.from('user_shared_persons').delete().eq('id', id)
          onUpdated()
        },
      },
    ])
  }

  return (
    <View style={{ gap: 12 }}>
      {/* Tipo de conta */}
      <View style={s.card}>
        <View style={{ marginBottom: 14 }}>
          <SectionHeader icon="people-outline" title="Tipo de Conta" />
          <Text style={s.cardDesc}>Configure como você usa o RXFin</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['individual', 'shared'] as const).map((tipo) => {
            const ativo = accountType === tipo
            return (
              <TouchableOpacity
                key={tipo}
                style={[s.tipoBtn, ativo && s.tipoBtnAtivo]}
                onPress={() => salvarTipoConta(tipo)}
                disabled={saving}
              >
                <View style={[s.tipoIcone, ativo && { backgroundColor: theme.primary + '20' }]}>
                  <Ionicons
                    name={tipo === 'individual' ? 'person-outline' : 'people-outline'}
                    size={22}
                    color={ativo ? theme.primary : theme.textMuted}
                  />
                </View>
                <Text style={[s.tipoLabel, ativo && { color: theme.primary }]}>
                  {tipo === 'individual' ? 'Individual' : 'Compartilhado'}
                </Text>
                <Text style={s.tipoDesc}>
                  {tipo === 'individual' ? 'Só eu uso' : 'Divido com alguém'}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Pessoas compartilhadas */}
      {accountType === 'shared' && (
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <SectionHeader icon="person-add-outline" title="Pessoas" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.contadorText}>{pessoas.length}/5</Text>
              {pessoas.length < 5 && !adicionando && (
                <TouchableOpacity style={s.editBtn} onPress={() => setAdicionando(true)}>
                  <Ionicons name="add-outline" size={14} color={theme.primary} />
                  <Text style={s.editBtnText}>Adicionar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Form adicionar */}
          {adicionando && (
            <View style={s.addForm}>
              <Campo label="Nome" value={novoNome} placeholder="Nome da pessoa"
                onChangeText={setNovoNome} />
              <Campo label="E-mail (opcional)" value={novoEmail} placeholder="email@exemplo.com"
                onChangeText={setNovoEmail} keyboardType="email-address" />
              <EditActions
                onCancel={() => { setAdicionando(false); setNovoNome(''); setNovoEmail('') }}
                onSave={adicionarPessoa}
                saving={addLoading}
              />
            </View>
          )}

          {/* Lista */}
          {pessoas.map((p, i) => (
            <View key={p.id} style={[s.pessoaRow, i < pessoas.length - 1 && u.divider]}>
              <View style={s.pessoaAvatar}>
                <Text style={s.pessoaAvatarText}>{p.name[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.pessoaNome}>{p.name}</Text>
                  {p.is_owner && (
                    <View style={s.ownerBadge}>
                      <Ionicons name="shield-checkmark-outline" size={10} color={theme.primary} />
                      <Text style={s.ownerText}>Proprietário</Text>
                    </View>
                  )}
                </View>
                {p.email ? <Text style={s.pessoaEmail}>{p.email}</Text> : null}
              </View>
              {!p.is_owner && (
                <TouchableOpacity onPress={() => removerPessoa(p.id)} style={s.removeBtn}>
                  <Ionicons name="close-circle-outline" size={20} color={theme.expense} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {pessoas.length === 0 && (
            <Text style={s.emptyText}>Nenhuma pessoa adicionada ainda.</Text>
          )}
        </View>
      )}
    </View>
  )
}

function AbaSeguranca() {
  const [trocando, setTrocando] = useState(false)
  const [senhaData, setSenhaData] = useState({ nova: '', confirmar: '' })
  const [saving, setSaving] = useState(false)

  async function trocarSenha() {
    if (senhaData.nova.length < 6) { Alert.alert('Atenção', 'Mínimo 6 caracteres.'); return }
    if (senhaData.nova !== senhaData.confirmar) { Alert.alert('Atenção', 'As senhas não coincidem.'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: senhaData.nova })
    setSaving(false)
    if (error) { Alert.alert('Erro', error.message) }
    else {
      Alert.alert('Sucesso', 'Senha alterada com sucesso!')
      setTrocando(false); setSenhaData({ nova: '', confirmar: '' })
    }
  }

  return (
    <View style={{ gap: 12 }}>
      {/* Senha */}
      <View style={s.card}>
        <View style={s.cardHeaderRow}>
          <SectionHeader icon="lock-closed-outline" title="Senha" />
          {!trocando && (
            <TouchableOpacity style={s.editBtn} onPress={() => setTrocando(true)}>
              <Ionicons name="key-outline" size={13} color={theme.primary} />
              <Text style={s.editBtnText}>Alterar</Text>
            </TouchableOpacity>
          )}
        </View>
        {!trocando ? (
          <View style={u.campoReadonly}>
            <Text style={{ color: theme.textMuted, fontSize: 14, letterSpacing: 3 }}>••••••••</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Campo label="Nova Senha" value={senhaData.nova} placeholder="Mínimo 6 caracteres"
              onChangeText={v => setSenhaData(p => ({ ...p, nova: v }))} secureTextEntry />
            <Campo label="Confirmar Nova Senha" value={senhaData.confirmar} placeholder="Repita a senha"
              onChangeText={v => setSenhaData(p => ({ ...p, confirmar: v }))} secureTextEntry />
            <EditActions
              onCancel={() => { setTrocando(false); setSenhaData({ nova: '', confirmar: '' }) }}
              onSave={trocarSenha}
              saving={saving}
            />
          </View>
        )}
      </View>

      {/* Sessões / segurança info */}
      <View style={s.card}>
        <SectionHeader icon="shield-outline" title="Dicas de Segurança" />
        {[
          { icon: 'checkmark-circle-outline' as IoniconsName, text: 'Use uma senha forte com letras, números e símbolos' },
          { icon: 'checkmark-circle-outline' as IoniconsName, text: 'Nunca compartilhe sua senha com ninguém' },
          { icon: 'checkmark-circle-outline' as IoniconsName, text: 'Saia da conta em dispositivos compartilhados' },
        ].map((d, i) => (
          <View key={i} style={[s.dicaRow, i > 0 && { marginTop: 8 }]}>
            <Ionicons name={d.icon} size={16} color={theme.primary} />
            <Text style={s.dicaText}>{d.text}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function AbaAssinatura({ workspace }: { workspace: Workspace | null }) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('subscription_plans')
      .select('id, name, slug, price_monthly, price_yearly, highlight_label, checkout_url')
      .not('slug', 'eq', 'sem_cadastro')
      .order('order_index')
      .then(({ data }) => {
        if (data) setPlans(data as Plan[])
        setLoading(false)
      })
  }, [])

  function formatPrice(v: number) {
    return v === 0 ? 'Grátis' : `R$ ${v.toFixed(2).replace('.', ',')}`
  }

  function isPlanoAtual(slug: string) {
    return workspace?.plan_slug === slug
  }

  function handleAssinar(plan: Plan) {
    if (!plan.checkout_url) {
      Alert.alert('Em breve', 'Link de checkout disponível em breve.')
      return
    }
    Alert.alert(
      `Assinar ${plan.name}`,
      `Você será redirecionado para a página de pagamento.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', onPress: () => Linking.openURL(plan.checkout_url!) },
      ]
    )
  }

  const expiresAt = workspace?.plan_expires_at
    ? new Date(workspace.plan_expires_at).toLocaleDateString('pt-BR')
    : null

  return (
    <View style={{ gap: 12 }}>
      {/* Banner plano atual */}
      <View style={s.card}>
        <SectionHeader icon="diamond-outline" title="Plano Atual" />
        <View style={s.planoBannerContent}>
          <View style={s.planoBannerInfo}>
            <Text style={s.planoNomeAtual}>{workspace?.plan_name ?? '—'}</Text>
            {expiresAt && (
              <Text style={s.planoExpira}>Válido até {expiresAt}</Text>
            )}
          </View>
          <View style={[s.planoBadge,
            workspace?.plan_slug === 'pro' && { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
            <Text style={[s.planoBadgeText,
              workspace?.plan_slug === 'pro' && { color: '#92400e' }]}>
              {workspace?.plan_slug?.toUpperCase() ?? 'FREE'}
            </Text>
          </View>
        </View>
      </View>

      {/* Cards de planos */}
      {loading ? (
        <View style={[s.card, { alignItems: 'center', paddingVertical: 24 }]}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        plans.filter(p => p.slug !== 'sem_cadastro').map((plan) => {
          const atual = isPlanoAtual(plan.slug)
          return (
            <View key={plan.id} style={[s.card, atual && s.cardDestaque]}>
              <View style={s.planoCardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.planoCardNome}>{plan.name}</Text>
                    {plan.highlight_label ? (
                      <View style={s.highlightBadge}>
                        <Text style={s.highlightText}>{plan.highlight_label}</Text>
                      </View>
                    ) : null}
                    {atual && (
                      <View style={s.atualBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={theme.primary} />
                        <Text style={s.atualText}>Atual</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.planoPreco}>{formatPrice(plan.price_monthly)}
                    {plan.price_monthly > 0 && <Text style={s.planoPeriodo}>/mês</Text>}
                  </Text>
                  {plan.price_yearly > 0 && (
                    <Text style={s.planoAnual}>
                      ou {formatPrice(plan.price_yearly)}/ano
                    </Text>
                  )}
                </View>
              </View>
              {!atual && (
                <TouchableOpacity
                  style={[s.assinarBtn, plan.slug === 'free' && s.assinarBtnOutline]}
                  onPress={() => handleAssinar(plan)}
                >
                  <Text style={[s.assinarBtnText, plan.slug === 'free' && { color: theme.primary }]}>
                    {plan.slug === 'free' ? 'Plano Gratuito' : `Assinar ${plan.name}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )
        })
      )}
    </View>
  )
}

function AbaPreferencias({ profile, onUpdated }: { profile: Profile; onUpdated: () => void }) {
  async function toggle(campo: keyof Profile, valor: boolean) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ [campo]: valor }).eq('id', user.id)
    onUpdated()
  }

  return (
    <View style={{ gap: 12 }}>
      {/* Notificações */}
      <View style={s.card}>
        <View style={{ marginBottom: 12 }}>
          <SectionHeader icon="notifications-outline" title="Notificações" />
        </View>
        <ToggleRow icon="calendar-outline" label="Vencimentos"
          descricao="Alertas de contas a pagar/receber"
          value={profile.notify_due_dates}
          onValueChange={v => toggle('notify_due_dates', v)} />
        <View style={u.divider} />
        <ToggleRow icon="bar-chart-outline" label="Resumo Semanal"
          descricao="Panorama financeiro toda segunda"
          value={profile.notify_weekly_summary}
          onValueChange={v => toggle('notify_weekly_summary', v)} />
        <View style={u.divider} />
        <ToggleRow icon="megaphone-outline" label="Novidades"
          descricao="Novas funcionalidades e atualizações"
          value={profile.notify_news}
          onValueChange={v => toggle('notify_news', v)} />
        <View style={u.divider} />
        <ToggleRow icon="mail-outline" label="E-mails de Marketing"
          descricao="Dicas financeiras e promoções"
          value={profile.marketing_opt_in}
          onValueChange={v => toggle('marketing_opt_in', v)} />
      </View>

      {/* Legal */}
      <View style={s.card}>
        <SectionHeader icon="document-text-outline" title="Legal" />
        <View style={{ marginTop: 8 }}>
          {[
            { label: 'Termos de Uso' },
            { label: 'Política de Privacidade' },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[s.legalItem, i < arr.length - 1 && u.divider]}
              onPress={() => Alert.alert('Em breve', `${item.label} disponível em breve.`)}
            >
              <Text style={s.legalLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  )
}

// ─── Tela principal ───────────────────────────────────────────────────────────

const ABAS: { id: Aba; label: string; icon: IoniconsName }[] = [
  { id: 'perfil',       label: 'Perfil',      icon: 'person-outline' },
  { id: 'workspace',    label: 'Workspace',   icon: 'people-outline' },
  { id: 'seguranca',    label: 'Segurança',   icon: 'lock-closed-outline' },
  { id: 'assinatura',   label: 'Assinatura',  icon: 'diamond-outline' },
  { id: 'preferencias', label: 'Preferências', icon: 'settings-outline' },
]

export default function MinhaContaScreen() {
  const [loading, setLoading] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<Aba>('perfil')
  const [profile, setProfile] = useState<Profile>({ ...DEFAULT_PROFILE })
  const [pessoas, setPessoas] = useState<SharedPerson[]>([])
  const [workspace, setWorkspace] = useState<Workspace | null>(null)

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: prof }, { data: pes }, { data: ws }] = await Promise.all([
      supabase.from('profiles')
        .select('full_name, email, birth_date, account_type, notify_due_dates, notify_weekly_summary, notify_news, marketing_opt_in, theme_preference')
        .eq('id', user.id).single(),
      supabase.from('user_shared_persons')
        .select('id, name, email, is_owner')
        .eq('user_id', user.id)
        .order('is_owner', { ascending: false }),
      supabase.from('workspaces')
        .select('id, name, plan_expires_at, subscription_plans(name, slug)')
        .eq('owner_id', user.id)
        .single(),
    ])

    if (prof) {
      setProfile({
        full_name: prof.full_name ?? '',
        email: prof.email ?? user.email ?? '',
        birth_date: prof.birth_date ?? '',
        account_type: (prof.account_type as Profile['account_type']) ?? 'individual',
        notify_due_dates: prof.notify_due_dates ?? false,
        notify_weekly_summary: prof.notify_weekly_summary ?? false,
        notify_news: prof.notify_news ?? false,
        marketing_opt_in: prof.marketing_opt_in ?? true,
        theme_preference: (prof.theme_preference as Profile['theme_preference']) ?? 'system',
      })
    }

    if (pes) setPessoas(pes as SharedPerson[])

    if (ws) {
      const sp = ws.subscription_plans as any
      setWorkspace({
        id: ws.id,
        name: ws.name,
        plan_name: sp?.name ?? 'Free',
        plan_slug: sp?.slug ?? 'free',
        plan_expires_at: ws.plan_expires_at,
      })
    }

    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function handleLogout() {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    )
  }

  return (
    <View style={s.container}>

      {/* Navbar */}
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
          <Ionicons name="chevron-back" size={22} color={theme.primary} />
        </TouchableOpacity>
        <Text style={s.navTitulo}>Minha Conta</Text>
        <TouchableOpacity onPress={handleLogout} style={s.navBack}>
          <Ionicons name="log-out-outline" size={20} color={theme.expense} />
        </TouchableOpacity>
      </View>

      {/* Abas — scroll horizontal */}
      <View style={s.abasContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.abasScroll}>
          {ABAS.map((aba) => {
            const ativa = abaAtiva === aba.id
            return (
              <TouchableOpacity
                key={aba.id}
                style={[s.abaBtn, ativa && s.abaBtnAtiva]}
                onPress={() => setAbaAtiva(aba.id)}
              >
                <Ionicons name={aba.icon} size={14} color={ativa ? theme.primary : theme.textMuted} />
                <Text style={[s.abaLabel, ativa && s.abaLabelAtiva]}>{aba.label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Conteúdo da aba */}
      <ScrollView contentContainerStyle={s.content}>
        {abaAtiva === 'perfil' && (
          <AbaPeril profile={profile} onUpdated={carregar} />
        )}
        {abaAtiva === 'workspace' && (
          <AbaWorkspace profile={profile} pessoas={pessoas} onUpdated={carregar} />
        )}
        {abaAtiva === 'seguranca' && (
          <AbaSeguranca />
        )}
        {abaAtiva === 'assinatura' && (
          <AbaAssinatura workspace={workspace} />
        )}
        {abaAtiva === 'preferencias' && (
          <AbaPreferencias profile={profile} onUpdated={carregar} />
        )}

        <Text style={s.versao}>RXFin v1.1.0</Text>
      </ScrollView>
    </View>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

// Utilitários compartilhados entre sub-componentes
const u = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIcone: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  sectionTitulo: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
  campo: { marginBottom: 10 },
  campoLabel: { fontSize: 12, fontWeight: '600', color: theme.textMuted, marginBottom: 4 },
  campoInput: { backgroundColor: theme.surfaceHigh, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.textPrimary },
  campoReadonly: { backgroundColor: theme.surfaceHigh, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 42, justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  toggleIcone: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  toggleDesc: { fontSize: 11, color: theme.textMuted, marginTop: 1 },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnCancelar: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingVertical: 11, backgroundColor: theme.surface },
  btnCancelarText: { fontSize: 14, fontWeight: '600', color: theme.textMuted },
  btnSalvar: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 11 },
  btnSalvarText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  divider: { borderBottomWidth: 1, borderBottomColor: theme.border },
})

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },

  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  navBack: { width: 36, height: 36, justifyContent: 'center' },
  navTitulo: { fontSize: 18, fontWeight: 'bold', color: theme.textPrimary },

  abasContainer: { backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  abasScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  abaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: theme.surfaceHigh, borderWidth: 1, borderColor: theme.border },
  abaBtnAtiva: { backgroundColor: theme.primary + '15', borderColor: theme.primary },
  abaLabel: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  abaLabelAtiva: { color: theme.primary },

  content: { padding: 16, paddingBottom: 48, gap: 12 },

  // Hero
  heroCard: { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: theme.primary + '20', borderWidth: 2, borderColor: theme.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: theme.primary },
  heroNome: { fontSize: 17, fontWeight: 'bold', color: theme.textPrimary },
  heroEmail: { fontSize: 12, color: theme.textMuted, marginTop: 2, marginBottom: 10 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  heroBadgeText: { fontSize: 11, fontWeight: '600', color: theme.primary },

  // Card
  card: { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16 },
  cardDestaque: { borderColor: theme.primary, borderWidth: 2 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardDesc: { fontSize: 12, color: theme.textMuted, marginTop: 4, marginLeft: 36 },

  // Edit btn
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  editBtnText: { fontSize: 12, fontWeight: '600', color: theme.primary },

  // Workspace - tipo de conta
  tipoBtn: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surfaceHigh, gap: 6 },
  tipoBtnAtivo: { borderColor: theme.primary, backgroundColor: theme.primary + '08' },
  tipoIcone: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.surfaceHigh, justifyContent: 'center', alignItems: 'center' },
  tipoLabel: { fontSize: 13, fontWeight: '700', color: theme.textPrimary },
  tipoDesc: { fontSize: 11, color: theme.textMuted },

  // Pessoas
  addForm: { backgroundColor: theme.surfaceHigh, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  pessoaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  pessoaAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primary + '20', justifyContent: 'center', alignItems: 'center' },
  pessoaAvatarText: { fontSize: 15, fontWeight: 'bold', color: theme.primary },
  pessoaNome: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  pessoaEmail: { fontSize: 11, color: theme.textMuted, marginTop: 1 },
  ownerBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ownerText: { fontSize: 9, fontWeight: '700', color: theme.primary },
  removeBtn: { padding: 4 },
  contadorText: { fontSize: 12, color: theme.textMuted, fontWeight: '600' },
  emptyText: { fontSize: 13, color: theme.textMuted, textAlign: 'center', paddingVertical: 12, fontStyle: 'italic' },

  // Segurança
  dicaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12 },
  dicaText: { flex: 1, fontSize: 13, color: theme.textMuted, lineHeight: 18 },

  // Assinatura
  planoBannerContent: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  planoBannerInfo: { flex: 1 },
  planoNomeAtual: { fontSize: 16, fontWeight: 'bold', color: theme.textPrimary },
  planoExpira: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  planoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#bbf7d0' },
  planoBadgeText: { fontSize: 11, fontWeight: '700', color: theme.primary },
  planoCardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  planoCardNome: { fontSize: 16, fontWeight: 'bold', color: theme.textPrimary },
  planoPreco: { fontSize: 22, fontWeight: 'bold', color: theme.primary, marginTop: 6 },
  planoPeriodo: { fontSize: 14, fontWeight: '400', color: theme.textMuted },
  planoAnual: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  highlightBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#fde68a' },
  highlightText: { fontSize: 9, fontWeight: '700', color: '#92400e' },
  atualBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  atualText: { fontSize: 9, fontWeight: '700', color: theme.primary },
  assinarBtn: { marginTop: 14, backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  assinarBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.primary },
  assinarBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Legal
  legalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13 },
  legalLabel: { fontSize: 14, color: theme.textPrimary, fontWeight: '500' },

  versao: { color: theme.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 },
})