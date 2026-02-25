import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { VictoryPie } from 'victory-native'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { theme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

const SW = Dimensions.get('window').width

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

const CAT_CORES = ['#3b82f6','#f59e0b','#16a34a','#ef4444','#8b5cf6','#ec4899','#14b8a6','#6b7280']

interface Bill {
  id: string; card_name: string | null; closing_date: string; due_date: string
  total_value: number; status: string; billing_month: string
}

interface CcTx {
  store_name: string; value: number; category: string | null; transaction_date: string
}

export default function CartaoScreen() {
  const [bills, setBills] = useState<Bill[]>([])
  const [txs, setTxs] = useState<CcTx[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: b } = await supabase.from('credit_card_bills')
        .select('*').eq('user_id', user.id)
        .order('due_date', { ascending: false }).limit(12)
      setBills(b ?? [])

      // Last month transactions
      const mesAtual = new Date().toISOString().substring(0, 7)
      const { data: t } = await supabase.from('credit_card_transactions')
        .select('store_name, value, category, transaction_date')
        .eq('user_id', user.id)
        .gte('transaction_date', `${mesAtual}-01`)
        .order('transaction_date', { ascending: false }).limit(100)
      setTxs(t ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  // Stats
  const totalMes = txs.reduce((a, t) => a + t.value, 0)
  const byCategory: Record<string, number> = {}
  txs.forEach(t => {
    const cat = t.category || 'Outros'
    byCategory[cat] = (byCategory[cat] || 0) + t.value
  })
  const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  const pieData = catEntries.slice(0, 7).map(([cat, val], i) => ({
    x: cat, y: val, color: CAT_CORES[i % CAT_CORES.length],
  }))

  return (
    <ScreenLayout titulo="Cartão de Crédito">
      <ScrollView contentContainerStyle={st.content}>
        <View style={st.hero}>
          <View style={st.heroIcone}><Ionicons name="card" size={28} color={theme.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={st.heroTitulo}>Cartão de Crédito</Text>
            <Text style={st.heroDesc}>Acompanhe faturas, gastos por categoria e transações.</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : bills.length === 0 && txs.length === 0 ? (
          <EmptyState icon="card-outline" titulo="Sem dados de cartão" descricao="Conecte sua conta via Open Finance ou importe faturas." />
        ) : (
          <>
            {/* Total mês */}
            <View style={st.totalCard}>
              <Text style={st.totalLabel}>Gastos no mês</Text>
              <Text style={st.totalValor}>{formatBRL(totalMes)}</Text>
              <Text style={st.totalSub}>{txs.length} transações</Text>
            </View>

            {/* Gráfico por categoria */}
            {pieData.length > 0 && (
              <SectionCard titulo="Por categoria">
                <View style={{ alignItems: 'center' }}>
                  <VictoryPie data={pieData} x="x" y="y"
                    colorScale={pieData.map(d => d.color)}
                    innerRadius={45} labelRadius={({innerRadius}) => (Number(innerRadius)||45)+25}
                    style={{ labels: { fontSize: 8, fill: theme.textMuted } }}
                    width={SW - 64} height={180} padding={35}
                  />
                </View>
                <View style={st.legendCol}>
                  {catEntries.slice(0, 7).map(([cat, val], i) => (
                    <View key={cat} style={st.legendItem}>
                      <View style={[st.legendDot, { backgroundColor: CAT_CORES[i % CAT_CORES.length] }]} />
                      <Text style={st.legendText}>{cat}</Text>
                      <Text style={st.legendVal}>{formatBRL(val)}</Text>
                    </View>
                  ))}
                </View>
              </SectionCard>
            )}

            {/* Faturas */}
            {bills.length > 0 && (
              <SectionCard titulo="Faturas">
                {bills.slice(0, 6).map((b, i) => (
                  <View key={b.id} style={[st.billItem, i < Math.min(bills.length, 6) - 1 && st.billBorder]}>
                    <View style={[st.billDot, { backgroundColor: b.status === 'paid' ? theme.income : b.status === 'open' ? '#f59e0b' : theme.expense }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.billNome}>{b.card_name || 'Cartão'} — {b.billing_month || b.due_date?.substring(0,7)}</Text>
                      <Text style={st.billSub}>Vence {new Date(b.due_date+'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={st.billValor}>{formatBRL(b.total_value)}</Text>
                      <Text style={[st.billStatus, { color: b.status === 'paid' ? theme.income : '#f59e0b' }]}>
                        {b.status === 'paid' ? 'Paga' : b.status === 'open' ? 'Aberta' : 'Fechada'}
                      </Text>
                    </View>
                  </View>
                ))}
              </SectionCard>
            )}

            {/* Últimas transações */}
            {txs.length > 0 && (
              <SectionCard titulo="Últimas transações">
                {txs.slice(0, 15).map((t, i) => (
                  <View key={`${t.store_name}-${i}`} style={[st.txItem, i < 14 && st.txBorder]}>
                    <Text style={st.txNome} numberOfLines={1}>{t.store_name}</Text>
                    <Text style={st.txValor}>{formatBRL(t.value)}</Text>
                  </View>
                ))}
              </SectionCard>
            )}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  )
}

const st = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.surface, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  heroIcone: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  heroTitulo: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  heroDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  totalCard: { backgroundColor: theme.surface, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  totalLabel: { fontSize: 12, color: theme.textMuted },
  totalValor: { fontSize: 28, fontWeight: '700', color: theme.expense, marginTop: 4 },
  totalSub: { fontSize: 11, color: theme.textMuted, marginTop: 4 },
  legendCol: { paddingHorizontal: 16, paddingBottom: 12, gap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: theme.textSecondary, flex: 1 },
  legendVal: { fontSize: 12, fontWeight: '600', color: theme.textPrimary },
  billItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  billBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  billDot: { width: 8, height: 8, borderRadius: 4 },
  billNome: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },
  billSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  billValor: { fontSize: 14, fontWeight: '600', color: theme.expense },
  billStatus: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  txItem: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  txBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  txNome: { fontSize: 13, color: theme.textPrimary, flex: 1, marginRight: 8 },
  txValor: { fontSize: 13, fontWeight: '600', color: theme.expense },
})
