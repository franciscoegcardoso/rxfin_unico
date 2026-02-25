import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'

interface Meta {
  id: string; categoria: string; valor_meta: number; valor_gasto: number; percentual: number
}

function formatBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

function corBarra(p: number) {
  if (p >= 100) return theme.expense
  if (p >= 80) return theme.warning
  return theme.income
}

export default function OrcamentoScreen() {
  const [metas, setMetas] = useState<Meta[]>([])
  const [loading, setLoading] = useState(true)
  const [totalMeta, setTotalMeta] = useState(0)
  const [totalGasto, setTotalGasto] = useState(0)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const mesAtual = new Date().toISOString().slice(0, 7)
      const { data: pacotes } = await supabase
        .from('budget_packages')
        .select('id, name, budget_amount')
        .eq('user_id', user.id)
        .eq('reference_month', mesAtual)
        .limit(20)
      if (pacotes?.length) {
        const ids = pacotes.map(p => p.id)
        const { data: links } = await supabase.from('budget_package_transactions').select('package_id, amount').in('package_id', ids)
        const gastos: Record<string, number> = {}
        links?.forEach(t => { gastos[t.package_id] = (gastos[t.package_id] ?? 0) + Number(t.amount ?? 0) })
        const m = pacotes.map(p => {
          const g = gastos[p.id] ?? 0
          const meta = Number(p.budget_amount ?? 0)
          return { id: p.id, categoria: p.name, valor_meta: meta, valor_gasto: g, percentual: meta > 0 ? Math.min((g / meta) * 100, 100) : 0 }
        }).sort((a, b) => b.percentual - a.percentual)
        setMetas(m)
        setTotalMeta(m.reduce((a, x) => a + x.valor_meta, 0))
        setTotalGasto(m.reduce((a, x) => a + x.valor_gasto, 0))
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const pTotal = totalMeta > 0 ? Math.min((totalGasto / totalMeta) * 100, 100) : 0
  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <Text style={styles.navTitulo}>Planejar</Text>
        <Text style={styles.navSub}>{mes}</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.primary} /></View>
      ) : metas.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="pie-chart-outline" size={48} color={theme.textMuted} />
          <Text style={styles.emptyTitulo}>Nenhum orçamento configurado</Text>
          <Text style={styles.emptySub}>Configure categorias de orçamento na versão web</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>

          {/* Card total */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={styles.cardTitulo}>Total do mês</Text>
              <Text style={[styles.percentual, { color: corBarra(pTotal) }]}>{pTotal.toFixed(0)}%</Text>
            </View>
            <View style={styles.barraFundo}>
              <View style={[styles.barraProg, { width: `${pTotal}%` as any, backgroundColor: corBarra(pTotal) }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={styles.barraLabel}>{formatBRL(totalGasto)} gastos</Text>
              <Text style={styles.barraLabelMuted}>limite {formatBRL(totalMeta)}</Text>
            </View>
          </View>

          {/* Cards categorias */}
          {metas.map(m => (
            <View key={m.id} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={styles.catNome}>{m.categoria}</Text>
                <Text style={[styles.percentual, { color: corBarra(m.percentual) }]}>{m.percentual.toFixed(0)}%</Text>
              </View>
              <View style={styles.barraFundo}>
                <View style={[styles.barraProg, { width: `${m.percentual}%` as any, backgroundColor: corBarra(m.percentual) }]} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={styles.barraLabel}>{formatBRL(m.valor_gasto)}</Text>
                <Text style={styles.barraLabelMuted}>limite {formatBRL(m.valor_meta)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  navbar: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  navTitulo: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  navSub: { fontSize: 13, color: theme.textMuted, marginTop: 2, textTransform: 'capitalize' },
  lista: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: theme.surface, borderRadius: 16, padding: 18, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  cardTitulo: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
  catNome: { fontSize: 14, fontWeight: '500', color: theme.textPrimary, flex: 1 },
  percentual: { fontSize: 13, fontWeight: '700' },
  barraFundo: { height: 8, backgroundColor: theme.bg, borderRadius: 4, overflow: 'hidden' },
  barraProg: { height: 8, borderRadius: 4 },
  barraLabel: { color: theme.textSecondary, fontSize: 12 },
  barraLabelMuted: { color: theme.textMuted, fontSize: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyTitulo: { color: theme.textSecondary, fontSize: 15, fontWeight: '600' },
  emptySub: { color: theme.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
})