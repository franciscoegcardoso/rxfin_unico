import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { theme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

function formatData(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

interface Conta {
  id: string; tipo: 'pagar' | 'receber'; nome: string; valor: number
  data_vencimento: string; data_pagamento: string | null
  categoria: string; recorrente: boolean; observacoes: string | null
}

type Filtro = 'todos' | 'pagar' | 'receber' | 'vencido'
type Tab = 'pendentes' | 'pagas'

export default function ContasPagarScreen() {
  const [contas, setContas] = useState<Conta[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [tab, setTab] = useState<Tab>('pendentes')
  const [showModal, setShowModal] = useState(false)

  // Form
  const [fTipo, setFTipo] = useState<'pagar' | 'receber'>('pagar')
  const [fNome, setFNome] = useState('')
  const [fValor, setFValor] = useState('')
  const [fVenc, setFVenc] = useState(new Date().toISOString().split('T')[0])
  const [fCat, setFCat] = useState('Outros')
  const [fRec, setFRec] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('contas_pagar_receber')
        .select('*')
        .eq('user_id', user.id)
        .order('data_vencimento', { ascending: true })
        .limit(200)
      setContas(data ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  const hoje = new Date().toISOString().split('T')[0]
  const pendentes = contas.filter(c => !c.data_pagamento)
  const pagas = contas.filter(c => !!c.data_pagamento)

  const lista = (tab === 'pendentes' ? pendentes : pagas).filter(c => {
    if (filtro === 'pagar') return c.tipo === 'pagar'
    if (filtro === 'receber') return c.tipo === 'receber'
    if (filtro === 'vencido') return !c.data_pagamento && c.data_vencimento < hoje
    return true
  })

  const totalPagar = pendentes.filter(c => c.tipo === 'pagar').reduce((a, c) => a + c.valor, 0)
  const totalReceber = pendentes.filter(c => c.tipo === 'receber').reduce((a, c) => a + c.valor, 0)
  const vencidas = pendentes.filter(c => c.data_vencimento < hoje).length

  async function marcarPaga(c: Conta) {
    const { error } = await supabase
      .from('contas_pagar_receber')
      .update({ data_pagamento: hoje })
      .eq('id', c.id)
    if (!error) load()
  }

  async function excluir(c: Conta) {
    Alert.alert('Excluir', `Excluir "${c.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await supabase.from('contas_pagar_receber').delete().eq('id', c.id)
        setContas(prev => prev.filter(x => x.id !== c.id))
      }},
    ])
  }

  async function salvar() {
    if (!fNome.trim()) return Alert.alert('Erro', 'Informe o nome')
    const val = parseFloat(fValor.replace(/\./g, '').replace(',', '.')) || 0
    if (val <= 0) return Alert.alert('Erro', 'Informe o valor')
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('contas_pagar_receber').insert({
        user_id: user.id, tipo: fTipo, nome: fNome.trim(), valor: val,
        data_vencimento: fVenc, categoria: fCat, recorrente: fRec,
      })
      if (error) throw error
      setShowModal(false); setFNome(''); setFValor(''); load()
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setSaving(false) }
  }

  return (
    <ScreenLayout titulo="Contas a Pagar/Receber">
      <ScrollView contentContainerStyle={s.content}>
        {/* Resumo */}
        <View style={s.resumoRow}>
          <View style={[s.resumoCard, { borderLeftColor: theme.expense }]}>
            <Text style={s.resumoLabel}>A pagar</Text>
            <Text style={[s.resumoValor, { color: theme.expense }]}>{formatBRL(totalPagar)}</Text>
          </View>
          <View style={[s.resumoCard, { borderLeftColor: theme.income }]}>
            <Text style={s.resumoLabel}>A receber</Text>
            <Text style={[s.resumoValor, { color: theme.income }]}>{formatBRL(totalReceber)}</Text>
          </View>
        </View>

        {vencidas > 0 && (
          <View style={s.alertCard}>
            <Ionicons name="warning" size={16} color="#dc2626" />
            <Text style={s.alertText}>{vencidas} conta{vencidas > 1 ? 's' : ''} vencida{vencidas > 1 ? 's' : ''}</Text>
          </View>
        )}

        {/* Tabs */}
        <View style={s.tabRow}>
          {(['pendentes', 'pagas'] as Tab[]).map(t => (
            <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnAtivo]} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && s.tabTextAtivo]}>
                {t === 'pendentes' ? `Pendentes (${pendentes.length})` : `Pagas (${pagas.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={s.filtroRow}>
            {(['todos', 'pagar', 'receber', 'vencido'] as Filtro[]).map(f => (
              <TouchableOpacity key={f} style={[s.filtroBt, filtro === f && s.filtroBtAtivo]} onPress={() => setFiltro(f)}>
                <Text style={[s.filtroTx, filtro === f && s.filtroTxAtivo]}>
                  {f === 'todos' ? 'Todos' : f === 'pagar' ? 'A pagar' : f === 'receber' ? 'A receber' : 'Vencidas'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : lista.length === 0 ? (
          <EmptyState icon="calendar-outline" titulo="Nenhuma conta" descricao="Adicione contas para organizar seus pagamentos." />
        ) : (
          <SectionCard titulo="">
            {lista.map((c, i) => {
              const vencida = !c.data_pagamento && c.data_vencimento < hoje
              return (
                <TouchableOpacity key={c.id} style={[s.item, i < lista.length - 1 && s.itemBorder]}
                  onLongPress={() => excluir(c)} activeOpacity={0.7}
                >
                  <View style={[s.itemDot, { backgroundColor: c.tipo === 'pagar' ? theme.expense : theme.income }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemNome} numberOfLines={1}>{c.nome}</Text>
                    <Text style={[s.itemSub, vencida && { color: '#dc2626' }]}>
                      {formatData(c.data_vencimento)}{vencida ? ' • VENCIDA' : ''}{c.recorrente ? ' • Recorrente' : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.itemValor, { color: c.tipo === 'pagar' ? theme.expense : theme.income }]}>
                      {formatBRL(c.valor)}
                    </Text>
                    {!c.data_pagamento && (
                      <TouchableOpacity onPress={() => marcarPaga(c)} style={s.pagarBtn}>
                        <Ionicons name="checkmark-circle" size={14} color={theme.income} />
                        <Text style={s.pagarText}>Pagar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </SectionCard>
        )}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal nova conta */}
      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={m.container}>
          <View style={m.header}>
            <Text style={m.titulo}>Nova conta</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={m.content} keyboardShouldPersistTaps="handled">
            <View style={m.tipoRow}>
              {(['pagar', 'receber'] as const).map(t => (
                <TouchableOpacity key={t}
                  style={[m.tipoBtn, fTipo === t && (t === 'pagar' ? m.tipoPagar : m.tipoReceber)]}
                  onPress={() => setFTipo(t)}
                >
                  <Ionicons name={t === 'pagar' ? 'arrow-down' : 'arrow-up'} size={16}
                    color={fTipo === t ? '#fff' : theme.textMuted} />
                  <Text style={[m.tipoText, fTipo === t && { color: '#fff' }]}>
                    {t === 'pagar' ? 'A pagar' : 'A receber'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={m.label}>Nome</Text>
            <TextInput style={m.input} value={fNome} onChangeText={setFNome} placeholder="Ex: Aluguel" placeholderTextColor={theme.textMuted} />
            <Text style={m.label}>Valor (R$)</Text>
            <TextInput style={m.input} value={fValor} onChangeText={setFValor} placeholder="0,00" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
            <Text style={m.label}>Vencimento</Text>
            <TextInput style={m.input} value={fVenc} onChangeText={setFVenc} placeholder="AAAA-MM-DD" placeholderTextColor={theme.textMuted} />
            <View style={m.switchRow}>
              <Text style={m.switchLabel}>Recorrente</Text>
              <Switch value={fRec} onValueChange={setFRec} trackColor={{ true: theme.primary }} thumbColor="#fff" />
            </View>
            <TouchableOpacity style={[m.salvarBtn, saving && { opacity: 0.6 }]} onPress={salvar} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={m.salvarText}>Salvar</Text></>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScreenLayout>
  )
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 80 },
  resumoRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  resumoCard: {
    flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: theme.border, borderLeftWidth: 4,
  },
  resumoLabel: { fontSize: 11, color: theme.textMuted },
  resumoValor: { fontSize: 17, fontWeight: '700', marginTop: 4 },
  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, marginBottom: 12,
  },
  alertText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface },
  tabBtnAtivo: { borderColor: theme.primary, backgroundColor: '#f0fdf4' },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  tabTextAtivo: { color: theme.primary },
  filtroRow: { flexDirection: 'row', gap: 6 },
  filtroBt: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  filtroBtAtivo: { backgroundColor: theme.primary, borderColor: theme.primary },
  filtroTx: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  filtroTxAtivo: { color: '#fff' },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  itemDot: { width: 8, height: 8, borderRadius: 4 },
  itemNome: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  itemSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  itemValor: { fontSize: 14, fontWeight: '600' },
  pagarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  pagarText: { fontSize: 11, color: theme.income, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
})

const m = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  titulo: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
  content: { padding: 16, paddingBottom: 48 },
  tipoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tipoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface },
  tipoPagar: { backgroundColor: theme.expense, borderColor: theme.expense },
  tipoReceber: { backgroundColor: theme.income, borderColor: theme.income },
  tipoText: { fontSize: 14, fontWeight: '600', color: theme.textMuted },
  label: { fontSize: 13, fontWeight: '600', color: theme.textPrimary, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.textPrimary },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  salvarBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 16, marginTop: 24 },
  salvarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
