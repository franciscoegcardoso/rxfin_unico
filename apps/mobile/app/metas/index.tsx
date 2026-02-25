import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import {
  VictoryChart, VictoryBar, VictoryAxis, VictoryTheme,
  VictoryGroup, VictoryLegend,
} from 'victory-native'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { theme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

const SCREEN_WIDTH = Dimensions.get('window').width
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

function formatBRLShort(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(Math.round(v))
}

interface MonthlyGoal {
  month: string
  income_goal: number
  expense_goal: number
  savings_goal: number
}

interface MonthlyActual {
  month: string
  receitas: number
  despesas: number
}

function ProgressBar({ label, atual, meta, cor, icon }: {
  label: string; atual: number; meta: number; cor: string; icon: string
}) {
  const pct = meta > 0 ? Math.min(atual / meta, 1.5) : 0
  const pctDisplay = meta > 0 ? Math.round((atual / meta) * 100) : 0
  const isOver = label === 'Despesas' ? atual > meta : atual < meta
  const statusCor = label === 'Despesas'
    ? (atual <= meta ? theme.income : theme.expense)
    : (atual >= meta ? theme.income : theme.textMuted)

  return (
    <View style={pb.container}>
      <View style={pb.header}>
        <View style={pb.labelRow}>
          <Ionicons name={icon as any} size={16} color={cor} />
          <Text style={pb.label}>{label}</Text>
        </View>
        <Text style={[pb.pct, { color: statusCor }]}>{pctDisplay}%</Text>
      </View>
      <View style={pb.barBg}>
        <View style={[pb.barFill, { width: `${Math.min(pct * 100, 100)}%`, backgroundColor: cor }]} />
      </View>
      <View style={pb.valuesRow}>
        <Text style={pb.atual}>{formatBRL(atual)}</Text>
        <Text style={pb.meta}>Meta: {formatBRL(meta)}</Text>
      </View>
    </View>
  )
}

export default function MetasMensaisScreen() {
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<MonthlyGoal | null>(null)
  const [actuals, setActuals] = useState<MonthlyActual>({ month: '', receitas: 0, despesas: 0 })
  const [history, setHistory] = useState<MonthlyActual[]>([])
  const [editing, setEditing] = useState(false)
  const [editIncome, setEditIncome] = useState('')
  const [editExpense, setEditExpense] = useState('')
  const [editSavings, setEditSavings] = useState('')

  const now = new Date()
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load goals for current month
      const { data: g } = await supabase
        .from('monthly_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', mesAtual)
        .single()

      if (g) {
        setGoals({
          month: g.month,
          income_goal: Number(g.income_goal) || 0,
          expense_goal: Number(g.expense_goal) || 0,
          savings_goal: Number(g.savings_goal) || 0,
        })
        setEditIncome(String(g.income_goal || ''))
        setEditExpense(String(g.expense_goal || ''))
        setEditSavings(String(g.savings_goal || ''))
      }

      // Load actuals — from pluggy_transactions + lancamentos_realizados
      const ano = now.getFullYear()
      const mes = now.getMonth() + 1
      const m = String(mes).padStart(2, '0')
      const ultimo = new Date(ano, mes, 0).getDate()

      const { data: txs } = await supabase
        .from('pluggy_transactions')
        .select('amount, type')
        .eq('user_id', user.id)
        .gte('date', `${ano}-${m}-01`)
        .lte('date', `${ano}-${m}-${ultimo}`)

      let receitas = 0, despesas = 0
      txs?.forEach(t => {
        if (t.type === 'CREDIT') receitas += Number(t.amount)
        else despesas += Number(t.amount)
      })

      // Also check lancamentos_realizados
      const { data: lacs } = await supabase
        .from('lancamentos_realizados')
        .select('valor_realizado, tipo')
        .eq('user_id', user.id)
        .eq('mes_referencia', mesAtual)

      lacs?.forEach(l => {
        if (l.tipo === 'receita') receitas += Number(l.valor_realizado)
        else despesas += Number(l.valor_realizado)
      })

      setActuals({ month: mesAtual, receitas, despesas })

      // Load 6 month history
      const hist: MonthlyActual[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(ano, mes - 1 - i, 1)
        const hm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const hUltimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()

        const { data: hTxs } = await supabase
          .from('pluggy_transactions')
          .select('amount, type')
          .eq('user_id', user.id)
          .gte('date', `${hm}-01`)
          .lte('date', `${hm}-${String(hUltimo).padStart(2, '0')}`)

        let hRec = 0, hDesp = 0
        hTxs?.forEach(t => {
          if (t.type === 'CREDIT') hRec += Number(t.amount)
          else hDesp += Number(t.amount)
        })

        hist.push({ month: hm, receitas: hRec, despesas: hDesp })
      }
      setHistory(hist)

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  async function salvarMetas() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const payload = {
        user_id: user.id,
        month: mesAtual,
        income_goal: parseInt(editIncome) || 0,
        expense_goal: parseInt(editExpense) || 0,
        savings_goal: parseInt(editSavings) || 0,
      }

      if (goals) {
        const { error } = await supabase
          .from('monthly_goals')
          .update(payload)
          .eq('user_id', user.id)
          .eq('month', mesAtual)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('monthly_goals')
          .insert(payload)
        if (error) throw error
      }

      setGoals({
        month: mesAtual,
        income_goal: parseInt(editIncome) || 0,
        expense_goal: parseInt(editExpense) || 0,
        savings_goal: parseInt(editSavings) || 0,
      })
      setEditing(false)
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Falha ao salvar')
    }
  }

  const economia = actuals.receitas - actuals.despesas
  const metaEconomia = goals ? goals.savings_goal : 0

  // Chart data
  const chartData = history.map(h => ({
    x: h.month.substring(5),
    receitas: h.receitas,
    despesas: h.despesas,
  }))

  const diasNoMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const diaAtual = now.getDate()
  const pctMes = Math.round((diaAtual / diasNoMes) * 100)

  return (
    <ScreenLayout titulo="Metas Mensais">
      <ScrollView contentContainerStyle={styles.content}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcone}>
            <Ionicons name="trophy" size={28} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitulo}>
              {MESES[now.getMonth()]} {now.getFullYear()}
            </Text>
            <Text style={styles.heroDesc}>
              Dia {diaAtual} de {diasNoMes} ({pctMes}% do mês)
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditing(!editing)}
          >
            <Ionicons name={editing ? 'close' : 'create-outline'} size={18} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        ) : (
          <>
            {/* Editor de metas */}
            {editing && (
              <SectionCard titulo="Definir metas">
                <View style={styles.form}>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Meta de receita</Text>
                    <View style={styles.fieldInputRow}>
                      <Text style={styles.prefix}>R$</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={editIncome} onChangeText={setEditIncome}
                        keyboardType="numeric" placeholder="0"
                        placeholderTextColor={theme.textMuted}
                      />
                    </View>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Limite de despesa</Text>
                    <View style={styles.fieldInputRow}>
                      <Text style={styles.prefix}>R$</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={editExpense} onChangeText={setEditExpense}
                        keyboardType="numeric" placeholder="0"
                        placeholderTextColor={theme.textMuted}
                      />
                    </View>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Meta de economia</Text>
                    <View style={styles.fieldInputRow}>
                      <Text style={styles.prefix}>R$</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={editSavings} onChangeText={setEditSavings}
                        keyboardType="numeric" placeholder="0"
                        placeholderTextColor={theme.textMuted}
                      />
                    </View>
                  </View>
                  <TouchableOpacity style={styles.salvarMetaBtn} onPress={salvarMetas}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.salvarMetaText}>Salvar metas</Text>
                  </TouchableOpacity>
                </View>
              </SectionCard>
            )}

            {/* Resumo grande */}
            <View style={styles.resumoCard}>
              <View style={styles.resumoItem}>
                <Ionicons name="arrow-up-circle" size={20} color={theme.income} />
                <Text style={styles.resumoLabel}>Receitas</Text>
                <Text style={[styles.resumoValor, { color: theme.income }]}>{formatBRL(actuals.receitas)}</Text>
              </View>
              <View style={styles.resumoDivider} />
              <View style={styles.resumoItem}>
                <Ionicons name="arrow-down-circle" size={20} color={theme.expense} />
                <Text style={styles.resumoLabel}>Despesas</Text>
                <Text style={[styles.resumoValor, { color: theme.expense }]}>{formatBRL(actuals.despesas)}</Text>
              </View>
              <View style={styles.resumoDivider} />
              <View style={styles.resumoItem}>
                <Ionicons name="wallet" size={20} color={economia >= 0 ? theme.income : theme.expense} />
                <Text style={styles.resumoLabel}>Saldo</Text>
                <Text style={[styles.resumoValor, { color: economia >= 0 ? theme.income : theme.expense }]}>
                  {formatBRL(economia)}
                </Text>
              </View>
            </View>

            {/* Progresso das metas */}
            {goals && (goals.income_goal > 0 || goals.expense_goal > 0) ? (
              <SectionCard titulo="Progresso">
                <View style={styles.progressContent}>
                  {goals.income_goal > 0 && (
                    <ProgressBar
                      label="Receitas" atual={actuals.receitas} meta={goals.income_goal}
                      cor={theme.income} icon="arrow-up-circle-outline"
                    />
                  )}
                  {goals.expense_goal > 0 && (
                    <ProgressBar
                      label="Despesas" atual={actuals.despesas} meta={goals.expense_goal}
                      cor={theme.expense} icon="arrow-down-circle-outline"
                    />
                  )}
                  {goals.savings_goal > 0 && (
                    <ProgressBar
                      label="Economia" atual={Math.max(0, economia)} meta={goals.savings_goal}
                      cor="#3b82f6" icon="wallet-outline"
                    />
                  )}
                </View>
              </SectionCard>
            ) : !editing ? (
              <View style={styles.noGoalsCard}>
                <Ionicons name="flag-outline" size={24} color={theme.textMuted} />
                <Text style={styles.noGoalsText}>Defina suas metas para acompanhar seu progresso</Text>
                <TouchableOpacity style={styles.noGoalsBtn} onPress={() => setEditing(true)}>
                  <Text style={styles.noGoalsBtnText}>Definir metas</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Gráfico evolução 6 meses */}
            {chartData.length >= 2 && (
              <SectionCard titulo="Evolução (6 meses)">
                <View style={{ paddingVertical: 8 }}>
                  <VictoryChart
                    height={200} width={SCREEN_WIDTH - 64}
                    theme={VictoryTheme.material}
                    padding={{ top: 30, bottom: 40, left: 52, right: 12 }}
                    domainPadding={{ x: 20 }}
                  >
                    <VictoryLegend
                      x={70} y={0} orientation="horizontal" gutter={16}
                      data={[
                        { name: 'Receitas', symbol: { fill: theme.income } },
                        { name: 'Despesas', symbol: { fill: theme.expense } },
                      ]}
                      style={{ labels: { fontSize: 9, fill: theme.textMuted } }}
                    />
                    <VictoryAxis style={{
                      tickLabels: { fontSize: 9, fill: theme.textMuted },
                      grid: { stroke: 'transparent' },
                      axis: { stroke: theme.border },
                    }} />
                    <VictoryAxis dependentAxis
                      tickFormat={(v: number) => formatBRLShort(v)}
                      style={{
                        tickLabels: { fontSize: 8, fill: theme.textMuted },
                        grid: { stroke: theme.border, strokeDasharray: '4,4' },
                        axis: { stroke: 'transparent' },
                      }}
                    />
                    <VictoryGroup offset={14}>
                      <VictoryBar
                        data={chartData} x="x" y="receitas"
                        style={{ data: { fill: theme.income } }}
                        cornerRadius={{ top: 3 }} barWidth={12}
                      />
                      <VictoryBar
                        data={chartData} x="x" y="despesas"
                        style={{ data: { fill: theme.expense } }}
                        cornerRadius={{ top: 3 }} barWidth={12}
                      />
                    </VictoryGroup>
                  </VictoryChart>
                </View>
              </SectionCard>
            )}

            {/* Insight */}
            {actuals.receitas > 0 && (
              <View style={styles.insightCard}>
                <Ionicons name="bulb-outline" size={18} color={theme.primary} />
                <Text style={styles.insightText}>
                  {economia >= 0
                    ? `Você está economizando ${Math.round((economia / actuals.receitas) * 100)}% da sua renda este mês.`
                    : `Atenção: suas despesas superam suas receitas em ${formatBRL(Math.abs(economia))}.`
                  }
                  {goals?.expense_goal && actuals.despesas > 0
                    ? ` Ritmo de gasto: ${formatBRL((actuals.despesas / diaAtual) * diasNoMes)} projetado para o mês.`
                    : ''
                  }
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  )
}

const pb = StyleSheet.create({
  container: { marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },
  pct: { fontSize: 13, fontWeight: '700' },
  barBg: { height: 10, borderRadius: 5, backgroundColor: theme.bg, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  valuesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  atual: { fontSize: 12, fontWeight: '600', color: theme.textPrimary },
  meta: { fontSize: 11, color: theme.textMuted },
})

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
  heroDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  editBtn: {
    padding: 8, borderRadius: 20, backgroundColor: theme.bg,
    borderWidth: 1, borderColor: theme.border,
  },

  resumoCard: {
    flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 16,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border,
  },
  resumoItem: { flex: 1, alignItems: 'center', gap: 4 },
  resumoDivider: { width: 1, backgroundColor: theme.border },
  resumoLabel: { fontSize: 11, color: theme.textMuted },
  resumoValor: { fontSize: 15, fontWeight: '700' },

  progressContent: { padding: 16 },

  form: { padding: 16, gap: 4 },
  fieldRow: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: theme.textPrimary, marginBottom: 6 },
  fieldInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.bg, borderRadius: 12,
    borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, height: 46,
  },
  prefix: { fontSize: 14, color: theme.textMuted, marginRight: 6 },
  fieldInput: { flex: 1, fontSize: 15, color: theme.textPrimary },

  salvarMetaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 12, marginTop: 8,
  },
  salvarMetaText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  noGoalsCard: {
    backgroundColor: theme.surface, borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 8, marginBottom: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  noGoalsText: { fontSize: 13, color: theme.textMuted, textAlign: 'center' },
  noGoalsBtn: {
    backgroundColor: theme.primary, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10, marginTop: 4,
  },
  noGoalsBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, marginTop: 8,
  },
  insightText: { fontSize: 12, color: theme.primary, flex: 1, lineHeight: 18 },
})
