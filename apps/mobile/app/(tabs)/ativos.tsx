import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'

interface Ativo {
  id: string; ticker: string; nome: string; tipo: string
  quantidade: number; preco_medio: number; valor_atual: number; rentabilidade: number
}

function formatBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

function iconeAtivo(tipo: string): any {
  const t = tipo?.toLowerCase() ?? ''
  if (t.includes('acao') || t.includes('ação') || t.includes('stock')) return 'bar-chart'
  if (t.includes('fii') || t.includes('fundo')) return 'business'
  if (t.includes('renda') || t.includes('fixed') || t.includes('cdb')) return 'shield-checkmark'
  if (t.includes('crypto')) return 'logo-bitcoin'
  return 'trending-up'
}

export default function AtivosScreen() {
  const [ativos, setAtivos] = useState<Ativo[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [rentTotal, setRentTotal] = useState(0)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('user_assets')
        .select('id, ticker, name, asset_type, quantity, average_price, current_price')
        .eq('user_id', user.id)
        .order('current_price', { ascending: false })
        .limit(50)
      if (data?.length) {
        const list = data.map(a => {
          const va = Number(a.current_price ?? 0) * Number(a.quantity ?? 0)
          const vi = Number(a.average_price ?? 0) * Number(a.quantity ?? 0)
          return { id: a.id, ticker: a.ticker ?? '—', nome: a.name ?? a.ticker ?? '—', tipo: a.asset_type ?? 'outros', quantidade: Number(a.quantity ?? 0), preco_medio: Number(a.average_price ?? 0), valor_atual: va, rentabilidade: vi > 0 ? ((va - vi) / vi) * 100 : 0 }
        })
        setAtivos(list)
        const t = list.reduce((a, x) => a + x.valor_atual, 0)
        const ti = list.reduce((a, x) => a + x.preco_medio * x.quantidade, 0)
        setTotal(t)
        setRentTotal(ti > 0 ? ((t - ti) / ti) * 100 : 0)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <Text style={styles.navTitulo}>Patrimônio</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.primary} /></View>
      ) : ativos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="trending-up-outline" size={48} color={theme.textMuted} />
          <Text style={styles.emptyTitulo}>Nenhum ativo cadastrado</Text>
          <Text style={styles.emptySub}>Adicione seus investimentos na versão web</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>

          {/* Card patrimônio total */}
          <View style={styles.patrimonioCard}>
            <Text style={styles.patrimonioLabel}>Patrimônio total</Text>
            <Text style={styles.patrimonioValor}>{formatBRL(total)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={rentTotal >= 0 ? 'trending-up' : 'trending-down'} size={16} color={rentTotal >= 0 ? theme.income : theme.expense} />
              <Text style={{ color: rentTotal >= 0 ? theme.income : theme.expense, fontSize: 13, fontWeight: '600' }}>
                {rentTotal >= 0 ? '+' : ''}{rentTotal.toFixed(2)}% rentabilidade total
              </Text>
            </View>
          </View>

          {/* Lista de ativos */}
          {ativos.map(a => (
            <View key={a.id} style={styles.ativoCard}>
              <View style={styles.ativoIcone}>
                <Ionicons name={iconeAtivo(a.tipo)} size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ativoTicker}>{a.ticker}</Text>
                <Text style={styles.ativoNome} numberOfLines={1}>{a.nome}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.ativoValor}>{formatBRL(a.valor_atual)}</Text>
                <Text style={[styles.ativoRent, { color: a.rentabilidade >= 0 ? theme.income : theme.expense }]}>
                  {a.rentabilidade >= 0 ? '+' : ''}{a.rentabilidade.toFixed(2)}%
                </Text>
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
  lista: { padding: 16, paddingBottom: 40 },
  patrimonioCard: { backgroundColor: theme.primary, borderRadius: 20, padding: 24, marginBottom: 16, alignItems: 'center' },
  patrimonioLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 6 },
  patrimonioValor: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  ativoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: theme.border },
  ativoIcone: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surfaceHigh, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  ativoTicker: { color: theme.textPrimary, fontSize: 14, fontWeight: '700' },
  ativoNome: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  ativoValor: { color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
  ativoRent: { fontSize: 12, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyTitulo: { color: theme.textSecondary, fontSize: 15, fontWeight: '600' },
  emptySub: { color: theme.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
})