import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Modal, Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import {
  VictoryChart, VictoryBar, VictoryAxis, VictoryTheme,
  VictoryStack, VictoryLine, VictoryLegend,
} from 'victory-native'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { SectionCard } from '@/components/ui/SectionCard'
import { theme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

const SCREEN_WIDTH = Dimensions.get('window').width
const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

function formatBRLShort(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(Math.round(v))
}

interface Goal {
  id: string; name: string; target_amount: number
  current_amount: number; deadline: string | null; icon: string | null
}

interface MonthData {
  mes: string; receitas: number; despesas: number
}

const GOAL_ICONS = [
  { icon: 'home-outline', label: 'Casa' },
  { icon: 'car-outline', label: 'Carro' },
  { icon: 'airplane-outline', label: 'Viagem' },
  { icon: 'school-outline', label: 'Educação' },
  { icon: 'medkit-outline', label: 'Saúde' },
  { icon: 'cash-outline', label: 'Reserva' },
  { icon: 'gift-outline', label: 'Presente' },
  { icon: 'diamond-outline', label: 'Luxo' },
]

export default function PlanejamentoAnualScreen() {
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<Goal[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)

  // Form
  const [formName, setFormName] = useState('')
  const [formTarget, setFormTarget] = useState('')
  const [formCurrent, setFormCurrent] = useState('')
  const [formDeadline, setFormDeadline] = useState('')
  const [formIcon, setFormIcon] = useState('cash-outline')
  const [saving, setSaving] = useState(false)

  const ano = new Date().getFullYear()
  const mesAtual = new Date().getMonth()

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Goals
      const { data: g } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index', { ascending: true })
      setGoals(g ?? [])

      // Monthly data for the year
      const monthly: MonthData[] = []
      for (let m = 0; m < 12; m++) {
        const mm = String(m + 1).padStart(2, '0')
        const ultimo = new Date(ano, m + 1, 0).getDate()

        const { data: txs } = await supabase
          .from('pluggy_transactions')
          .select('amount, type')
          .eq('user_id', user.id)
          .gte('date', `${ano}-${mm}-01`)
          .lte('date', `${ano}-${mm}-${ultimo}`)

        let rec = 0, desp = 0
        txs?.forEach(t => {
          if (t.type === 'CREDIT') rec += Number(t.amount)
          else desp += Number(t.amount)
        })

        monthly.push({ mes: MESES_SHORT[m], receitas: rec, despesas: desp })
      }
      setMonthlyData(monthly)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  function openNewGoal() {
    setEditGoal(null)
    setFormName(''); setFormTarget(''); setFormCurrent(''); setFormDeadline(''); setFormIcon('cash-outline')
    setShowModal(true)
  }

  function openEditGoal(g: Goal) {
    setEditGoal(g)
    setFormName(g.name)
    setFormTarget(String(g.target_amount))
    setFormCurrent(String(g.current_amount))
    setFormDeadline(g.deadline ?? '')
    setFormIcon(g.icon || 'cash-outline')
    setShowModal(true)
  }

  async function salvarGoal() {
    if (!formName.trim()) return Alert.alert('Erro', 'Informe o nome da meta')
    if (!formTarget || parseFloat(formTarget) <= 0) return Alert.alert('Erro', 'Informe o valor alvo')

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const payload = {
        user_id: user.id,
        name: formName.trim(),
        target_amount: parseFloat(formTarget),
        current_amount: parseFloat(formCurrent) || 0,
        deadline: formDeadline || null,
        icon: formIcon,
      }

      if (editGoal) {
        const { error } = await supabase
          .from('user_goals')
          .update(payload)
          .eq('id', editGoal.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('user_goals')
          .insert(payload)
        if (error) throw error
      }

      setShowModal(false)
      load()
    } catch (e: any) {
      Alert.alert('Erro', e.message)
    } finally {
      setSaving(false)
    }
  }

  async function excluirGoal(g: Goal) {
    Alert.alert('Excluir meta', `Excluir "${g.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          await supabase.from('user_goals').delete().eq('id', g.id)
          setGoals(prev => prev.filter(x => x.id !== g.id))
        },
      },
    ])
  }

  // Stats
  const totalReceitas = monthlyData.reduce((a, m) => a + m.receitas, 0)
  const totalDespesas = monthlyData.reduce((a, m) => a + m.despesas, 0)
  const saldoAno = totalReceitas - totalDespesas

  // Projeção baseada na média dos meses passados
  const mesesPassados = monthlyData.filter((_, i) => i <= mesAtual && (monthlyData[i].receitas > 0 || monthlyData[i].despesas > 0))
  const avgRec = mesesPassados.length > 0 ? totalReceitas / mesesPassados.length : 0
  const avgDesp = mesesPassados.length > 0 ? totalDespesas / mesesPassados.length : 0
  const mesesRestantes = 11 - mesAtual
  const projecaoReceitas = totalReceitas + avgRec * mesesRestantes
  const projecaoDespesas = totalDespesas + avgDesp * mesesRestantes
  const projecaoSaldo = projecaoReceitas - projecaoDespesas

  // Chart data (only months with data + projection)
  const chartData = monthlyData.map((m, i) => ({
    x: m.mes,
    receitas: m.receitas,
    despesas: m.despesas,
    projecaoRec: i > mesAtual ? avgRec : 0,
    projecaoDesp: i > mesAtual ? avgDesp : 0,
  }))

  // Goals total
  const totalGoalTarget = goals.reduce((a, g) => a + g.target_amount, 0)
  const totalGoalCurrent = goals.reduce((a, g) => a + g.current_amount, 0)

  return (
    <ScreenLayout titulo="Planejamento Anual">
      <ScrollView contentContainerStyle={styles.content}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcone}>
            <Ionicons name="calendar-number" size={28} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitulo}>Visão {ano}</Text>
            <Text style={styles.heroDesc}>
              Acompanhe seu ano financeiro e planeje suas metas de longo prazo.
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        ) : (
          <>
            {/* Resumo anual */}
            <View style={styles.annualCard}>
              <View style={styles.annualRow}>
                <View style={styles.annualItem}>
                  <Text style={styles.annualLabel}>Receitas {ano}</Text>
                  <Text style={[styles.annualValor, { color: theme.income }]}>{formatBRL(totalReceitas)}</Text>
                </View>
                <View style={styles.annualItem}>
                  <Text style={styles.annualLabel}>Despesas {ano}</Text>
                  <Text style={[styles.annualValor, { color: theme.expense }]}>{formatBRL(totalDespesas)}</Text>
                </View>
              </View>
              <View style={styles.annualDivider} />
              <View style={styles.annualRow}>
                <View style={styles.annualItem}>
                  <Text style={styles.annualLabel}>Saldo acumulado</Text>
                  <Text style={[styles.annualValor, { color: saldoAno >= 0 ? theme.income : theme.expense }]}>
                    {formatBRL(saldoAno)}
                  </Text>
                </View>
                <View style={styles.annualItem}>
                  <Text style={styles.annualLabel}>Projeção dez</Text>
                  <Text style={[styles.annualValor, { color: projecaoSaldo >= 0 ? theme.income : theme.expense }]}>
                    {formatBRL(projecaoSaldo)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Gráfico anual */}
            {monthlyData.some(m => m.receitas > 0 || m.despesas > 0) && (
              <SectionCard titulo="Receitas × Despesas por mês">
                <View style={{ paddingVertical: 8 }}>
                  <VictoryChart
                    height={220} width={SCREEN_WIDTH - 64}
                    theme={VictoryTheme.material}
                    padding={{ top: 30, bottom: 40, left: 48, right: 8 }}
                    domainPadding={{ x: 12 }}
                  >
                    <VictoryLegend
                      x={50} y={0} orientation="horizontal" gutter={12}
                      data={[
                        { name: 'Receitas', symbol: { fill: theme.income } },
                        { name: 'Despesas', symbol: { fill: theme.expense } },
                      ]}
                      style={{ labels: { fontSize: 8, fill: theme.textMuted } }}
                    />
                    <VictoryAxis style={{
                      tickLabels: { fontSize: 7, fill: theme.textMuted },
                      grid: { stroke: 'transparent' },
                      axis: { stroke: theme.border },
                    }} />
                    <VictoryAxis dependentAxis
                      tickFormat={(v: number) => formatBRLShort(v)}
                      style={{
                        tickLabels: { fontSize: 7, fill: theme.textMuted },
                        grid: { stroke: theme.border, strokeDasharray: '4,4' },
                        axis: { stroke: 'transparent' },
                      }}
                    />
                    <VictoryBar
                      data={chartData} x="x" y="receitas"
                      style={{ data: { fill: theme.income, opacity: 0.8 } }}
                      cornerRadius={{ top: 2 }} barWidth={8}
                    />
                    <VictoryBar
                      data={chartData} x="x" y="despesas"
                      style={{ data: { fill: theme.expense, opacity: 0.8 } }}
                      cornerRadius={{ top: 2 }} barWidth={8}
                    />
                  </VictoryChart>
                </View>
              </SectionCard>
            )}

            {/* Metas de longo prazo */}
            <SectionCard titulo={`Metas (${goals.length})`}>
              {goals.length === 0 ? (
                <View style={styles.emptyGoals}>
                  <Ionicons name="flag-outline" size={32} color={theme.textMuted} />
                  <Text style={styles.emptyGoalsText}>Crie metas como reserva de emergência, viagem, ou entrada do imóvel.</Text>
                </View>
              ) : (
                goals.map((g, i) => {
                  const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.goalItem, i < goals.length - 1 && styles.goalBorder]}
                      onPress={() => openEditGoal(g)}
                      onLongPress={() => excluirGoal(g)}
                    >
                      <View style={styles.goalIcone}>
                        <Ionicons name={(g.icon || 'cash-outline') as any} size={20} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.goalNome}>{g.name}</Text>
                        <View style={styles.goalBarBg}>
                          <View style={[styles.goalBarFill, { width: `${Math.min(pct, 100)}%` }]} />
                        </View>
                        <View style={styles.goalValues}>
                          <Text style={styles.goalAtual}>{formatBRL(g.current_amount)}</Text>
                          <Text style={styles.goalTarget}>de {formatBRL(g.target_amount)}</Text>
                        </View>
                      </View>
                      <Text style={[styles.goalPct, { color: pct >= 100 ? theme.income : theme.primary }]}>
                        {Math.round(pct)}%
                      </Text>
                    </TouchableOpacity>
                  )
                })
              )}
              <TouchableOpacity style={styles.addGoalBtn} onPress={openNewGoal}>
                <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
                <Text style={styles.addGoalText}>Nova meta</Text>
              </TouchableOpacity>
            </SectionCard>

            {/* Insight */}
            {avgRec > 0 && (
              <View style={styles.insightCard}>
                <Ionicons name="analytics-outline" size={18} color={theme.primary} />
                <Text style={styles.insightText}>
                  Média mensal: {formatBRL(avgRec)} receita, {formatBRL(avgDesp)} despesa.
                  {avgRec > avgDesp
                    ? ` Economia média de ${formatBRL(avgRec - avgDesp)}/mês (${Math.round(((avgRec - avgDesp) / avgRec) * 100)}%).`
                    : ' Atenção: gasto médio superior à receita.'
                  }
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modal nova/editar meta */}
      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={modal.container}>
          <View style={modal.header}>
            <Text style={modal.titulo}>{editGoal ? 'Editar meta' : 'Nova meta'}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={modal.content} keyboardShouldPersistTaps="handled">

            <Text style={modal.label}>Nome da meta</Text>
            <TextInput
              style={modal.input} value={formName} onChangeText={setFormName}
              placeholder="Ex: Reserva de emergência" placeholderTextColor={theme.textMuted}
            />

            <Text style={modal.label}>Valor alvo (R$)</Text>
            <TextInput
              style={modal.input} value={formTarget} onChangeText={setFormTarget}
              placeholder="Ex: 50000" placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
            />

            <Text style={modal.label}>Valor atual (R$)</Text>
            <TextInput
              style={modal.input} value={formCurrent} onChangeText={setFormCurrent}
              placeholder="Ex: 12000" placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
            />

            <Text style={modal.label}>Prazo (opcional)</Text>
            <TextInput
              style={modal.input} value={formDeadline} onChangeText={setFormDeadline}
              placeholder="AAAA-MM-DD" placeholderTextColor={theme.textMuted}
            />

            <Text style={modal.label}>Ícone</Text>
            <View style={modal.iconsRow}>
              {GOAL_ICONS.map(gi => (
                <TouchableOpacity
                  key={gi.icon}
                  style={[modal.iconBtn, formIcon === gi.icon && modal.iconBtnAtivo]}
                  onPress={() => setFormIcon(gi.icon)}
                >
                  <Ionicons name={gi.icon as any} size={20} color={formIcon === gi.icon ? '#fff' : theme.textMuted} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[modal.salvarBtn, saving && { opacity: 0.6 }]}
              onPress={salvarGoal} disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={modal.salvarText}>{editGoal ? 'Salvar' : 'Criar meta'}</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  center: { paddingTop: 60, alignItems: 'center' },

  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.surface, borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: theme.border,
  },
  heroIcone: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center',
  },
  heroTitulo: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  heroDesc: { fontSize: 12, color: theme.textMuted, lineHeight: 18, marginTop: 2 },

  annualCard: {
    backgroundColor: theme.surface, borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: theme.border,
  },
  annualRow: { flexDirection: 'row' },
  annualItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  annualLabel: { fontSize: 11, color: theme.textMuted, marginBottom: 4 },
  annualValor: { fontSize: 17, fontWeight: '700' },
  annualDivider: { height: 1, backgroundColor: theme.border, marginVertical: 4 },

  emptyGoals: { alignItems: 'center', padding: 24, gap: 8 },
  emptyGoalsText: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 20 },

  goalItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  goalBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  goalIcone: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center',
  },
  goalNome: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, marginBottom: 6 },
  goalBarBg: { height: 6, borderRadius: 3, backgroundColor: theme.bg, overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: 3, backgroundColor: theme.primary },
  goalValues: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  goalAtual: { fontSize: 11, fontWeight: '600', color: theme.textPrimary },
  goalTarget: { fontSize: 11, color: theme.textMuted },
  goalPct: { fontSize: 16, fontWeight: '700' },

  addGoalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14,
  },
  addGoalText: { fontSize: 14, fontWeight: '600', color: theme.primary },

  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, marginTop: 8,
  },
  insightText: { fontSize: 12, color: theme.primary, flex: 1, lineHeight: 18 },
})

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  titulo: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
  content: { padding: 16, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textPrimary, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.textPrimary,
  },
  iconsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  iconBtn: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface,
  },
  iconBtnAtivo: { backgroundColor: theme.primary, borderColor: theme.primary },
  salvarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 16, marginTop: 24,
  },
  salvarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
