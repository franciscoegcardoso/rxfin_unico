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

const TIPOS = [
  { value: 'auto', label: 'Auto', icon: 'car' },
  { value: 'vida', label: 'Vida', icon: 'heart' },
  { value: 'residencial', label: 'Residencial', icon: 'home' },
  { value: 'saude', label: 'Saúde', icon: 'medkit' },
  { value: 'viagem', label: 'Viagem', icon: 'airplane' },
  { value: 'outro', label: 'Outro', icon: 'shield' },
]

interface Seguro {
  id: string; nome: string; tipo: string; seguradora: string
  premio_mensal: number; premio_anual: number; valor_cobertura: number
  franquia: number | null; data_inicio: string; data_fim: string
  renovacao_automatica: boolean; observacoes: string | null
}

export default function SegurosScreen() {
  const [seguros, setSeguros] = useState<Seguro[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [fNome, setFNome] = useState(''); const [fTipo, setFTipo] = useState('auto')
  const [fSeguradora, setFSeguradora] = useState(''); const [fPremio, setFPremio] = useState('')
  const [fCobertura, setFCobertura] = useState(''); const [fInicio, setFInicio] = useState('')
  const [fFim, setFFim] = useState(''); const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('seguros').select('*')
        .eq('user_id', user.id).order('data_fim', { ascending: true })
      setSeguros(data ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  const hoje = new Date().toISOString().split('T')[0]
  const totalMensal = seguros.reduce((a, s) => a + Number(s.premio_mensal), 0)
  const vencendo = seguros.filter(s => s.data_fim <= new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] && s.data_fim >= hoje)

  async function excluir(s: Seguro) {
    Alert.alert('Excluir', `Excluir "${s.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await supabase.from('seguros').delete().eq('id', s.id)
        setSeguros(prev => prev.filter(x => x.id !== s.id))
      }},
    ])
  }

  async function salvar() {
    if (!fNome.trim() || !fSeguradora.trim()) return Alert.alert('Erro', 'Preencha nome e seguradora')
    const premio = parseFloat(fPremio.replace(/\./g, '').replace(',', '.')) || 0
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('seguros').insert({
        user_id: user.id, nome: fNome.trim(), tipo: fTipo,
        seguradora: fSeguradora.trim(), premio_mensal: premio,
        premio_anual: premio * 12,
        valor_cobertura: parseFloat(fCobertura.replace(/\./g, '').replace(',', '.')) || 0,
        data_inicio: fInicio || hoje, data_fim: fFim || '',
      })
      setShowModal(false); setFNome(''); setFSeguradora(''); setFPremio(''); setFCobertura(''); load()
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setSaving(false) }
  }

  return (
    <ScreenLayout titulo="Seguros">
      <ScrollView contentContainerStyle={st.content}>
        <View style={st.hero}>
          <View style={st.heroIcone}><Ionicons name="shield-checkmark" size={28} color={theme.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={st.heroTitulo}>Meus Seguros</Text>
            <Text style={st.heroDesc}>Gerencie apólices, coberturas e vencimentos.</Text>
          </View>
        </View>

        {seguros.length > 0 && (
          <View style={st.statsRow}>
            <View style={st.statCard}>
              <Text style={st.statLabel}>Custo mensal</Text>
              <Text style={[st.statValor, { color: theme.expense }]}>{formatBRL(totalMensal)}</Text>
            </View>
            <View style={st.statCard}>
              <Text style={st.statLabel}>Apólices</Text>
              <Text style={[st.statValor, { color: theme.primary }]}>{seguros.length}</Text>
            </View>
          </View>
        )}

        {vencendo.length > 0 && (
          <View style={st.alertCard}>
            <Ionicons name="time" size={16} color="#f59e0b" />
            <Text style={st.alertText}>{vencendo.length} seguro{vencendo.length > 1 ? 's' : ''} vencendo nos próximos 30 dias</Text>
          </View>
        )}

        {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> :
         seguros.length === 0 ? <EmptyState icon="shield-outline" titulo="Nenhum seguro" descricao="Cadastre seus seguros para acompanhar coberturas e vencimentos." /> : (
          <SectionCard titulo="">
            {seguros.map((s, i) => {
              const tipo = TIPOS.find(t => t.value === s.tipo) || TIPOS[5]
              const vencido = s.data_fim < hoje
              return (
                <TouchableOpacity key={s.id} style={[st.item, i < seguros.length - 1 && st.itemBorder]}
                  onLongPress={() => excluir(s)} activeOpacity={0.7}>
                  <View style={[st.itemIcone, vencido && { backgroundColor: '#fee2e2' }]}>
                    <Ionicons name={tipo.icon as any} size={18} color={vencido ? theme.expense : theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.itemNome}>{s.nome}</Text>
                    <Text style={st.itemSub}>{s.seguradora} • {tipo.label}</Text>
                    <Text style={[st.itemSub, vencido && { color: theme.expense }]}>
                      {vencido ? 'VENCIDO' : `Até ${new Date(s.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={st.itemValor}>{formatBRL(Number(s.premio_mensal))}/mês</Text>
                    <Text style={st.itemCob}>Cob: {formatBRL(Number(s.valor_cobertura))}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </SectionCard>
        )}
      </ScrollView>

      <TouchableOpacity style={st.fab} onPress={() => setShowModal(true)}><Ionicons name="add" size={28} color="#fff" /></TouchableOpacity>

      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={mo.container}>
          <View style={mo.header}><Text style={mo.titulo}>Novo seguro</Text><TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={22} color={theme.textPrimary} /></TouchableOpacity></View>
          <ScrollView contentContainerStyle={mo.content} keyboardShouldPersistTaps="handled">
            <Text style={mo.label}>Tipo</Text>
            <View style={mo.tipoRow}>
              {TIPOS.map(t => (
                <TouchableOpacity key={t.value} style={[mo.tipoBtn, fTipo === t.value && mo.tipoBtnAtivo]} onPress={() => setFTipo(t.value)}>
                  <Ionicons name={t.icon as any} size={14} color={fTipo === t.value ? '#fff' : theme.textMuted} />
                  <Text style={[mo.tipoText, fTipo === t.value && { color: '#fff' }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={mo.label}>Nome</Text>
            <TextInput style={mo.input} value={fNome} onChangeText={setFNome} placeholder="Ex: Seguro auto HB20" placeholderTextColor={theme.textMuted} />
            <Text style={mo.label}>Seguradora</Text>
            <TextInput style={mo.input} value={fSeguradora} onChangeText={setFSeguradora} placeholder="Ex: Porto Seguro" placeholderTextColor={theme.textMuted} />
            <Text style={mo.label}>Prêmio mensal (R$)</Text>
            <TextInput style={mo.input} value={fPremio} onChangeText={setFPremio} placeholder="0,00" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
            <Text style={mo.label}>Valor da cobertura (R$)</Text>
            <TextInput style={mo.input} value={fCobertura} onChangeText={setFCobertura} placeholder="0,00" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
            <Text style={mo.label}>Início (AAAA-MM-DD)</Text>
            <TextInput style={mo.input} value={fInicio} onChangeText={setFInicio} placeholder={hoje} placeholderTextColor={theme.textMuted} />
            <Text style={mo.label}>Fim (AAAA-MM-DD)</Text>
            <TextInput style={mo.input} value={fFim} onChangeText={setFFim} placeholder="AAAA-MM-DD" placeholderTextColor={theme.textMuted} />
            <TouchableOpacity style={[mo.salvarBtn, saving && { opacity: 0.6 }]} onPress={salvar} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={mo.salvarText}>Salvar</Text></>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScreenLayout>
  )
}

const st = StyleSheet.create({
  content: { padding: 16, paddingBottom: 80 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.surface, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  heroIcone: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  heroTitulo: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  heroDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  statLabel: { fontSize: 11, color: theme.textMuted },
  statValor: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef3c7', borderRadius: 10, padding: 10, marginBottom: 12 },
  alertText: { fontSize: 12, color: '#92400e', fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  itemIcone: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  itemNome: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  itemSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  itemValor: { fontSize: 13, fontWeight: '600', color: theme.expense },
  itemCob: { fontSize: 10, color: theme.textMuted, marginTop: 2 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
})

const mo = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  titulo: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
  content: { padding: 16, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textPrimary, marginBottom: 6, marginTop: 14 },
  tipoRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tipoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface },
  tipoBtnAtivo: { backgroundColor: theme.primary, borderColor: theme.primary },
  tipoText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  input: { backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.textPrimary },
  salvarBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 16, marginTop: 24 },
  salvarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
