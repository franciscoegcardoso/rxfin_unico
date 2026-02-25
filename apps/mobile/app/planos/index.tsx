import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { theme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

interface Plan {
  id: string; name: string; slug: string; description: string | null
  price_monthly: number; price_yearly: number; features: any
  is_public: boolean; order_index: number; highlight_label: string | null
  checkout_url: string | null; has_promo: boolean
  original_price_monthly: number | null
}

interface UserPlan {
  planSlug: string; planName: string; expiresAt: string | null
}

export default function PlanosScreen() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const { data: p } = await supabase.from('subscription_plans').select('*')
        .eq('is_active', true).eq('is_public', true).order('order_index')
      setPlans(p ?? [])

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: ws } = await supabase.from('workspaces')
          .select('plan_id, plan_expires_at, subscription_plans(name, slug)')
          .eq('owner_id', user.id).single()
        if (ws?.subscription_plans) {
          const sp = ws.subscription_plans as any
          setUserPlan({ planSlug: sp.slug, planName: sp.name, expiresAt: ws.plan_expires_at })
        }
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  return (
    <ScreenLayout titulo="Planos">
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroCard}>
          <Text style={s.heroEmoji}>💎</Text>
          <Text style={s.heroTitulo}>Escolha seu plano</Text>
          {userPlan && (
            <View style={s.currentBadge}>
              <Ionicons name="checkmark-circle" size={14} color={theme.income} />
              <Text style={s.currentText}>Plano atual: {userPlan.planName}</Text>
            </View>
          )}
        </View>

        {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> : (
          <View style={s.planCol}>
            {plans.map(plan => {
              const isActive = userPlan?.planSlug === plan.slug
              const features = Array.isArray(plan.features) ? plan.features : []
              return (
                <View key={plan.id} style={[s.planCard, isActive && s.planCardAtivo,
                  plan.highlight_label && s.planCardDestaque]}>
                  {plan.highlight_label && (
                    <View style={s.highlight}>
                      <Text style={s.highlightText}>{plan.highlight_label}</Text>
                    </View>
                  )}
                  <Text style={s.planNome}>{plan.name}</Text>
                  {plan.description && <Text style={s.planDesc}>{plan.description}</Text>}
                  <View style={s.precoRow}>
                    {plan.has_promo && plan.original_price_monthly ? (
                      <Text style={s.precoDe}>R$ {plan.original_price_monthly.toFixed(2)}</Text>
                    ) : null}
                    <Text style={s.precoValor}>
                      {plan.price_monthly > 0 ? formatBRL(plan.price_monthly) : 'Grátis'}
                    </Text>
                    {plan.price_monthly > 0 && <Text style={s.precoSub}>/mês</Text>}
                  </View>

                  {features.length > 0 && (
                    <View style={s.featuresList}>
                      {features.map((f: string, i: number) => (
                        <View key={i} style={s.featureRow}>
                          <Ionicons name="checkmark" size={14} color={theme.income} />
                          <Text style={s.featureText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {isActive ? (
                    <View style={s.ativoBtn}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.income} />
                      <Text style={s.ativoBtnText}>Plano atual</Text>
                    </View>
                  ) : plan.checkout_url ? (
                    <TouchableOpacity style={s.assinarBtn} onPress={() => Linking.openURL(plan.checkout_url!)}>
                      <Text style={s.assinarText}>
                        {plan.price_monthly > 0 ? 'Assinar' : 'Começar grátis'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )
            })}
          </View>
        )}

        <View style={s.infoCard}>
          <Ionicons name="information-circle-outline" size={16} color={theme.primary} />
          <Text style={s.infoText}>
            Pagamento seguro via Pagar.me. Cancele quando quiser. Sem fidelidade.
          </Text>
        </View>
      </ScrollView>
    </ScreenLayout>
  )
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  heroCard: { backgroundColor: theme.surface, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  heroEmoji: { fontSize: 32, marginBottom: 4 },
  heroTitulo: { fontSize: 18, fontWeight: '700', color: theme.textPrimary },
  currentBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#dcfce7', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginTop: 10 },
  currentText: { fontSize: 12, fontWeight: '600', color: theme.income },
  planCol: { gap: 12 },
  planCard: { backgroundColor: theme.surface, borderRadius: 20, padding: 20, borderWidth: 1.5, borderColor: theme.border },
  planCardAtivo: { borderColor: theme.income, borderWidth: 2 },
  planCardDestaque: { borderColor: theme.primary, borderWidth: 2 },
  highlight: { position: 'absolute', top: -10, alignSelf: 'center', backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 4 },
  highlightText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  planNome: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginTop: 4 },
  planDesc: { fontSize: 12, color: theme.textMuted, marginTop: 4 },
  precoRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 12 },
  precoDe: { fontSize: 14, color: theme.textMuted, textDecorationLine: 'line-through' },
  precoValor: { fontSize: 28, fontWeight: '700', color: theme.primary },
  precoSub: { fontSize: 12, color: theme.textMuted },
  featuresList: { marginTop: 14, gap: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 13, color: theme.textSecondary },
  ativoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#dcfce7' },
  ativoBtnText: { fontSize: 14, fontWeight: '600', color: theme.income },
  assinarBtn: { alignItems: 'center', marginTop: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: theme.primary },
  assinarText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, marginTop: 16 },
  infoText: { fontSize: 11, color: theme.primary, flex: 1, lineHeight: 16 },
})
