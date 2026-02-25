import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal,
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

interface Compra {
  id: string; name: string; estimated_value: number; actual_value: number | null
  status: 'pending' | 'purchased'; planned_date: string | null
  payment_method: string | null; installments: number | null; notes: string | null
}

type Filtro = 'todos' | 'pending' | 'purchased'

export default function RegistroComprasScreen() {
  const [compras, setCompras] = useState<Compra[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [showModal, setShowModal] = useState(false)
  const [fNome, setFNome] = useState(''); const [fValor, setFValor] = useState('')
  const [fData, setFData] = useState(''); const [fNotas, setFNotas] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('purchase_registry')
        .select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)
      setCompras(data ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  const filtradas = compras.filter(c => filtro === 'todos' || c.status === filtro)
  const totalPendente = compras.filter(c => c.status === 'pending').reduce((a, c) => a + c.estimated_value, 0)
  const totalComprado = compras.filter(c => c.status === 'purchased').reduce((a, c) => a + (c.actual_value || c.estimated_value), 0)

  async function marcarComprado(c: Compra) {
    await supabase.from('purchase_registry').update({ status: 'purchased', purchase_date: new Date().toISOString().split('T')[0], actual_value: c.estimated_value }).eq('id', c.id)
    load()
  }

  async function excluir(c: Compra) {
    Alert.alert('Excluir', `Excluir "${c.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await supabase.from('purchase_registry').delete().eq('id', c.id)
        setCompras(prev => prev.filter(x => x.id !== c.id))
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
      await supabase.from('purchase_registry').insert({
        user_id: user.id, name: fNome.trim(), estimated_value: val,
        planned_date: fData || null, notes: fNotas || null, status: 'pending',
      })
      setShowModal(false); setFNome(''); setFValor(''); setFData(''); setFNotas(''); load()
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setSaving(false) }
  }

  return (
    <ScreenLayout titulo="Registro de Compras">
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.resumoRow}>
          <View style={[s.resumoCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={s.resumoLabel}>Planejado</Text>
            <Text style={[s.resumoValor, { color: '#f59e0b' }]}>{formatBRL(totalPendente)}</Text>
          </View>
          <View style={[s.resumoCard, { borderLeftColor: theme.income }]}>
            <Text style={s.resumoLabel}>Comprado</Text>
            <Text style={[s.resumoValor, { color: theme.income }]}>{formatBRL(totalComprado)}</Text>
          </View>
        </View>

        <View style={s.filtroRow}>
          {(['todos', 'pending', 'purchased'] as Filtro[]).map(f => (
            <TouchableOpacity key={f} style={[s.filtroBt, filtro === f && s.filtroBtAtivo]} onPress={() => setFiltro(f)}>
              <Text style={[s.filtroTx, filtro === f && s.filtroTxAtivo]}>
                {f === 'todos' ? 'Todos' : f === 'pending' ? 'Pendentes' : 'Comprados'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> :
         filtradas.length === 0 ? <EmptyState icon="cart-outline" titulo="Nenhuma compra" descricao="Registre itens que planeja comprar." /> : (
          <SectionCard titulo="">
            {filtradas.map((c, i) => (
              <TouchableOpacity key={c.id} style={[s.item, i < filtradas.length - 1 && s.itemBorder]}
                onLongPress={() => excluir(c)} activeOpacity={0.7}>
                <View style={[s.itemIcone, { backgroundColor: c.status === 'purchased' ? '#dcfce7' : '#fef3c7' }]}>
                  <Ionicons name={c.status === 'purchased' ? 'checkmark-circle' : 'cart'} size={16}
                    color={c.status === 'purchased' ? theme.income : '#f59e0b'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemNome}>{c.name}</Text>
                  {c.planned_date && <Text style={s.itemSub}>Planejado: {c.planned_date}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.itemValor}>{formatBRL(c.actual_value || c.estimated_value)}</Text>
                  {c.status === 'pending' && (
                    <TouchableOpacity onPress={() => marcarComprado(c)} style={s.comprarBtn}>
                      <Text style={s.comprarText}>Comprar ✓</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </SectionCard>
        )}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)}><Ionicons name="add" size={28} color="#fff" /></TouchableOpacity>

      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={m.container}>
          <View style={m.header}><Text style={m.titulo}>Nova compra</Text><TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={22} color={theme.textPrimary} /></TouchableOpacity></View>
          <ScrollView contentContainerStyle={m.content} keyboardShouldPersistTaps="handled">
            <Text style={m.label}>Nome</Text>
            <TextInput style={m.input} value={fNome} onChangeText={setFNome} placeholder="Ex: iPhone, Sofá..." placeholderTextColor={theme.textMuted} />
            <Text style={m.label}>Valor estimado (R$)</Text>
            <TextInput style={m.input} value={fValor} onChangeText={setFValor} placeholder="0,00" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
            <Text style={m.label}>Data planejada</Text>
            <TextInput style={m.input} value={fData} onChangeText={setFData} placeholder="AAAA-MM-DD (opcional)" placeholderTextColor={theme.textMuted} />
            <Text style={m.label}>Notas</Text>
            <TextInput style={[m.input, { height: 60 }]} value={fNotas} onChangeText={setFNotas} placeholder="Opcional" placeholderTextColor={theme.textMuted} multiline />
            <TouchableOpacity style={[m.salvarBtn, saving && { opacity: 0.6 }]} onPress={salvar} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={m.salvarText}>Adicionar</Text></>}
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
  resumoCard: { flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border, borderLeftWidth: 4 },
  resumoLabel: { fontSize: 11, color: theme.textMuted },
  resumoValor: { fontSize: 17, fontWeight: '700', marginTop: 4 },
  filtroRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  filtroBt: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  filtroBtAtivo: { backgroundColor: theme.primary, borderColor: theme.primary },
  filtroTx: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  filtroTxAtivo: { color: '#fff' },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  itemIcone: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  itemNome: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  itemSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  itemValor: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  comprarBtn: { marginTop: 4 },
  comprarText: { fontSize: 11, color: theme.income, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
})

const m = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  titulo: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
  content: { padding: 16, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textPrimary, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.textPrimary },
  salvarBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 16, marginTop: 24 },
  salvarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
