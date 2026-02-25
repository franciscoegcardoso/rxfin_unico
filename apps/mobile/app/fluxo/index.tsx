import { useEffect, useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, SectionList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDataLabel(d: string) {
  const hoje = new Date().toISOString().split('T')[0]
  const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (d === hoje) return 'Hoje'
  if (d === ontem) return 'Ontem'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const ANO_CURTO = String(new Date().getFullYear()).slice(2)
type Aba = 'geral' | 'pagar' | 'receber'

interface Tx { id: string; nome: string; valor: number; tipo: 'receita' | 'despesa'; data: string; categoria?: string }
interface Secao { title: string; data: Tx[] }

export default function FluxoFinanceiroScreen() {
  const mesAtual = new Date().getMonth()
  const [mes, setMes] = useState(mesAtual)
  const [ano] = useState(new Date().getFullYear())
  const [aba, setAba] = useState<Aba>('geral')
  const [txs, setTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [mes])

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const m = String(mes + 1).padStart(2, '0')
      const ultimo = new Date(ano, mes + 1, 0).getDate()
      const { data } = await supabase
        .from('pluggy_transactions')
        .select('id, description, amount, type, date, category')
        .eq('user_id', user.id)
        .gte('date', `${ano}-${m}-01`)
        .lte('date', `${ano}-${m}-${String(ultimo).padStart(2, '0')}`)
        .order('date', { ascending: false })
        .limit(300)
      setTxs(data?.map(t => ({
        id: t.id, nome: t.description ?? '—', valor: Number(t.amount),
        tipo: t.type === 'CREDIT' ? 'receita' : 'despesa',
        data: t.date, categoria: t.category ?? undefined,
      })) ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const rec = txs.filter(t => t.tipo === 'receita').reduce((a, t) => a + t.valor, 0)
  const des = txs.filter(t => t.tipo === 'despesa').reduce((a, t) => a + t.valor, 0)
  const saldo = rec - des

  const filtradas = useMemo(() => {
    if (aba === 'pagar') return txs.filter(t => t.tipo === 'despesa')
    if (aba === 'receber') return txs.filter(t => t.tipo === 'receita')
    return txs
  }, [txs, aba])

  const secoes = useMemo((): Secao[] => {
    const g: Record<string, Tx[]> = {}
    filtradas.forEach(t => { if (!g[t.data]) g[t.data] = []; g[t.data].push(t) })
    return Object.entries(g).sort(([a], [b]) => b.localeCompare(a)).map(([d, items]) => ({ title: formatDataLabel(d), data: items }))
  }, [filtradas])

  // Gastos por categoria
  const porCategoria = useMemo(() => {
    const map: Record<string, number> = {}
    txs.filter(t => t.tipo === 'despesa').forEach(t => {
      const c = t.categoria ?? 'Outros'
      map[c] = (map[c] ?? 0) + t.valor
    })
    return Object.entries(map).sort(([,a],[,b]) => b - a).slice(0, 5)
  }, [txs])

  return (
    <View style={styles.container}>

      {/* Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitulo}>Fluxo Financeiro</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Seletor de mês */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mesesScroll} contentContainerStyle={styles.mesesContent}>
        {MESES.map((m, i) => (
          <TouchableOpacity key={i} style={[styles.mesBt, mes === i && styles.mesBtAtivo]} onPress={() => setMes(i)}>
            <Text style={[styles.mesTx, mes === i && styles.mesTxAtivo]}>{m}{ANO_CURTO}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>

          {/* Cards resumo */}
          <View style={styles.resumoRow}>
            <View style={[styles.resumoCard, { borderTopColor: theme.income }]}>
              <Ionicons name="trending-up" size={18} color={theme.income} />
              <Text style={styles.resumoLabel}>Receitas</Text>
              <Text style={[styles.resumoValor, { color: theme.income }]}>{formatBRL(rec)}</Text>
            </View>
            <View style={[styles.resumoCard, { borderTopColor: theme.expense }]}>
              <Ionicons name="trending-down" size={18} color={theme.expense} />
              <Text style={styles.resumoLabel}>Despesas</Text>
              <Text style={[styles.resumoValor, { color: theme.expense }]}>{formatBRL(des)}</Text>
            </View>
            <View style={[styles.resumoCard, { borderTopColor: saldo >= 0 ? theme.income : theme.expense }]}>
              <Ionicons name="wallet-outline" size={18} color={saldo >= 0 ? theme.income : theme.expense} />
              <Text style={styles.resumoLabel}>Saldo</Text>
              <Text style={[styles.resumoValor, { color: saldo >= 0 ? theme.income : theme.expense }]}>{formatBRL(saldo)}</Text>
            </View>
          </View>

          {/* Top categorias */}
          {porCategoria.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>Top Categorias</Text>
              {porCategoria.map(([cat, val], i) => {
                const pct = des > 0 ? (val / des) * 100 : 0
                return (
                  <View key={i} style={styles.catRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={styles.catNome} numberOfLines={1}>{cat}</Text>
                        <Text style={styles.catValor}>{formatBRL(val)}</Text>
                      </View>
                      <View style={styles.barraFundo}>
                        <View style={[styles.barraProg, { width: `${pct}%` as any }]} />
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          )}

          {/* Abas */}
          <View style={styles.abas}>
            {([['geral','Geral'],['pagar','A Pagar'],['receber','A Receber']] as [Aba, string][]).map(([a, label]) => (
              <TouchableOpacity key={a} style={[styles.aba, aba === a && styles.abaAtiva]} onPress={() => setAba(a)}>
                <Text style={[styles.abaTx, aba === a && styles.abaTxAtiva]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Lista por data */}
          {secoes.length === 0 ? (
            <View style={[styles.center, { paddingTop: 40 }]}>
              <Ionicons name="receipt-outline" size={36} color={theme.textMuted} />
              <Text style={styles.vazio}>Nenhuma transação</Text>
            </View>
          ) : (
            secoes.map(s => (
              <View key={s.title}>
                <Text style={styles.secaoHeader}>{s.title}</Text>
                {s.data.map(t => (
                  <TouchableOpacity key={t.id} style={styles.item} onPress={() => router.push(`/transacao/${t.id}` as any)} activeOpacity={0.7}>
                    <View style={[styles.itemIcone, { backgroundColor: t.tipo === 'receita' ? '#dcfce7' : '#fee2e2' }]}>
                      <Ionicons name={t.tipo === 'receita' ? 'arrow-up' : 'arrow-down'} size={14} color={t.tipo === 'receita' ? theme.income : theme.expense} />
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.itemNome} numberOfLines={1}>{t.nome}</Text>
                      {t.categoria ? <Text style={styles.itemCat}>{t.categoria}</Text> : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.itemValor, { color: t.tipo === 'receita' ? theme.income : theme.expense }]}>
                        {t.tipo === 'receita' ? '+' : '-'}{formatBRL(t.valor)}
                      </Text>
                      <Ionicons name="chevron-forward" size={12} color={theme.textMuted} style={{ marginTop: 2 }} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  backBtn: { padding: 6, borderRadius: 20, backgroundColor: theme.bg },
  navTitulo: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
  mesesScroll: { flexGrow: 0, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  mesesContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  mesBt: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, minWidth: 64, alignItems: 'center' },
  mesBtAtivo: { backgroundColor: theme.primary, borderColor: theme.primary },
  mesTx: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
  mesTxAtivo: { color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  vazio: { color: theme.textMuted, fontSize: 14 },
  resumoRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  resumoCard: {
    flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: theme.border,
    borderTopWidth: 3, gap: 4,
  },
  resumoLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '600' },
  resumoValor: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  card: { backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  cardTitulo: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, marginBottom: 12 },
  catRow: { marginBottom: 10 },
  catNome: { color: theme.textSecondary, fontSize: 13, flex: 1, marginRight: 8 },
  catValor: { color: theme.textPrimary, fontSize: 13, fontWeight: '600' },
  barraFundo: { height: 6, backgroundColor: theme.bg, borderRadius: 3, overflow: 'hidden' },
  barraProg: { height: 6, backgroundColor: theme.primary, borderRadius: 3 },
  abas: { flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 12, padding: 4, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  aba: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  abaAtiva: { backgroundColor: theme.primary },
  abaTx: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  abaTxAtiva: { color: '#fff' },
  secaoHeader: { color: theme.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'capitalize', marginTop: 12, marginBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 12, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: theme.border },
  itemIcone: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemNome: { color: theme.textPrimary, fontSize: 14 },
  itemCat: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  itemValor: { fontSize: 14, fontWeight: '600' },
})