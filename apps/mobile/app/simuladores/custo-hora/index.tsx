import { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { VictoryPie, VictoryChart, VictoryBar, VictoryAxis, VictoryTheme } from 'victory-native'
import { ScreenLayout } from '../../../src/components/ui/ScreenLayout'
import { SectionCard } from '../../../src/components/ui/SectionCard'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import { theme } from '../../../src/lib/theme'

const SCREEN_WIDTH = Dimensions.get('window').width

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseMoney(text: string): number {
  return parseFloat(text.replace(/\./g, '').replace(',', '.')) || 0
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

// ─── Input reutilizável ──────────────────────────────────────────────────────
interface InputProps {
  label: string
  value: string
  onChangeText: (t: string) => void
  placeholder: string
  prefix?: string
  suffix?: string
  hint?: string
}

function InputField({ label, value, onChangeText, placeholder, prefix, suffix, hint }: InputProps) {
  return (
    <View style={inp.wrapper}>
      <Text style={inp.label}>{label}</Text>
      {hint && <Text style={inp.hint}>{hint}</Text>}
      <View style={inp.row}>
        {prefix && <Text style={inp.prefix}>{prefix}</Text>}
        <TextInput
          style={[inp.input, prefix && { paddingLeft: 0 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          keyboardType="numeric"
        />
        {suffix && <Text style={inp.suffix}>{suffix}</Text>}
      </View>
    </View>
  )
}

// ─── Metric row ──────────────────────────────────────────────────────────────
function MetricRow({ label, valor, cor, destaque }: {
  label: string; valor: string; cor?: string; destaque?: boolean
}) {
  return (
    <View style={[met.row, destaque && met.rowDestaque]}>
      <Text style={[met.label, destaque && met.labelDestaque]}>{label}</Text>
      <Text style={[met.valor, cor ? { color: cor } : {}, destaque && met.valorDestaque]}>
        {valor}
      </Text>
    </View>
  )
}

// ─── Comparação card ─────────────────────────────────────────────────────────
function CompararItem({ label, valor, custoHora, icon }: {
  label: string; valor: number; custoHora: number; icon: string
}) {
  const horas = valor / custoHora
  const horasInt = Math.floor(horas)
  const min = Math.round((horas - horasInt) * 60)

  return (
    <View style={comp.item}>
      <View style={comp.iconBox}>
        <Ionicons name={icon as any} size={20} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={comp.label}>{label}</Text>
        <Text style={comp.valor}>{formatBRL(valor)}</Text>
      </View>
      <View style={comp.horasBox}>
        <Text style={comp.horasValor}>
          {horasInt > 0 ? `${horasInt}h` : ''}{min > 0 ? `${min}min` : horasInt > 0 ? '' : '0min'}
        </Text>
        <Text style={comp.horasLabel}>de trabalho</Text>
      </View>
    </View>
  )
}

// ─── Categorias de despesas ──────────────────────────────────────────────────
interface DespesaCategoria {
  key: string
  label: string
  icon: string
  cor: string
}

const CATEGORIAS: DespesaCategoria[] = [
  { key: 'moradia', label: 'Moradia', icon: 'home-outline', cor: '#3b82f6' },
  { key: 'transporte', label: 'Transporte', icon: 'car-outline', cor: '#f59e0b' },
  { key: 'alimentacao', label: 'Alimentação', icon: 'restaurant-outline', cor: '#10b981' },
  { key: 'saude', label: 'Saúde', icon: 'medkit-outline', cor: '#ef4444' },
  { key: 'educacao', label: 'Educação', icon: 'school-outline', cor: '#8b5cf6' },
  { key: 'lazer', label: 'Lazer', icon: 'game-controller-outline', cor: '#ec4899' },
]

// ─── Tela principal ──────────────────────────────────────────────────────────
export default function CustoHoraScreen() {
  // Renda
  const [rendaBruta, setRendaBruta] = useState('')
  const [impostos, setImpostos] = useState('')

  // Tempo
  const [horasDia, setHorasDia] = useState('8')
  const [diasSemana, setDiasSemana] = useState('5')
  const [deslocamentoDia, setDeslocamentoDia] = useState('')

  // Despesas (opcionais — expandíveis)
  const [showDespesas, setShowDespesas] = useState(false)
  const [despesas, setDespesas] = useState<Record<string, string>>({
    moradia: '', transporte: '', alimentacao: '', saude: '', educacao: '', lazer: '',
  })

  const resultado = useMemo(() => {
    const renda = parseMoney(rendaBruta)
    const imp = parseFloat(impostos.replace(',', '.')) || 0
    const hDia = parseFloat(horasDia.replace(',', '.')) || 8
    const dSem = parseInt(diasSemana) || 5
    const desloc = parseFloat(deslocamentoDia.replace(',', '.')) || 0

    if (renda <= 0) return null

    // Cálculos base
    const rendaLiquida = renda * (1 - imp / 100)
    const diasMes = dSem * 4.33 // média de semanas por mês
    const horasTrabalhoMes = hDia * diasMes
    const horasDeslocMes = desloc * diasMes
    const horasTotaisMes = horasTrabalhoMes + horasDeslocMes

    // Despesas totais
    const totalDespesas = Object.values(despesas).reduce((s, v) => s + parseMoney(v), 0)

    // Custo por hora (3 perspectivas)
    const custoHoraBruto = renda / horasTrabalhoMes
    const custoHoraLiquido = rendaLiquida / horasTrabalhoMes
    const custoHoraReal = (rendaLiquida - totalDespesas) / horasTotaisMes
    const custoHoraTrabalho = rendaLiquida / horasTotaisMes

    // Dados para gráfico de pizza (despesas)
    const despesasChart = CATEGORIAS
      .map(cat => ({
        x: cat.label,
        y: parseMoney(despesas[cat.key]) || 0,
        cor: cat.cor,
      }))
      .filter(d => d.y > 0)

    // Quanto sobra
    const sobra = rendaLiquida - totalDespesas

    // Dados para gráfico de barras (comparação de custos hora)
    const barrasData = [
      { label: 'Bruto', valor: custoHoraBruto, cor: theme.textMuted },
      { label: 'Líquido', valor: custoHoraLiquido, cor: theme.primary },
      { label: 'c/ desloc.', valor: custoHoraTrabalho, cor: theme.warning },
    ]
    if (totalDespesas > 0) {
      barrasData.push({ label: 'Real', valor: Math.max(custoHoraReal, 0), cor: theme.expense })
    }

    return {
      rendaLiquida,
      horasTrabalhoMes: Math.round(horasTrabalhoMes),
      horasDeslocMes: Math.round(horasDeslocMes),
      horasTotaisMes: Math.round(horasTotaisMes),
      custoHoraBruto,
      custoHoraLiquido,
      custoHoraTrabalho,
      custoHoraReal,
      totalDespesas,
      sobra,
      despesasChart,
      barrasData,
    }
  }, [rendaBruta, impostos, horasDia, diasSemana, deslocamentoDia, despesas])

  function limpar() {
    setRendaBruta('')
    setImpostos('')
    setHorasDia('8')
    setDiasSemana('5')
    setDeslocamentoDia('')
    setDespesas({ moradia: '', transporte: '', alimentacao: '', saude: '', educacao: '', lazer: '' })
    setShowDespesas(false)
  }

  return (
    <ScreenLayout titulo="Custo por Hora">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcone}>
            <Ionicons name="time" size={28} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitulo}>Simulador de Custo por Hora</Text>
            <Text style={styles.heroDesc}>
              Descubra quanto realmente vale cada hora do seu dia, considerando impostos, deslocamento e despesas.
            </Text>
          </View>
        </View>

        {/* Renda */}
        <SectionCard titulo="Sua renda">
          <View style={styles.form}>
            <InputField
              label="Renda bruta mensal"
              value={rendaBruta}
              onChangeText={setRendaBruta}
              placeholder="8.000,00"
              prefix="R$"
            />
            <InputField
              label="Impostos / deduções"
              value={impostos}
              onChangeText={setImpostos}
              placeholder="27,5"
              suffix="%"
              hint="IRRF + INSS + outros descontos"
            />
          </View>
        </SectionCard>

        {/* Tempo */}
        <SectionCard titulo="Seu tempo">
          <View style={styles.form}>
            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Horas por dia"
                  value={horasDia}
                  onChangeText={setHorasDia}
                  placeholder="8"
                  suffix="h"
                />
              </View>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Dias por semana"
                  value={diasSemana}
                  onChangeText={setDiasSemana}
                  placeholder="5"
                  suffix="dias"
                />
              </View>
            </View>
            <InputField
              label="Deslocamento (ida + volta)"
              value={deslocamentoDia}
              onChangeText={setDeslocamentoDia}
              placeholder="2"
              suffix="h/dia"
              hint="Tempo gasto no trânsito por causa do trabalho"
            />
          </View>
        </SectionCard>

        {/* Despesas (expansível) */}
        <TouchableOpacity
          style={styles.despesasToggle}
          onPress={() => setShowDespesas(!showDespesas)}
        >
          <View style={styles.despesasToggleLeft}>
            <Ionicons name="wallet-outline" size={18} color={theme.primary} />
            <Text style={styles.despesasToggleText}>
              Adicionar despesas fixas
            </Text>
          </View>
          <View style={styles.despesasToggleBadge}>
            <Text style={styles.despesasToggleBadgeText}>
              {showDespesas ? 'Recolher' : 'Opcional'}
            </Text>
            <Ionicons
              name={showDespesas ? 'chevron-up' : 'chevron-down'}
              size={16} color={theme.textMuted}
            />
          </View>
        </TouchableOpacity>

        {showDespesas && (
          <SectionCard titulo="Despesas fixas mensais">
            <View style={styles.form}>
              {CATEGORIAS.map(cat => (
                <View key={cat.key} style={styles.despesaRow}>
                  <View style={[styles.despesaDot, { backgroundColor: cat.cor }]} />
                  <View style={{ flex: 1 }}>
                    <InputField
                      label={cat.label}
                      value={despesas[cat.key]}
                      onChangeText={(t) => setDespesas(prev => ({ ...prev, [cat.key]: t }))}
                      placeholder="0,00"
                      prefix="R$"
                    />
                  </View>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* Botão limpar */}
        {rendaBruta && (
          <TouchableOpacity style={styles.limparBtn} onPress={limpar}>
            <Ionicons name="refresh-outline" size={16} color={theme.textMuted} />
            <Text style={styles.limparText}>Limpar campos</Text>
          </TouchableOpacity>
        )}

        {/* ─── RESULTADOS ─── */}
        {resultado && (
          <>
            {/* Card destaque - Custo hora principal */}
            <View style={styles.destaqueCard}>
              <Text style={styles.destaqueLabel}>Seu custo real por hora</Text>
              <Text style={styles.destaqueValor}>
                {formatBRL(resultado.totalDespesas > 0 ? resultado.custoHoraReal : resultado.custoHoraTrabalho)}
              </Text>
              <Text style={styles.destaqueSub}>
                {resultado.horasTotaisMes}h/mês dedicadas ao trabalho
                {resultado.horasDeslocMes > 0 && ` (${resultado.horasDeslocMes}h de deslocamento)`}
              </Text>
            </View>

            {/* Comparação de perspectivas */}
            <SectionCard titulo="Perspectivas do custo/hora">
              <View style={styles.perspectivas}>
                <MetricRow
                  label="💰 Hora bruta"
                  valor={formatBRL(resultado.custoHoraBruto)}
                  destaque
                />
                <MetricRow
                  label="📋 Hora líquida (- impostos)"
                  valor={formatBRL(resultado.custoHoraLiquido)}
                  cor={theme.primary}
                />
                <MetricRow
                  label="🚗 Com deslocamento"
                  valor={formatBRL(resultado.custoHoraTrabalho)}
                  cor={theme.warning}
                />
                {resultado.totalDespesas > 0 && (
                  <MetricRow
                    label="🎯 Real (livre de despesas)"
                    valor={formatBRL(resultado.custoHoraReal)}
                    cor={resultado.custoHoraReal > 0 ? theme.income : theme.expense}
                    destaque
                  />
                )}
              </View>
            </SectionCard>

            {/* Gráfico de barras - comparação */}
            <SectionCard titulo="Comparação visual">
              <View style={{ paddingVertical: 8 }}>
                <VictoryChart
                  height={200}
                  width={SCREEN_WIDTH - 64}
                  theme={VictoryTheme.material}
                  padding={{ top: 16, bottom: 40, left: 64, right: 16 }}
                  domainPadding={{ x: 24 }}
                >
                  <VictoryAxis
                    style={{
                      tickLabels: { fontSize: 10, fill: theme.textMuted },
                      grid: { stroke: 'transparent' },
                      axis: { stroke: theme.border },
                    }}
                  />
                  <VictoryAxis
                    dependentAxis
                    tickFormat={(v: number) => `R$${v.toFixed(0)}`}
                    style={{
                      tickLabels: { fontSize: 9, fill: theme.textMuted },
                      grid: { stroke: theme.border, strokeDasharray: '4,4' },
                      axis: { stroke: 'transparent' },
                    }}
                  />
                  <VictoryBar
                    data={resultado.barrasData}
                    x="label"
                    y="valor"
                    style={{
                      data: { fill: ({ datum }) => datum.cor },
                    }}
                    cornerRadius={{ top: 4 }}
                    animate={{ duration: 500 }}
                    barWidth={36}
                  />
                </VictoryChart>
              </View>
            </SectionCard>

            {/* Gráfico de pizza - despesas */}
            {resultado.despesasChart.length > 0 && (
              <SectionCard titulo="Distribuição das despesas">
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <VictoryPie
                    data={resultado.despesasChart}
                    colorScale={resultado.despesasChart.map(d => d.cor)}
                    height={200}
                    width={SCREEN_WIDTH - 80}
                    innerRadius={50}
                    padAngle={2}
                    labels={({ datum }) => `${datum.x}\n${formatBRL(datum.y)}`}
                    style={{
                      labels: { fontSize: 9, fill: theme.textPrimary },
                    }}
                    animate={{ duration: 500 }}
                  />
                </View>
                <View style={styles.resumoDespesas}>
                  <MetricRow label="Total despesas" valor={formatBRL(resultado.totalDespesas)} cor={theme.expense} />
                  <MetricRow label="Renda líquida" valor={formatBRL(resultado.rendaLiquida)} cor={theme.primary} />
                  <View style={met.divider} />
                  <MetricRow
                    label="Sobra mensal"
                    valor={formatBRL(resultado.sobra)}
                    cor={resultado.sobra >= 0 ? theme.income : theme.expense}
                    destaque
                  />
                </View>
              </SectionCard>
            )}

            {/* Equivalências */}
            <SectionCard titulo="Quanto custa em horas de trabalho?">
              <View style={comp.container}>
                <CompararItem
                  label="Almoço executivo"
                  valor={45}
                  custoHora={resultado.custoHoraTrabalho}
                  icon="restaurant-outline"
                />
                <CompararItem
                  label="Tanque de gasolina"
                  valor={300}
                  custoHora={resultado.custoHoraTrabalho}
                  icon="speedometer-outline"
                />
                <CompararItem
                  label="Celular novo"
                  valor={3000}
                  custoHora={resultado.custoHoraTrabalho}
                  icon="phone-portrait-outline"
                />
                <CompararItem
                  label="Viagem de fim de semana"
                  valor={1500}
                  custoHora={resultado.custoHoraTrabalho}
                  icon="airplane-outline"
                />
                <CompararItem
                  label="Netflix (mensal)"
                  valor={55.90}
                  custoHora={resultado.custoHoraTrabalho}
                  icon="tv-outline"
                />
              </View>
            </SectionCard>

            {/* Dica */}
            <View style={styles.dicaCard}>
              <Ionicons name="bulb-outline" size={20} color={theme.warning} />
              <Text style={styles.dicaTexto}>
                Antes de comprar algo, divida o preço pelo seu custo/hora ({formatBRL(resultado.custoHoraTrabalho)}).
                Pergunte-se: <Text style={{ fontWeight: '700' }}>"Vale X horas da minha vida?"</Text>
              </Text>
            </View>
          </>
        )}

        {/* Empty state */}
        {!resultado && (
          <EmptyState
            icon="time-outline"
            titulo="Descubra o valor da sua hora"
            descricao="Preencha sua renda e horas de trabalho para calcular quanto realmente custa cada hora do seu dia."
          />
        )}

      </ScrollView>
    </ScreenLayout>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },

  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.surface, borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: theme.border,
  },
  heroIcone: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center',
  },
  heroTitulo: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginBottom: 3 },
  heroDesc: { fontSize: 12, color: theme.textMuted, lineHeight: 18 },

  form: { padding: 16, gap: 4 },
  rowInputs: { flexDirection: 'row', gap: 12 },

  despesasToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.surface, borderRadius: 12,
    borderWidth: 1, borderColor: theme.border,
    padding: 14, marginBottom: 16,
  },
  despesasToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  despesasToggleText: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  despesasToggleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  despesasToggleBadgeText: { fontSize: 12, color: theme.textMuted },

  despesaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  despesaDot: { width: 6, height: 6, borderRadius: 3, marginTop: 18 },

  limparBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, marginBottom: 16,
  },
  limparText: { fontSize: 13, color: theme.textMuted },

  destaqueCard: {
    backgroundColor: '#f0fdf4', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  destaqueLabel: { fontSize: 13, color: theme.textSecondary },
  destaqueValor: { fontSize: 36, fontWeight: 'bold', color: theme.primary, marginTop: 4 },
  destaqueSub: { fontSize: 12, color: theme.textMuted, marginTop: 8, textAlign: 'center' },

  perspectivas: { padding: 16 },

  resumoDespesas: { padding: 16, paddingTop: 0 },

  dicaCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fef3c7', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#fde68a', marginBottom: 16,
  },
  dicaTexto: { fontSize: 13, color: '#92400e', lineHeight: 20, flex: 1 },
})

const inp = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textPrimary, marginBottom: 2 },
  hint: { fontSize: 11, color: theme.textMuted, marginBottom: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.bg, borderRadius: 12,
    borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 14, height: 46,
  },
  prefix: { fontSize: 14, color: theme.textMuted, marginRight: 6 },
  suffix: { fontSize: 13, color: theme.textMuted, marginLeft: 4 },
  input: { flex: 1, fontSize: 15, color: theme.textPrimary },
})

const met = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  rowDestaque: {
    backgroundColor: '#f0fdf4', marginHorizontal: -16, paddingHorizontal: 16,
    borderRadius: 8, paddingVertical: 10,
  },
  label: { fontSize: 13, color: theme.textSecondary },
  labelDestaque: { fontWeight: '600', color: theme.textPrimary },
  valor: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  valorDestaque: { fontSize: 16, fontWeight: '700' },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 4 },
})

const comp = StyleSheet.create({
  container: { padding: 8 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center',
  },
  label: { fontSize: 13, color: theme.textPrimary, fontWeight: '500' },
  valor: { fontSize: 11, color: theme.textMuted },
  horasBox: { alignItems: 'flex-end' },
  horasValor: { fontSize: 15, fontWeight: '700', color: theme.primary },
  horasLabel: { fontSize: 10, color: theme.textMuted },
})
