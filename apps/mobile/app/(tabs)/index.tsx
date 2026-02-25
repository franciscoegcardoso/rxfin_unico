import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity, Image,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import { Ionicons } from '@expo/vector-icons'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Resumo { receitas: number; despesas: number; saldo: number }
interface Transacao { id: string; nome: string; valor: number; tipo: string; data: string; categoria?: string }

export default function DashboardScreen() {
  const [resumo, setResumo] = useState<Resumo>({ receitas: 0, despesas: 0, saldo: 0 })
  const [ultimas, setUltimas] = useState<Transacao[]>([])
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState('')
  const [visivel, setVisivel] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setNome(p?.full_name?.split(' ')[0] ?? '')
      const mes = new Date().toISOString().slice(0, 7)
      const ultimo = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      const { data: txs } = await supabase
        .from('pluggy_transactions')
        .select('id, description, amount, type, date, category')
        .eq('user_id', user.id)
        .gte('date', `${mes}-01`)
        .lte('date', `${mes}-${String(ultimo).padStart(2, '0')}`)
        .order('date', { ascending: false })
        .limit(200)
      if (txs?.length) {
        const rec = txs.filter(t => t.type === 'CREDIT').reduce((a, t) => a + Number(t.amount), 0)
        const des = txs.filter(t => t.type !== 'CREDIT').reduce((a, t) => a + Number(t.amount), 0)
        setResumo({ receitas: rec, despesas: des, saldo: rec - des })
        setUltimas(txs.slice(0, 5).map(t => ({ id: t.id, nome: t.description ?? '—', valor: Number(t.amount), tipo: t.type === 'CREDIT' ? 'receita' : 'despesa', data: t.date, categoria: t.category })))
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const val = (v: number) => visivel ? formatBRL(v) : '••••••'

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color={theme.primary} size="large" />
    </View>
  )

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Top navbar estilo web */}
      <View style={styles.navbar}>
        <Image source={require('../../assets/logo-icon.png')} style={styles.navLogo} resizeMode="contain" />
        <Text style={styles.navTitulo}>RXFin</Text>
        <TouchableOpacity onPress={() => setVisivel(!visivel)} style={styles.navBtn}>
          <Ionicons name={visivel ? 'eye-outline' : 'eye-off-outline'} size={22} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Saudação */}
      <View style={styles.saudacao}>
        <View>
          <Text style={styles.ola}>Olá, {nome}! 👋</Text>
          <Text style={styles.subtitulo}>Acompanhe sua vida financeira</Text>
        </View>
      </View>

      {/* Card saldo principal — verde como a versão web */}
      <View style={styles.saldoCard}>
        <Text style={styles.saldoLabel}>Saldo Líquido do Mês</Text>
        <Text style={[styles.saldoValor, { color: resumo.saldo >= 0 ? '#fff' : '#fca5a5' }]}>
          {val(resumo.saldo)}
        </Text>
        <View style={styles.saldoGrade}>
          <TouchableOpacity style={styles.saldoItem}>
            <Ionicons name="list-outline" size={22} color="rgba(255,255,255,0.9)" />
            <Text style={styles.saldoItemLabel}>Lançamentos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saldoItem}>
            <Ionicons name="card-outline" size={22} color="rgba(255,255,255,0.9)" />
            <Text style={styles.saldoItemLabel}>Cartão</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saldoItem}>
            <Ionicons name="calendar-outline" size={22} color="rgba(255,255,255,0.9)" />
            <Text style={styles.saldoItemLabel}>Planejar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saldoItem}>
            <Ionicons name="trending-up-outline" size={22} color="rgba(255,255,255,0.9)" />
            <Text style={styles.saldoItemLabel}>Patrimônio</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Resumo do mês */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitulo}>Resumo do Mês</Text>
          <Text style={styles.cardVer}>Ver mais &gt;</Text>
        </View>
        <View style={styles.resumoLinha}>
          <Ionicons name="trending-up" size={16} color={theme.income} />
          <Text style={styles.resumoLabel}>Receitas</Text>
          <Text style={[styles.resumoValor, { color: theme.income }]}>{val(resumo.receitas)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.resumoLinha}>
          <Ionicons name="trending-down" size={16} color={theme.expense} />
          <Text style={styles.resumoLabel}>Despesas</Text>
          <Text style={[styles.resumoValor, { color: theme.expense }]}>{val(resumo.despesas)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.resumoLinha}>
          <Ionicons name="remove-outline" size={16} color={theme.textSecondary} />
          <Text style={styles.resumoLabel}>Saldo</Text>
          <Text style={[styles.resumoValor, { color: resumo.saldo >= 0 ? theme.income : theme.expense }]}>{val(resumo.saldo)}</Text>
        </View>
      </View>

      {/* Últimas transações */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitulo}>Últimas Transações</Text>
        </View>
        {ultimas.length === 0
          ? <Text style={styles.vazio}>Nenhuma transação este mês</Text>
          : ultimas.map(t => (
            <View key={t.id} style={styles.tx}>
              <View style={[styles.txIcone, { backgroundColor: t.tipo === 'receita' ? '#dcfce7' : '#fee2e2' }]}>
                <Ionicons name={t.tipo === 'receita' ? 'arrow-up' : 'arrow-down'} size={14} color={t.tipo === 'receita' ? theme.income : theme.expense} />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.txNome} numberOfLines={1}>{t.nome}</Text>
                {t.categoria ? <Text style={styles.txCat}>{t.categoria}</Text> : null}
              </View>
              <Text style={[styles.txValor, { color: t.tipo === 'receita' ? theme.income : theme.expense }]}>
                {t.tipo === 'receita' ? '+' : '-'}{val(t.valor)}
              </Text>
            </View>
          ))
        }
      </View>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { paddingBottom: 40 },
  navbar: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  navLogo: { width: 28, height: 28, marginRight: 8 },
  navTitulo: { flex: 1, fontSize: 20, fontWeight: 'bold', color: theme.primary },
  navBtn: { padding: 4 },
  saudacao: { padding: 20, paddingBottom: 8 },
  ola: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary },
  subtitulo: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  saldoCard: { backgroundColor: theme.primary, marginHorizontal: 16, borderRadius: 20, padding: 24, marginBottom: 16 },
  saldoLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 6 },
  saldoValor: { fontSize: 34, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
  saldoGrade: { flexDirection: 'row', justifyContent: 'space-between' },
  saldoItem: { alignItems: 'center', flex: 1 },
  saldoItemLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 6, fontWeight: '500' },
  card: { backgroundColor: theme.surface, marginHorizontal: 16, borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitulo: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
  cardVer: { fontSize: 12, color: theme.primary, fontWeight: '500' },
  resumoLinha: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  resumoLabel: { flex: 1, color: theme.textSecondary, fontSize: 14 },
  resumoValor: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: theme.border },
  tx: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  txIcone: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txNome: { fontSize: 14, color: theme.textPrimary },
  txCat: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  txValor: { fontSize: 14, fontWeight: '600' },
  vazio: { color: theme.textMuted, fontSize: 14, textAlign: 'center', padding: 20 },
})