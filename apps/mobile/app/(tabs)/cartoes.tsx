import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native'
import { supabase } from '@/lib/supabase'

interface Fatura {
  id: string
  cartao: string
  mes: string
  total: number
  status: string
  vencimento: string | null
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function CartoesScreen() {
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFaturas()
  }, [])

  async function loadFaturas() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('credit_card_bills')
        .select('id, billing_month, status, closing_date, total_amount, card_id')
        .eq('user_id', user.id)
        .order('billing_month', { ascending: false })
        .limit(12)

      if (data && data.length > 0) {
        setFaturas(data.map(f => ({
          id: f.id,
          cartao: f.card_id ?? 'Cartão',
          mes: f.billing_month,
          total: Number(f.total_amount ?? 0),
          status: f.status ?? 'open',
          vencimento: f.closing_date,
        })))
      } else {
        // Fallback: agrupar credit_card_transactions por mês
        const { data: txs } = await supabase
          .from('credit_card_transactions')
          .select('id, amount, transaction_date, card_id')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false })
          .limit(100)

        if (txs) {
          const porMes: Record<string, number> = {}
          txs.forEach(t => {
            const mes = t.transaction_date?.slice(0, 7) ?? 'unknown'
            porMes[mes] = (porMes[mes] ?? 0) + Number(t.amount ?? 0)
          })
          setFaturas(Object.entries(porMes).map(([mes, total], i) => ({
            id: String(i),
            cartao: 'Cartão',
            mes,
            total,
            status: 'open',
            vencimento: null,
          })))
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const statusCor = (s: string) => s === 'paid' ? '#4ade80' : s === 'overdue' ? '#f87171' : '#facc15'
  const statusLabel = (s: string) => s === 'paid' ? 'Paga' : s === 'overdue' ? 'Vencida' : 'Aberta'

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cartões</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#6366f1" />
        </View>
      ) : faturas.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nenhuma fatura encontrada</Text>
          <Text style={styles.emptyHint}>Conecte seu cartão na versão web</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {faturas.map(f => (
            <View key={f.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardMes}>{f.mes}</Text>
                <View style={[styles.badge, { backgroundColor: statusCor(f.status) + '22' }]}>
                  <Text style={[styles.badgeText, { color: statusCor(f.status) }]}>
                    {statusLabel(f.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardTotal}>{formatBRL(f.total)}</Text>
              {f.vencimento && (
                <Text style={styles.cardVenc}>Vence em {f.vencimento}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  lista: { padding: 24, paddingBottom: 40 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardMes: { color: '#94a3b8', fontSize: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardTotal: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  cardVenc: { color: '#475569', fontSize: 12, marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { color: '#64748b', fontSize: 14 },
  emptyHint: { color: '#475569', fontSize: 12 },
})