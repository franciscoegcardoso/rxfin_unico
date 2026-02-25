import { useEffect, useState, useMemo, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, TextInput, SectionList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'

interface Transacao {
  id: string
  nome: string
  valor: number
  tipo: 'receita' | 'despesa'
  data: string
  categoria?: string
}

interface Secao { title: string; data: Transacao[] }

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDataLabel(d: string) {
  const hoje = new Date().toISOString().split('T')[0]
  const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (d === hoje) return 'Hoje'
  if (d === ontem) return 'Ontem'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long'
  })
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const ANO_CURTO = String(new Date().getFullYear()).slice(2)
type Filtro = 'todos' | 'receita' | 'despesa'

export default function LancamentosScreen() {
  const mesAtual = new Date().getMonth()
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(mesAtual)
  const [ano] = useState(new Date().getFullYear())
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')
  const mesesScrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    setTimeout(() => {
      const offset = Math.max(0, mes * 88 - 88)
      mesesScrollRef.current?.scrollTo({ x: offset, animated: true })
    }, 300)
  }, [])

  useEffect(() => { load() }, [mes])

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const m = String(mes + 1).padStart(2, '0')
      const ultimo = new Date(ano, mes + 1, 0).getDate()
      const { data: txs, error } = await supabase
        .from('pluggy_transactions')
        .select('id, description, amount, type, date, category')
        .eq('user_id', user.id)
        .gte('date', `${ano}-${m}-01`)
        .lte('date', `${ano}-${m}-${String(ultimo).padStart(2, '0')}`)
        .order('date', { ascending: false })
        .limit(200)
      if (error) console.error(error)
      if (txs?.length) {
        setTransacoes(txs.map(t => ({
          id: t.id,
          nome: t.description ?? '—',
          valor: Number(t.amount),
          tipo: t.type === 'CREDIT' ? 'receita' : 'despesa',
          data: t.date,
          categoria: t.category ?? undefined,
        })))
      } else {
        const { data: lacs } = await supabase
          .from('lancamentos_realizados')
          .select('id, nome, valor_realizado, tipo, data_registro')
          .eq('user_id', user.id)
          .eq('mes_referencia', `${ano}-${m}`)
          .order('data_registro', { ascending: false })
        setTransacoes(lacs?.map(l => ({
          id: l.id,
          nome: l.nome,
          valor: l.valor_realizado,
          tipo: l.tipo === 'receita' ? 'receita' : 'despesa',
          data: l.data_registro,
        })) ?? [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function selecionarMes(i: number) {
    setMes(i)
    setBusca('')
    setFiltro('todos')
    const offset = Math.max(0, i * 88 - 88)
    mesesScrollRef.current?.scrollTo({ x: offset, animated: true })
  }

  const filtradas = useMemo(() => transacoes.filter(t => {
    const pf = filtro === 'todos' || t.tipo === filtro
    const pb = busca === '' ||
      t.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (t.categoria ?? '').toLowerCase().includes(busca.toLowerCase())
    return pf && pb
  }), [transacoes, filtro, busca])

  const secoes = useMemo((): Secao[] => {
    const g: Record<string, Transacao[]> = {}
    filtradas.forEach(t => {
      if (!g[t.data]) g[t.data] = []
      g[t.data].push(t)
    })
    return Object.entries(g)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([data, items]) => ({ title: formatDataLabel(data), data: items }))
  }, [filtradas])

  const rec = filtradas.filter(t => t.tipo === 'receita').reduce((a, t) => a + t.valor, 0)
  const des = filtradas.filter(t => t.tipo === 'despesa').reduce((a, t) => a + t.valor, 0)

  return (
    <View style={styles.container}>

      {/* Navbar */}
      <View style={styles.navbar}>
        <View>
          <Text style={styles.navTitulo}>Lançamentos</Text>
          <Text style={styles.navSub}>{MESES[mes]} · {ano}</Text>
        </View>
      </View>

      {/* Seletor de mês */}
      <View style={styles.mesesWrapper}>
        <ScrollView
          ref={mesesScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mesesContent}
        >
          {MESES.map((m, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.mesBt, mes === i && styles.mesBtAtivo]}
              onPress={() => selecionarMes(i)}
            >
              <Text style={[styles.mesTx, mes === i && styles.mesTxAtivo]}>
                {m}{ANO_CURTO}
              </Text>
              {i === mesAtual && mes !== i && (
                <View style={styles.mesAtualDot} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Busca */}
      <View style={styles.buscaBox}>
        <Ionicons name="search" size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.buscaInput}
          placeholder="Buscar lançamentos..."
          placeholderTextColor={theme.textMuted}
          value={busca}
          onChangeText={setBusca}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {busca !== '' && (
          <TouchableOpacity onPress={() => setBusca('')}>
            <Ionicons name="close-circle" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <View style={styles.filtrosRow}>
        {(['todos', 'despesa', 'receita'] as Filtro[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filtroBt, filtro === f && styles.filtroBtAtivo]}
            onPress={() => setFiltro(f)}
          >
            <Text style={[styles.filtroTx, filtro === f && styles.filtroTxAtivo]}>
              {f === 'todos' ? 'Todos' : f === 'despesa' ? '↓ Despesas' : '↑ Receitas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Resumo */}
      <View style={styles.resumoCard}>
        <View style={styles.resumoItem}>
          <Text style={styles.resumoLabel}>Receitas</Text>
          <Text style={[styles.resumoValor, { color: theme.income }]}>{formatBRL(rec)}</Text>
        </View>
        <View style={styles.resumoDivider} />
        <View style={styles.resumoItem}>
          <Text style={styles.resumoLabel}>Despesas</Text>
          <Text style={[styles.resumoValor, { color: theme.expense }]}>{formatBRL(des)}</Text>
        </View>
        <View style={styles.resumoDivider} />
        <View style={styles.resumoItem}>
          <Text style={styles.resumoLabel}>Saldo</Text>
          <Text style={[styles.resumoValor, { color: rec - des >= 0 ? theme.income : theme.expense }]}>
            {formatBRL(rec - des)}
          </Text>
        </View>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : secoes.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={40} color={theme.textMuted} />
          <Text style={styles.vazio}>
            {busca ? `Nenhum resultado para "${busca}"` : 'Nenhum lançamento'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={secoes}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.lista}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.secaoHeader}>{section.title}</Text>
          )}
          renderItem={({ item: t }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => router.push(`/transacao/${t.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.itemIcone, { backgroundColor: t.tipo === 'receita' ? '#dcfce7' : '#fee2e2' }]}>
                <Ionicons
                  name={t.tipo === 'receita' ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color={t.tipo === 'receita' ? theme.income : theme.expense}
                />
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
          )}
        />
      )}

      {/* FAB - Novo lançamento */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/lancamento/novo' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },

  navbar: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  navTitulo: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  navSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  mesesWrapper: {
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  mesesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  mesBt: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    minWidth: 64,
  },
  mesBtAtivo: { backgroundColor: theme.primary, borderColor: theme.primary },
  mesTx: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
  mesTxAtivo: { color: '#fff' },
  mesAtualDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: theme.primary, marginTop: 3,
  },

  buscaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  buscaInput: { flex: 1, color: theme.textPrimary, fontSize: 14 },

  filtrosRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 10 },
  filtroBt: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: theme.surface, alignItems: 'center',
    borderWidth: 1, borderColor: theme.border,
  },
  filtroBtAtivo: { backgroundColor: theme.primary, borderColor: theme.primary },
  filtroTx: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
  filtroTxAtivo: { color: '#fff' },

  resumoCard: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  resumoItem: { flex: 1, alignItems: 'center' },
  resumoLabel: { color: theme.textMuted, fontSize: 11, marginBottom: 3 },
  resumoValor: { fontSize: 13, fontWeight: 'bold' },
  resumoDivider: { width: 1, backgroundColor: theme.border },

  lista: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  secaoHeader: {
    color: theme.textMuted, fontSize: 12, fontWeight: '600',
    textTransform: 'capitalize', marginTop: 16, marginBottom: 6,
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.surface, borderRadius: 12,
    padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: theme.border,
  },
  itemIcone: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  itemNome: { color: theme.textPrimary, fontSize: 14 },
  itemCat: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  itemValor: { fontSize: 14, fontWeight: '600' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingTop: 60 },
  vazio: { color: theme.textMuted, fontSize: 14 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
})