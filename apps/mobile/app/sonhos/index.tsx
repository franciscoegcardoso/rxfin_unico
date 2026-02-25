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
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

const ICONS = [
  { icon: 'home', label: 'Casa', bg: '#dbeafe' },
  { icon: 'car', label: 'Carro', bg: '#fef3c7' },
  { icon: 'airplane', label: 'Viagem', bg: '#dcfce7' },
  { icon: 'school', label: 'Estudo', bg: '#ede9fe' },
  { icon: 'game-controller', label: 'Lazer', bg: '#fce7f3' },
  { icon: 'diamond', label: 'Luxo', bg: '#fef3c7' },
  { icon: 'heart', label: 'Casamento', bg: '#fce7f3' },
  { icon: 'star', label: 'Outro', bg: '#f3f4f6' },
]

interface Goal {
  id: string; name: string; target_amount: number; current_amount: number
  deadline: string | null; icon: string | null; order_index: number
}

export default function SonhosScreen() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [fNome, setFNome] = useState(''); const [fTarget, setFTarget] = useState('')
  const [fCurrent, setFCurrent] = useState(''); const [fDeadline, setFDeadline] = useState('')
  const [fIcon, setFIcon] = useState('star'); const [saving, setSaving] = useState(false)

  // Depositar
  const [showDeposit, setShowDeposit] = useState<Goal | null>(null)
  const [depositValue, setDepositValue] = useState('')

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('user_goals').select('*')
        .eq('user_id', user.id).order('order_index')
      setGoals(data ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  function openNew() {
    setEditGoal(null); setFNome(''); setFTarget(''); setFCurrent(''); setFDeadline(''); setFIcon('star')
    setShowModal(true)
  }

  function openEdit(g: Goal) {
    setEditGoal(g); setFNome(g.name); setFTarget(String(g.target_amount))
    setFCurrent(String(g.current_amount)); setFDeadline(g.deadline || ''); setFIcon(g.icon || 'star')
    setShowModal(true)
  }

  async function salvar() {
    if (!fNome.trim() || !fTarget) return Alert.alert('Erro', 'Preencha nome e valor')
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const payload = {
        user_id: user.id, name: fNome.trim(), target_amount: parseFloat(fTarget) || 0,
        current_amount: parseFloat(fCurrent) || 0, deadline: fDeadline || null, icon: fIcon,
      }
      if (editGoal) {
        await supabase.from('user_goals').update(payload).eq('id', editGoal.id)
      } else {
        await supabase.from('user_goals').insert(payload)
      }
      setShowModal(false); load()
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setSaving(false) }
  }

  async function depositar() {
    if (!showDeposit || !depositValue) return
    const val = parseFloat(depositValue.replace(/\./g, '').replace(',', '.')) || 0
    if (val <= 0) return Alert.alert('Erro', 'Informe o valor')
    const novo = showDeposit.current_amount + val
    await supabase.from('user_goals').update({ current_amount: novo }).eq('id', showDeposit.id)
    setShowDeposit(null); setDepositValue(''); load()
  }

  async function excluir(g: Goal) {
    Alert.alert('Excluir sonho', `Excluir "${g.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await supabase.from('user_goals').delete().eq('id', g.id)
        setGoals(prev => prev.filter(x => x.id !== g.id))
      }},
    ])
  }

  const totalTarget = goals.reduce((a, g) => a + g.target_amount, 0)
  const totalCurrent = goals.reduce((a, g) => a + g.current_amount, 0)
  const globalPct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0

  return (
    <ScreenLayout titulo="Sonhos">
      <ScrollView contentContainerStyle={s.content}>
        {/* Hero */}
        <View style={s.heroCard}>
          <Text style={s.heroEmoji}>✨</Text>
          <Text style={s.heroTitulo}>Meus Sonhos</Text>
          {goals.length > 0 && (
            <>
              <View style={s.globalBar}>
                <View style={[s.globalFill, { width: `${Math.min(globalPct, 100)}%` }]} />
              </View>
              <Text style={s.globalText}>{globalPct}% • {formatBRL(totalCurrent)} de {formatBRL(totalTarget)}</Text>
            </>
          )}
        </View>

        {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> :
         goals.length === 0 ? <EmptyState icon="star-outline" titulo="Nenhum sonho" descricao="Crie seus sonhos e acompanhe o progresso para realizá-los!" /> : (
          <View style={s.grid}>
            {goals.map(g => {
              const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0
              const iconData = ICONS.find(i => i.icon === g.icon) || ICONS[7]
              const concluido = pct >= 100
              return (
                <TouchableOpacity key={g.id} style={[s.card, concluido && s.cardConcluido]}
                  onPress={() => openEdit(g)} onLongPress={() => excluir(g)} activeOpacity={0.7}>
                  <View style={[s.cardIcone, { backgroundColor: iconData.bg }]}>
                    <Ionicons name={iconData.icon as any} size={24} color={concluido ? theme.income : theme.primary} />
                  </View>
                  <Text style={s.cardNome} numberOfLines={1}>{g.name}</Text>
                  <View style={s.cardBar}>
                    <View style={[s.cardBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: concluido ? theme.income : theme.primary }]} />
                  </View>
                  <Text style={[s.cardPct, concluido && { color: theme.income }]}>{pct}%</Text>
                  <Text style={s.cardValor}>{formatBRL(g.current_amount)}</Text>
                  <Text style={s.cardTarget}>de {formatBRL(g.target_amount)}</Text>
                  {!concluido && (
                    <TouchableOpacity style={s.depositBtn} onPress={() => { setShowDeposit(g); setDepositValue('') }}>
                      <Ionicons name="add-circle" size={14} color={theme.primary} />
                      <Text style={s.depositText}>Depositar</Text>
                    </TouchableOpacity>
                  )}
                  {concluido && <Text style={s.badgeConcluido}>🎉 Realizado!</Text>}
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={openNew}><Ionicons name="add" size={28} color="#fff" /></TouchableOpacity>

      {/* Modal novo/editar */}
      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={mo.container}>
          <View style={mo.header}><Text style={mo.titulo}>{editGoal ? 'Editar sonho' : 'Novo sonho'}</Text><TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={22} color={theme.textPrimary} /></TouchableOpacity></View>
          <ScrollView contentContainerStyle={mo.content} keyboardShouldPersistTaps="handled">
            <Text style={mo.label}>Nome</Text>
            <TextInput style={mo.input} value={fNome} onChangeText={setFNome} placeholder="Ex: Viagem Europa" placeholderTextColor={theme.textMuted} />
            <Text style={mo.label}>Valor alvo (R$)</Text>
            <TextInput style={mo.input} value={fTarget} onChangeText={setFTarget} placeholder="50000" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
            <Text style={mo.label}>Valor atual (R$)</Text>
            <TextInput style={mo.input} value={fCurrent} onChangeText={setFCurrent} placeholder="0" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
            <Text style={mo.label}>Prazo</Text>
            <TextInput style={mo.input} value={fDeadline} onChangeText={setFDeadline} placeholder="AAAA-MM-DD" placeholderTextColor={theme.textMuted} />
            <Text style={mo.label}>Ícone</Text>
            <View style={mo.iconsRow}>
              {ICONS.map(ic => (
                <TouchableOpacity key={ic.icon} style={[mo.iconBtn, fIcon === ic.icon && mo.iconBtnAtivo]} onPress={() => setFIcon(ic.icon)}>
                  <Ionicons name={ic.icon as any} size={20} color={fIcon === ic.icon ? '#fff' : theme.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[mo.salvarBtn, saving && { opacity: 0.6 }]} onPress={salvar} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={mo.salvarText}>Salvar</Text></>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal depositar */}
      <Modal visible={!!showDeposit} transparent animationType="fade" onRequestClose={() => setShowDeposit(null)}>
        <View style={dep.overlay}>
          <View style={dep.card}>
            <Text style={dep.titulo}>Depositar em "{showDeposit?.name}"</Text>
            <View style={dep.inputRow}>
              <Text style={dep.prefix}>R$</Text>
              <TextInput style={dep.input} value={depositValue} onChangeText={setDepositValue}
                placeholder="0,00" placeholderTextColor={theme.textMuted} keyboardType="numeric" autoFocus />
            </View>
            <View style={dep.btnRow}>
              <TouchableOpacity style={dep.cancelBtn} onPress={() => setShowDeposit(null)}>
                <Text style={dep.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={dep.okBtn} onPress={depositar}>
                <Text style={dep.okText}>Depositar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  )
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 80 },
  heroCard: { backgroundColor: theme.surface, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  heroEmoji: { fontSize: 32, marginBottom: 4 },
  heroTitulo: { fontSize: 18, fontWeight: '700', color: theme.textPrimary },
  globalBar: { width: '100%', height: 8, borderRadius: 4, backgroundColor: theme.bg, overflow: 'hidden', marginTop: 12 },
  globalFill: { height: '100%', borderRadius: 4, backgroundColor: theme.primary },
  globalText: { fontSize: 12, color: theme.textMuted, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', backgroundColor: theme.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  cardConcluido: { borderColor: theme.income, borderWidth: 2 },
  cardIcone: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  cardNome: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, marginBottom: 8, textAlign: 'center' },
  cardBar: { width: '100%', height: 6, borderRadius: 3, backgroundColor: theme.bg, overflow: 'hidden' },
  cardBarFill: { height: '100%', borderRadius: 3 },
  cardPct: { fontSize: 18, fontWeight: '700', color: theme.primary, marginTop: 6 },
  cardValor: { fontSize: 12, fontWeight: '600', color: theme.textPrimary, marginTop: 2 },
  cardTarget: { fontSize: 10, color: theme.textMuted },
  depositBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  depositText: { fontSize: 11, color: theme.primary, fontWeight: '600' },
  badgeConcluido: { fontSize: 11, color: theme.income, fontWeight: '600', marginTop: 6 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
})

const mo = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  titulo: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
  content: { padding: 16, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textPrimary, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.textPrimary },
  iconsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  iconBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface },
  iconBtnAtivo: { backgroundColor: theme.primary, borderColor: theme.primary },
  salvarBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 16, marginTop: 24 },
  salvarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})

const dep = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: theme.surface, borderRadius: 20, padding: 24, width: '100%' },
  titulo: { fontSize: 16, fontWeight: '600', color: theme.textPrimary, marginBottom: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bg, borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, height: 50 },
  prefix: { fontSize: 16, color: theme.textMuted, marginRight: 6 },
  input: { flex: 1, fontSize: 18, fontWeight: '600', color: theme.textPrimary },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  cancelText: { fontSize: 14, fontWeight: '600', color: theme.textMuted },
  okBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: theme.primary },
  okText: { fontSize: 14, fontWeight: '700', color: '#fff' },
})
