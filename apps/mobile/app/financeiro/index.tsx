import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking, Share, TextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { theme } from '../../src/lib/theme'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']
type Aba = 'planos' | 'pagamentos' | 'indicacao'

interface Plan {
  id: string
  name: string
  slug: string
  price_monthly: number
  price_yearly: number
  description: string
  features: string[]
  allowed_pages: string[]
  highlight_label: string | null
  has_promo: boolean
  checkout_url: string | null
}

interface Workspace {
  id: string
  plan_name: string
  plan_slug: string
  plan_expires_at: string | null
}

interface Referral {
  id: string
  referred_name: string
  referred_email: string
  status: string
  created_at: string
}

const ABAS: { id: Aba; label: string; icon: IoniconsName }[] = [
  { id: 'planos',     label: 'Planos',        icon: 'diamond-outline' },
  { id: 'pagamentos', label: 'Pagamentos',     icon: 'card-outline' },
  { id: 'indicacao',  label: 'Indique & Ganhe', icon: 'gift-outline' },
]

const PLAN_ICONS: Record<string, IoniconsName> = {
  free: 'star-outline',
  starter: 'flash-outline',
  pro: 'rocket-outline',
}

const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280',
  starter: '#f59e0b',
  pro: theme.primary,
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

// ─── Aba Planos ───────────────────────────────────────────────────────────────

function AbaPlanos({ workspace, email }: { workspace: Workspace | null; email: string }) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('subscription_plans')
      .select('id, name, slug, price_monthly, price_yearly, description, features, allowed_pages, highlight_label, has_promo, checkout_url')
      .not('slug', 'eq', 'sem_cadastro')
      .order('order_index')
      .then(({ data }) => {
        if (data) setPlans(data as Plan[])
        setLoading(false)
      })
  }, [])

  function assinar(plan: Plan) {
    if (!plan.checkout_url) {
      Alert.alert('Em breve', 'Link de pagamento disponível em breve.')
      return
    }
    const url = plan.checkout_url + (email ? `?email=${encodeURIComponent(email)}` : '')
    Alert.alert(
      `Assinar ${plan.name}`,
      `Você será redirecionado para a página de pagamento.\n\nApós assinar, retorne ao app para atualizar seu plano.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', onPress: () => Linking.openURL(url) },
      ]
    )
  }

  function cancelar() {
    Alert.alert(
      'Cancelar Assinatura',
      'Para cancelar sua assinatura, entre em contato com nosso suporte.',
      [
        { text: 'Fechar', style: 'cancel' },
        { text: 'Enviar E-mail', onPress: () => Linking.openURL('mailto:contato@rxfin.com.br') },
      ]
    )
  }

  if (loading) return (
    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
      <ActivityIndicator color={theme.primary} />
    </View>
  )

  return (
    <View style={{ gap: 12 }}>
      {/* Banner plano atual */}
      <View style={p.bannerCard}>
        <View style={{ flex: 1 }}>
          <Text style={p.bannerLabel}>Seu Plano Atual</Text>
          <Text style={p.bannerNome}>{workspace?.plan_name ?? 'Free'}</Text>
          {workspace?.plan_expires_at && (
            <Text style={p.bannerExpira}>
              Válido até {formatData(workspace.plan_expires_at)}
            </Text>
          )}
        </View>
        <View style={[p.planoBadge, { backgroundColor: (PLAN_COLORS[workspace?.plan_slug ?? 'free']) + '20' }]}>
          <Ionicons
            name={PLAN_ICONS[workspace?.plan_slug ?? 'free'] ?? 'star-outline'}
            size={22}
            color={PLAN_COLORS[workspace?.plan_slug ?? 'free']}
          />
        </View>
      </View>

      {/* Trust badges */}
      <View style={p.trustRow}>
        {[
          { icon: 'shield-checkmark-outline' as IoniconsName, text: 'Pagamento seguro' },
          { icon: 'refresh-outline' as IoniconsName, text: 'Cancele quando quiser' },
          { icon: 'time-outline' as IoniconsName, text: '7 dias grátis' },
        ].map(b => (
          <View key={b.text} style={p.trustItem}>
            <Ionicons name={b.icon} size={14} color={theme.primary} />
            <Text style={p.trustText}>{b.text}</Text>
          </View>
        ))}
      </View>

      {/* Cards de planos */}
      {plans.filter(pl => pl.slug !== 'free').map((plan) => {
        const atual = workspace?.plan_slug === plan.slug
        const cor = PLAN_COLORS[plan.slug] ?? theme.primary
        const isPro = plan.slug === 'pro'

        return (
          <View key={plan.id} style={[p.planCard, atual && p.planCardAtual, isPro && { borderColor: cor, borderWidth: 2 }]}>
            {/* Badge popular/recomendado */}
            {plan.highlight_label ? (
              <View style={[p.highlightBadge, { backgroundColor: cor + '20', borderColor: cor + '40' }]}>
                <Ionicons name="star-outline" size={10} color={cor} />
                <Text style={[p.highlightText, { color: cor }]}>{plan.highlight_label}</Text>
              </View>
            ) : null}

            {atual && (
              <View style={p.atualBadge}>
                <Ionicons name="checkmark-circle" size={12} color={theme.primary} />
                <Text style={p.atualText}>Plano Atual</Text>
              </View>
            )}

            <View style={p.planHeader}>
              <View style={[p.planIcone, { backgroundColor: cor + '20' }]}>
                <Ionicons name={PLAN_ICONS[plan.slug] ?? 'diamond-outline'} size={22} color={cor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={p.planNome}>{plan.name}</Text>
                <Text style={p.planDesc}>{plan.description}</Text>
              </View>
            </View>

            {/* Preço */}
            <View style={p.precoBox}>
              <View style={{ alignItems: 'center' }}>
                <Text style={p.precoLabel}>Mensal</Text>
                <Text style={[p.precoValor, { color: cor }]}>
                  {plan.price_monthly === 0 ? 'Grátis' : formatBRL(plan.price_monthly)}
                </Text>
                {plan.price_monthly > 0 && <Text style={p.precoPeriodo}>/mês</Text>}
              </View>
              {plan.price_yearly > 0 && (
                <>
                  <View style={p.precoDivider} />
                  <View style={{ alignItems: 'center' }}>
                    <Text style={p.precoLabel}>Anual</Text>
                    <Text style={[p.precoValor, { color: cor, fontSize: 18 }]}>{formatBRL(plan.price_yearly)}</Text>
                    <Text style={p.precoPeriodo}>
                      {formatBRL(plan.price_yearly / 12)}/mês
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Features */}
            {plan.features && plan.features.length > 0 && (
              <View style={p.features}>
                {plan.features.map((f, i) => (
                  <View key={i} style={p.featureRow}>
                    <View style={[p.featureCheck, { backgroundColor: cor + '20' }]}>
                      <Ionicons name="checkmark" size={11} color={cor} />
                    </View>
                    <Text style={p.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Módulos */}
            <View style={p.modulosRow}>
              <Ionicons name="apps-outline" size={13} color={theme.textMuted} />
              <Text style={p.modulosText}>
                {plan.allowed_pages.includes('*')
                  ? '✨ Acesso completo'
                  : `${plan.allowed_pages.length} módulos inclusos`}
              </Text>
            </View>

            {/* Botão */}
            {atual ? (
              <View style={[p.btnAtual]}>
                <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
                <Text style={p.btnAtualText}>Seu plano atual</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[p.btnAssinar, { backgroundColor: cor }]}
                onPress={() => assinar(plan)}
              >
                <Ionicons name="flash-outline" size={16} color="#fff" />
                <Text style={p.btnAssinarText}>
                  {plan.price_monthly === 0 ? 'Começar Grátis' : 'Assinar Agora'}
                </Text>
              </TouchableOpacity>
            )}

            {plan.price_monthly > 0 && !atual && (
              <Text style={p.trial}>● 7 dias grátis para testar</Text>
            )}
          </View>
        )
      })}

      {/* Free sempre no fim */}
      {plans.filter(pl => pl.slug === 'free').map(plan => {
        const atual = workspace?.plan_slug === plan.slug
        return (
          <View key={plan.id} style={[p.planCard, { opacity: 0.7 }]}>
            <View style={p.planHeader}>
              <View style={[p.planIcone, { backgroundColor: '#f3f4f6' }]}>
                <Ionicons name="star-outline" size={20} color="#6b7280" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={p.planNome}>{plan.name}</Text>
                <Text style={p.planDesc}>{plan.description}</Text>
              </View>
              {atual && (
                <View style={p.atualBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={theme.primary} />
                  <Text style={p.atualText}>Atual</Text>
                </View>
              )}
            </View>
            <Text style={[p.precoValor, { color: '#6b7280', textAlign: 'center', marginVertical: 8 }]}>Gratuito</Text>
          </View>
        )
      })}

      {/* CTA cancelar */}
      {workspace?.plan_slug !== 'free' && (
        <TouchableOpacity style={p.cancelarBtn} onPress={cancelar}>
          <Text style={p.cancelarText}>Cancelar assinatura</Text>
        </TouchableOpacity>
      )}

      {/* Dúvidas */}
      <View style={p.duvidasCard}>
        <Ionicons name="help-circle-outline" size={18} color={theme.primary} />
        <View style={{ flex: 1 }}>
          <Text style={p.duvidasTitulo}>Ainda tem dúvidas?</Text>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:contato@rxfin.com.br')}>
            <Text style={p.duvidasLink}>contato@rxfin.com.br</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

// ─── Aba Pagamentos ───────────────────────────────────────────────────────────

function AbaPagamentos({ workspace }: { workspace: Workspace | null }) {
  return (
    <View style={{ gap: 12 }}>
      {/* Resumo */}
      <View style={pg.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <View style={pg.secIcone}>
            <Ionicons name="card-outline" size={15} color={theme.primary} />
          </View>
          <Text style={pg.secTitulo}>Status da Assinatura</Text>
        </View>

        <View style={pg.statusRow}>
          <View style={pg.statusItem}>
            <Text style={pg.statusLabel}>Plano</Text>
            <Text style={pg.statusValor}>{workspace?.plan_name ?? 'Free'}</Text>
          </View>
          <View style={pg.statusDivider} />
          <View style={pg.statusItem}>
            <Text style={pg.statusLabel}>Status</Text>
            <View style={pg.ativoBadge}>
              <View style={pg.ativoDot} />
              <Text style={pg.ativoText}>Ativo</Text>
            </View>
          </View>
          <View style={pg.statusDivider} />
          <View style={pg.statusItem}>
            <Text style={pg.statusLabel}>Validade</Text>
            <Text style={pg.statusValor}>
              {workspace?.plan_expires_at
                ? formatData(workspace.plan_expires_at)
                : '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Histórico vazio */}
      <View style={pg.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <View style={pg.secIcone}>
            <Ionicons name="receipt-outline" size={15} color={theme.primary} />
          </View>
          <Text style={pg.secTitulo}>Histórico de Pagamentos</Text>
        </View>

        <View style={pg.emptyArea}>
          <Ionicons name="receipt-outline" size={36} color={theme.textMuted} />
          <Text style={pg.emptyTitulo}>Nenhum pagamento registrado</Text>
          <Text style={pg.emptyDesc}>
            Seu histórico de cobranças aparecerá aqui após a primeira transação.
          </Text>
        </View>
      </View>

      {/* Gerenciar via portal */}
      <TouchableOpacity
        style={pg.portalBtn}
        onPress={() => Linking.openURL('https://app.rxfin.com.br/planos')}
      >
        <Ionicons name="open-outline" size={16} color={theme.primary} />
        <Text style={pg.portalText}>Gerenciar assinatura no site</Text>
        <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
      </TouchableOpacity>
    </View>
  )
}

// ─── Aba Indique & Ganhe ──────────────────────────────────────────────────────

function AbaIndicacao({ userId, userEmail, userName }: { userId: string; userEmail: string; userName: string }) {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const codigoIndicacao = userId.slice(0, 8).toUpperCase()
  const linkIndicacao = `https://app.rxfin.com.br/signup?ref=${codigoIndicacao}`

  useEffect(() => {
    supabase.from('affiliate_referrals')
      .select('*')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReferrals((data ?? []) as Referral[])
        setLoading(false)
      })
  }, [userId])

  async function compartilhar() {
    try {
      await Share.share({
        message: `🚀 Use o RXFin para organizar suas finanças!\n\nCrie sua conta grátis com meu link e ganhe recursos extras:\n${linkIndicacao}`,
        title: 'Indique o RXFin',
      })
    } catch (_) {}
  }

  function copiarLink() {
    Alert.alert('Link copiado!', linkIndicacao)
  }

  const pendentes = referrals.filter(r => r.status === 'pending').length
  const convertidos = referrals.filter(r => r.status === 'converted').length

  return (
    <View style={{ gap: 12 }}>
      {/* Hero */}
      <View style={ind.heroCard}>
        <View style={ind.heroIcone}>
          <Ionicons name="gift-outline" size={32} color={theme.primary} />
        </View>
        <Text style={ind.heroTitulo}>Indique & Ganhe</Text>
        <Text style={ind.heroDesc}>
          Indique amigos para o RXFin e ganhe benefícios exclusivos quando eles assinarem um plano pago.
        </Text>
      </View>

      {/* Link de indicação */}
      <View style={ind.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <View style={ind.secIcone}>
            <Ionicons name="link-outline" size={15} color={theme.primary} />
          </View>
          <Text style={ind.secTitulo}>Seu Link de Indicação</Text>
        </View>

        <View style={ind.codigoRow}>
          <View style={ind.codigoCaixa}>
            <Text style={ind.codigoLabel}>Código:</Text>
            <Text style={ind.codigoValor}>{codigoIndicacao}</Text>
          </View>
        </View>

        <View style={ind.linkBox}>
          <Text style={ind.linkText} numberOfLines={1}>{linkIndicacao}</Text>
          <TouchableOpacity onPress={copiarLink} style={ind.copyBtn}>
            <Ionicons name="copy-outline" size={16} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={ind.compartilharBtn} onPress={compartilhar}>
          <Ionicons name="share-social-outline" size={18} color="#fff" />
          <Text style={ind.compartilharText}>Compartilhar Link</Text>
        </TouchableOpacity>
      </View>

      {/* Estatísticas */}
      <View style={ind.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <View style={ind.secIcone}>
            <Ionicons name="bar-chart-outline" size={15} color={theme.primary} />
          </View>
          <Text style={ind.secTitulo}>Suas Indicações</Text>
        </View>

        <View style={ind.statsRow}>
          <View style={ind.statItem}>
            <Text style={ind.statValor}>{referrals.length}</Text>
            <Text style={ind.statLabel}>Total</Text>
          </View>
          <View style={ind.statDivider} />
          <View style={ind.statItem}>
            <Text style={[ind.statValor, { color: '#f59e0b' }]}>{pendentes}</Text>
            <Text style={ind.statLabel}>Pendentes</Text>
          </View>
          <View style={ind.statDivider} />
          <View style={ind.statItem}>
            <Text style={[ind.statValor, { color: theme.primary }]}>{convertidos}</Text>
            <Text style={ind.statLabel}>Convertidos</Text>
          </View>
        </View>
      </View>

      {/* Lista de indicações */}
      {loading ? (
        <View style={{ alignItems: 'center', padding: 20 }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : referrals.length > 0 ? (
        <View style={ind.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <View style={ind.secIcone}>
              <Ionicons name="people-outline" size={15} color={theme.primary} />
            </View>
            <Text style={ind.secTitulo}>Histórico</Text>
          </View>
          {referrals.map((r, i) => (
            <View key={r.id} style={[ind.referralRow, i < referrals.length - 1 && ind.referralBorder]}>
              <View style={ind.referralAvatar}>
                <Text style={ind.referralAvatarText}>{r.referred_name[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ind.referralNome}>{r.referred_name}</Text>
                <Text style={ind.referralEmail}>{r.referred_email}</Text>
              </View>
              <View style={[ind.statusBadge,
                r.status === 'converted' && { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
                r.status === 'pending' && { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
              ]}>
                <Text style={[ind.statusText,
                  r.status === 'converted' && { color: theme.primary },
                  r.status === 'pending' && { color: '#92400e' },
                ]}>
                  {r.status === 'converted' ? 'Convertido' : 'Pendente'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={ind.card}>
          <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
            <Ionicons name="people-outline" size={36} color={theme.textMuted} />
            <Text style={ind.secTitulo}>Nenhuma indicação ainda</Text>
            <Text style={{ fontSize: 13, color: theme.textMuted, textAlign: 'center' }}>
              Compartilhe seu link e comece a indicar amigos!
            </Text>
          </View>
        </View>
      )}

      {/* Como funciona */}
      <View style={ind.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <View style={ind.secIcone}>
            <Ionicons name="help-circle-outline" size={15} color={theme.primary} />
          </View>
          <Text style={ind.secTitulo}>Como funciona</Text>
        </View>
        {[
          { n: '1', text: 'Compartilhe seu link ou código de indicação com amigos' },
          { n: '2', text: 'Seu amigo cria uma conta usando seu link' },
          { n: '3', text: 'Quando ele assinar um plano pago, você ganha benefícios' },
        ].map(step => (
          <View key={step.n} style={ind.stepRow}>
            <View style={ind.stepNum}>
              <Text style={ind.stepNumText}>{step.n}</Text>
            </View>
            <Text style={ind.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function FinanceiroScreen() {
  const [loading, setLoading] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<Aba>('planos')
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserId(user.id)
    setUserEmail(user.email ?? '')

    const [{ data: prof }, { data: ws }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('workspaces')
        .select('id, plan_expires_at, subscription_plans(name, slug)')
        .eq('owner_id', user.id).single(),
    ])

    if (prof) setUserName((prof as any).full_name ?? '')
    if (ws) {
      const sp = (ws as any).subscription_plans
      setWorkspace({
        id: ws.id,
        plan_name: sp?.name ?? 'Free',
        plan_slug: sp?.slug ?? 'free',
        plan_expires_at: ws.plan_expires_at,
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

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
        <Text style={s.navTitulo}>Financeiro</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Abas */}
      <View style={s.abasContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.abasScroll}>
          {ABAS.map(aba => {
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

      <ScrollView contentContainerStyle={s.content}>
        {abaAtiva === 'planos' && (
          <AbaPlanos workspace={workspace} email={userEmail} />
        )}
        {abaAtiva === 'pagamentos' && (
          <AbaPagamentos workspace={workspace} />
        )}
        {abaAtiva === 'indicacao' && (
          <AbaIndicacao userId={userId} userEmail={userEmail} userName={userName} />
        )}
      </ScrollView>
    </View>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

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
  content: { padding: 14, paddingBottom: 48, gap: 12 },
})

// Planos
const p = StyleSheet.create({
  bannerCard: { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  bannerNome: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary, marginTop: 2 },
  bannerExpira: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  planoBadge: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  trustRow: { flexDirection: 'row', gap: 8 },
  trustItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 8, justifyContent: 'center' },
  trustText: { fontSize: 10, color: theme.textMuted, fontWeight: '600', flex: 1 },
  planCard: { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16 },
  planCardAtual: { borderColor: theme.primary, borderWidth: 2 },
  highlightBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start', marginBottom: 10 },
  highlightText: { fontSize: 10, fontWeight: '700' },
  atualBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-end', marginBottom: 6 },
  atualText: { fontSize: 10, fontWeight: '700', color: theme.primary },
  planHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  planIcone: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  planNome: { fontSize: 17, fontWeight: 'bold', color: theme.textPrimary },
  planDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  precoBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: theme.surfaceHigh, borderRadius: 12, padding: 14, marginBottom: 14 },
  precoLabel: { fontSize: 10, color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 3 },
  precoValor: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary },
  precoPeriodo: { fontSize: 11, color: theme.textMuted },
  precoDivider: { width: 1, height: 40, backgroundColor: theme.border },
  features: { gap: 8, marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureCheck: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  featureText: { fontSize: 13, color: theme.textPrimary, flex: 1 },
  modulosRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border, marginBottom: 12 },
  modulosText: { fontSize: 12, color: theme.textMuted },
  btnAssinar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 12, paddingVertical: 13 },
  btnAssinarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnAtual: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.primary, borderRadius: 12, paddingVertical: 12 },
  btnAtualText: { fontSize: 14, fontWeight: '600', color: theme.primary },
  trial: { fontSize: 11, color: theme.primary, textAlign: 'center', marginTop: 8 },
  cancelarBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelarText: { fontSize: 13, color: theme.expense, textDecorationLine: 'underline' },
  duvidasCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: theme.primary + '10', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.primary + '30' },
  duvidasTitulo: { fontSize: 13, fontWeight: '700', color: theme.textPrimary },
  duvidasLink: { fontSize: 12, color: theme.primary, textDecorationLine: 'underline', marginTop: 2 },
})

// Pagamentos
const pg = StyleSheet.create({
  card: { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16 },
  secIcone: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  secTitulo: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statusItem: { alignItems: 'center', gap: 4 },
  statusDivider: { width: 1, height: 36, backgroundColor: theme.border },
  statusLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '600' },
  statusValor: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
  ativoBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  ativoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary },
  ativoText: { fontSize: 12, fontWeight: '700', color: theme.primary },
  emptyArea: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyTitulo: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
  emptyDesc: { fontSize: 12, color: theme.textMuted, textAlign: 'center', lineHeight: 17 },
  portalBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 14 },
  portalText: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.primary },
})

// Indicação
const ind = StyleSheet.create({
  heroCard: { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 24, alignItems: 'center', gap: 8 },
  heroIcone: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  heroTitulo: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  heroDesc: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 18 },
  card: { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16 },
  secIcone: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  secTitulo: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
  codigoRow: { marginBottom: 10 },
  codigoCaixa: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surfaceHigh, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.border },
  codigoLabel: { fontSize: 12, color: theme.textMuted, fontWeight: '600' },
  codigoValor: { fontSize: 20, fontWeight: 'bold', color: theme.primary, letterSpacing: 2 },
  linkBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceHigh, borderRadius: 10, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, gap: 8 },
  linkText: { flex: 1, fontSize: 12, color: theme.textMuted },
  copyBtn: { padding: 4 },
  compartilharBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 13 },
  compartilharText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: theme.border },
  statValor: { fontSize: 26, fontWeight: 'bold', color: theme.textPrimary },
  statLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '600' },
  referralRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 10 },
  referralBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  referralAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primary + '20', justifyContent: 'center', alignItems: 'center' },
  referralAvatarText: { fontSize: 14, fontWeight: 'bold', color: theme.primary },
  referralNome: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },
  referralEmail: { fontSize: 11, color: theme.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, backgroundColor: theme.surfaceHigh, borderColor: theme.border },
  statusText: { fontSize: 10, fontWeight: '700', color: theme.textMuted },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: theme.primary + '20', justifyContent: 'center', alignItems: 'center' },
  stepNumText: { fontSize: 13, fontWeight: 'bold', color: theme.primary },
  stepText: { flex: 1, fontSize: 13, color: theme.textMuted, lineHeight: 18, marginTop: 3 },
})