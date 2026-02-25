import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Dimensions,
} from 'react-native'
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme } from 'victory-native'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { SectionCard } from '@/components/ui/SectionCard'
import { theme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

const SCREEN_WIDTH = Dimensions.get('window').width

interface Veiculo {
  id: string; display_name: string; brand_name: string; model_name: string
  year_label: string | null; fipe_code: string | null; fipe_value: number | null
}

interface Registro {
  id: string; record_date: string; odometer: number | null
  fuel_liters: number | null; fuel_cost: number | null
  record_type: string; notes: string | null; metadata: any
}

type RecordType = 'fuel' | 'maintenance' | 'wash' | 'other'

const RECORD_TYPES: { value: RecordType; label: string; icon: string; cor: string }[] = [
  { value: 'fuel', label: 'Abastecimento', icon: 'water', cor: '#3b82f6' },
  { value: 'maintenance', label: 'Manutenção', icon: 'build', cor: '#f59e0b' },
  { value: 'wash', label: 'Lavagem', icon: 'sparkles', cor: '#8b5cf6' },
  { value: 'other', label: 'Outro', icon: 'ellipsis-horizontal', cor: '#6b7280' },
]

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

function formatData(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function VeiculoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [veiculo, setVeiculo] = useState<Veiculo | null>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [formType, setFormType] = useState<RecordType>('fuel')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formOdometer, setFormOdometer] = useState('')
  const [formLiters, setFormLiters] = useState('')
  const [formCost, setFormCost] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data: v } = await supabase
        .from('favorite_vehicles')
        .select('*').eq('id', id).single()
      setVeiculo(v)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: recs } = await supabase
        .from('user_vehicle_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('vehicle_id', id)
        .order('record_date', { ascending: false })
        .limit(100)
      setRegistros(recs ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, [id]))

  async function salvarRegistro() {
    if (!formCost && formType !== 'fuel') return Alert.alert('Erro', 'Informe o valor')
    if (formType === 'fuel' && !formLiters && !formCost) return Alert.alert('Erro', 'Informe litros ou valor')

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_vehicle_records')
        .insert({
          user_id: user.id,
          vehicle_id: id,
          record_date: formDate,
          odometer: formOdometer ? parseInt(formOdometer) : null,
          fuel_liters: formLiters ? parseFloat(formLiters.replace(',', '.')) : null,
          fuel_cost: formCost ? parseFloat(formCost.replace(/\./g, '').replace(',', '.')) : null,
          record_type: formType,
          notes: formNotes || null,
          metadata: formType !== 'fuel' && formCost
            ? { cost: parseFloat(formCost.replace(/\./g, '').replace(',', '.')) }
            : {},
        })

      if (error) throw error

      setShowModal(false)
      resetForm()
      load()
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setFormType('fuel')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormOdometer('')
    setFormLiters('')
    setFormCost('')
    setFormNotes('')
  }

  async function excluirRegistro(r: Registro) {
    Alert.alert('Excluir registro', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          await supabase.from('user_vehicle_records').delete().eq('id', r.id)
          setRegistros(prev => prev.filter(x => x.id !== r.id))
        },
      },
    ])
  }

  // Stats
  const fuelRecords = registros.filter(r => r.record_type === 'fuel')
  const totalFuelCost = fuelRecords.reduce((a, r) => a + (r.fuel_cost || 0), 0)
  const totalLiters = fuelRecords.reduce((a, r) => a + (r.fuel_liters || 0), 0)
  const avgPricePerLiter = totalLiters > 0 ? totalFuelCost / totalLiters : 0

  // km/l calculation from consecutive odometer readings
  const fuelWithOdo = fuelRecords.filter(r => r.odometer).sort((a, b) => (a.odometer! - b.odometer!))
  let avgKmL = 0
  if (fuelWithOdo.length >= 2) {
    const totalKm = fuelWithOdo[fuelWithOdo.length - 1].odometer! - fuelWithOdo[0].odometer!
    const totalL = fuelWithOdo.slice(1).reduce((a, r) => a + (r.fuel_liters || 0), 0)
    if (totalL > 0) avgKmL = totalKm / totalL
  }

  const maintenanceCost = registros
    .filter(r => r.record_type !== 'fuel')
    .reduce((a, r) => a + (r.fuel_cost || r.metadata?.cost || 0), 0)

  // Chart data - cost per month
  const monthlyData: { x: string; y: number }[] = []
  const byMonth: Record<string, number> = {}
  registros.forEach(r => {
    const m = r.record_date.substring(0, 7)
    const cost = r.fuel_cost || r.metadata?.cost || 0
    byMonth[m] = (byMonth[m] || 0) + cost
  })
  Object.entries(byMonth).sort().slice(-6).forEach(([m, v]) => {
    monthlyData.push({ x: m.substring(5), y: v })
  })

  if (loading) {
    return (
      <ScreenLayout titulo="Veículo">
        <View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View>
      </ScreenLayout>
    )
  }

  if (!veiculo) {
    return (
      <ScreenLayout titulo="Veículo">
        <View style={styles.center}>
          <Text style={styles.erroText}>Veículo não encontrado</Text>
        </View>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout titulo={veiculo.display_name}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Card principal */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcone}>
            <Ionicons name="car-sport" size={32} color={theme.primary} />
          </View>
          <Text style={styles.heroNome}>{veiculo.display_name}</Text>
          {veiculo.fipe_value && (
            <Text style={styles.heroValor}>{formatBRL(veiculo.fipe_value)}</Text>
          )}
          <Text style={styles.heroSub}>
            {veiculo.year_label}{veiculo.fipe_code ? ` • FIPE ${veiculo.fipe_code}` : ''}
          </Text>
        </View>

        {/* Métricas */}
        {registros.length > 0 && (
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Ionicons name="water-outline" size={18} color="#3b82f6" />
              <Text style={styles.metricValor}>{formatBRL(totalFuelCost)}</Text>
              <Text style={styles.metricLabel}>Combustível</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="speedometer-outline" size={18} color="#16a34a" />
              <Text style={styles.metricValor}>{avgKmL > 0 ? `${avgKmL.toFixed(1)} km/l` : '--'}</Text>
              <Text style={styles.metricLabel}>Consumo médio</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="build-outline" size={18} color="#f59e0b" />
              <Text style={styles.metricValor}>{formatBRL(maintenanceCost)}</Text>
              <Text style={styles.metricLabel}>Manutenção</Text>
            </View>
          </View>
        )}

        {/* Gráfico mensal */}
        {monthlyData.length >= 2 && (
          <SectionCard titulo="Gastos mensais">
            <View style={{ paddingVertical: 8 }}>
              <VictoryChart
                height={180} width={SCREEN_WIDTH - 64}
                theme={VictoryTheme.material}
                padding={{ top: 16, bottom: 36, left: 52, right: 16 }}
              >
                <VictoryAxis style={{
                  tickLabels: { fontSize: 9, fill: theme.textMuted },
                  grid: { stroke: 'transparent' },
                  axis: { stroke: theme.border },
                }} />
                <VictoryAxis dependentAxis
                  tickFormat={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
                  style={{
                    tickLabels: { fontSize: 9, fill: theme.textMuted },
                    grid: { stroke: theme.border, strokeDasharray: '4,4' },
                    axis: { stroke: 'transparent' },
                  }}
                />
                <VictoryLine
                  data={monthlyData}
                  style={{
                    data: { stroke: theme.primary, strokeWidth: 2.5 },
                  }}
                />
              </VictoryChart>
            </View>
          </SectionCard>
        )}

        {/* Registros */}
        <SectionCard titulo={`Registros (${registros.length})`}>
          {registros.length === 0 ? (
            <View style={styles.vazioBox}>
              <Ionicons name="document-text-outline" size={32} color={theme.textMuted} />
              <Text style={styles.vazioText}>Nenhum registro. Toque + para adicionar.</Text>
            </View>
          ) : (
            registros.map((r, i) => {
              const tipo = RECORD_TYPES.find(t => t.value === r.record_type) || RECORD_TYPES[3]
              const custo = r.fuel_cost || r.metadata?.cost || 0
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.regItem, i < registros.length - 1 && styles.regBorder]}
                  onLongPress={() => excluirRegistro(r)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.regIcone, { backgroundColor: tipo.cor + '20' }]}>
                    <Ionicons name={tipo.icon as any} size={16} color={tipo.cor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.regTipo}>{tipo.label}</Text>
                    <Text style={styles.regSub}>
                      {formatData(r.record_date)}
                      {r.odometer ? ` • ${r.odometer.toLocaleString('pt-BR')} km` : ''}
                      {r.fuel_liters ? ` • ${r.fuel_liters.toFixed(1)}L` : ''}
                    </Text>
                    {r.notes ? <Text style={styles.regNotes}>{r.notes}</Text> : null}
                  </View>
                  {custo > 0 && (
                    <Text style={styles.regCusto}>{formatBRL(custo)}</Text>
                  )}
                </TouchableOpacity>
              )
            })
          )}
        </SectionCard>

        {avgPricePerLiter > 0 && (
          <View style={styles.insightCard}>
            <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
            <Text style={styles.insightText}>
              Preço médio: R$ {avgPricePerLiter.toFixed(2)}/litro • Total: {totalLiters.toFixed(0)} litros abastecidos
            </Text>
          </View>
        )}

      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal novo registro */}
      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={modal.container}>
          <View style={modal.header}>
            <Text style={modal.titulo}>Novo Registro</Text>
            <TouchableOpacity onPress={() => { setShowModal(false); resetForm() }}>
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={modal.content} keyboardShouldPersistTaps="handled">
            {/* Tipo */}
            <Text style={modal.label}>Tipo</Text>
            <View style={modal.tipoRow}>
              {RECORD_TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[modal.tipoBtn, formType === t.value && { borderColor: t.cor, backgroundColor: t.cor + '15' }]}
                  onPress={() => setFormType(t.value)}
                >
                  <Ionicons name={t.icon as any} size={16} color={formType === t.value ? t.cor : theme.textMuted} />
                  <Text style={[modal.tipoText, formType === t.value && { color: t.cor }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Data */}
            <Text style={modal.label}>Data</Text>
            <TextInput
              style={modal.input}
              value={formDate} onChangeText={setFormDate}
              placeholder="AAAA-MM-DD" placeholderTextColor={theme.textMuted}
            />

            {/* Odômetro */}
            <Text style={modal.label}>Odômetro (km)</Text>
            <TextInput
              style={modal.input}
              value={formOdometer} onChangeText={setFormOdometer}
              placeholder="Ex: 45000" placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
            />

            {formType === 'fuel' && (
              <>
                <Text style={modal.label}>Litros</Text>
                <TextInput
                  style={modal.input}
                  value={formLiters} onChangeText={setFormLiters}
                  placeholder="Ex: 42,5" placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                />
              </>
            )}

            <Text style={modal.label}>Valor (R$)</Text>
            <TextInput
              style={modal.input}
              value={formCost} onChangeText={setFormCost}
              placeholder="Ex: 250,00" placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
            />

            <Text style={modal.label}>Observações</Text>
            <TextInput
              style={[modal.input, { height: 60, textAlignVertical: 'top' }]}
              value={formNotes} onChangeText={setFormNotes}
              placeholder="Opcional" placeholderTextColor={theme.textMuted}
              multiline
            />

            <TouchableOpacity
              style={[modal.salvarBtn, saving && { opacity: 0.6 }]}
              onPress={salvarRegistro} disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={modal.salvarText}>Salvar registro</Text>
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
  content: { padding: 16, paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  erroText: { color: theme.textMuted, fontSize: 15 },

  heroCard: {
    backgroundColor: theme.surface, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  heroIcone: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  heroNome: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, textAlign: 'center' },
  heroValor: { fontSize: 24, fontWeight: '700', color: theme.income, marginTop: 4 },
  heroSub: { fontSize: 12, color: theme.textMuted, marginTop: 4 },

  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metricCard: {
    flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: theme.border,
  },
  metricValor: { fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginTop: 4 },
  metricLabel: { fontSize: 10, color: theme.textMuted, marginTop: 2 },

  vazioBox: { alignItems: 'center', padding: 32, gap: 8 },
  vazioText: { fontSize: 13, color: theme.textMuted, textAlign: 'center' },

  regItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  regBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  regIcone: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  regTipo: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  regSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  regNotes: { fontSize: 11, color: theme.textSecondary, marginTop: 2, fontStyle: 'italic' },
  regCusto: { fontSize: 14, fontWeight: '600', color: theme.expense },

  insightCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, marginTop: 8,
  },
  insightText: { fontSize: 12, color: theme.primary, flex: 1, lineHeight: 18 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
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
  tipoRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tipoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface,
  },
  tipoText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  input: {
    backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.textPrimary,
  },
  salvarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 16, marginTop: 24,
  },
  salvarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
