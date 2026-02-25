import { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTheme, VictoryStack, VictoryLegend } from 'victory-native'
import { ScreenLayout } from '../../../src/components/ui/ScreenLayout'
import { SectionCard } from '../../../src/components/ui/SectionCard'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import { theme } from '../../../src/lib/theme'

const SCREEN_WIDTH = Dimensions.get('window').width

// ─── Types ───────────────────────────────────────────────────────────────────
type Sistema = 'price' | 'sac'

interface Parcela {
  mes: number
  prestacao: number
  amortizacao: number
  juros: number
  saldoDevedor: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseMoney(text: string): number {
  return parseFloat(text.replace(/\./g, '').replace(',', '.')) || 0
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

function formatBRLShort(v: number): string {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`
  return formatBRL(v)
}

function calcPrice(valor: number, taxa: number, prazo: number): Parcela[] {
  const t = taxa / 100
  const parcela = valor * (t * Math.pow(1 + t, prazo)) / (Math.pow(1 + t, prazo) - 1)
  const parcelas: Parcela[] = []
  let saldo = valor

  for (let mes = 1; mes <= prazo; mes++) {
    const juros = saldo * t
    const amortizacao = parcela - juros
    saldo -= amortizacao
    parcelas.push({
      mes,
      prestacao: parcela,
      amortizacao,
      juros,
      saldoDevedor: Math.max(saldo, 0),
    })
  }
  return parcelas
}

function calcSAC(valor: number, taxa: number, prazo: number): Parcela[] {
  const t = taxa / 100
  const amortizacaoFixa = valor / prazo
  const parcelas: Parcela[] = []
  let saldo = valor

  for (let mes = 1; mes <= prazo; mes++) {
    const juros = saldo * t
    const prestacao = amortizacaoFixa + juros
    saldo -= amortizacaoFixa
    parcelas.push({
      mes,
      prestacao,
      amortizacao: amortizacaoFixa,
      juros,
      saldoDevedor: Math.max(saldo, 0),
    })
  }
  return parcelas
}

// ─── Input com label ─────────────────────────────────────────────────────────
interface InputProps {
  label: string
  value: string
  onChangeText: (t: string) => void
  placeholder: string
  prefix?: string
  suffix?: string
}

function InputField({ label, value, onChangeText, placeholder, prefix, suffix }: InputProps) {
  return (
    <View style={inp.wrapper}>
      <Text style={inp.label}>{label}</Text>
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

// ─── Metric card inline ──────────────────────────────────────────────────────
function MetricRow({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return (
    <View style={met.row}>
      <Text style={met.label}>{label}</Text>
      <Text style={[met.valor, cor ? { color: cor } : {}]}>{valor}</Text>
    </View>
  )
}

// ─── Tela principal ──────────────────────────────────────────────────────────
export default function FinanciamentoScreen() {
  const [valorFinanciado, setValorFinanciado] = useState('')
  const [taxaMensal, setTaxaMensal] = useState('')
  const [prazoMeses, setPrazoMeses] = useState('')
  const [sistema, setSistema] = useState<Sistema>('price')
  const [showTabela, setShowTabela] = useState(false)

  const resultado = useMemo(() => {
    const valor = parseMoney(valorFinanciado)
    const taxa = parseFloat(taxaMensal.replace(',', '.')) || 0
    const prazo = parseInt(prazoMeses) || 0

    if (valor <= 0 || taxa <= 0 || prazo <= 0 || prazo > 600) return null

    const parcelasPrice = calcPrice(valor, taxa, prazo)
    const parcelasSAC = calcSAC(valor, taxa, prazo)

    const parcelas = sistema === 'price' ? parcelasPrice : parcelasSAC

    const totalPago = parcelas.reduce((s, p) => s + p.prestacao, 0)
    const totalJuros = parcelas.reduce((s, p) => s + p.juros, 0)
    const primeiraParcela = parcelas[0].prestacao
    const ultimaParcela = parcelas[parcelas.length - 1].prestacao

    // Dados do gráfico (amostrar se muitas parcelas)
    const step = prazo > 60 ? Math.ceil(prazo / 30) : prazo > 24 ? 3 : 1
    const chartData = parcelas.filter((_, i) => i % step === 0 || i === prazo - 1)

    // Comparação Price vs SAC
    const totalPrice = parcelasPrice.reduce((s, p) => s + p.prestacao, 0)
    const totalSAC = parcelasSAC.reduce((s, p) => s + p.prestacao, 0)
    const economiaSAC = totalPrice - totalSAC

    return {
      parcelas,
      totalPago,
      totalJuros,
      primeiraParcela,
      ultimaParcela,
      chartData,
      totalPrice,
      totalSAC,
      economiaSAC,
      valor,
    }
  }, [valorFinanciado, taxaMensal, prazoMeses, sistema])

  function limpar() {
    setValorFinanciado('')
    setTaxaMensal('')
    setPrazoMeses('')
    setShowTabela(false)
  }

  const temInput = valorFinanciado || taxaMensal || prazoMeses

  return (
    <ScreenLayout titulo="Financiamento">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcone}>
            <Ionicons name="home" size={28} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitulo}>Simulador de Financiamento</Text>
            <Text style={styles.heroDesc}>
              Compare sistemas Price e SAC, veja parcelas e juros totais.
            </Text>
          </View>
        </View>

        {/* Inputs */}
        <SectionCard titulo="Dados do financiamento">
          <View style={styles.form}>
            <InputField
              label="Valor financiado"
              value={valorFinanciado}
              onChangeText={setValorFinanciado}
              placeholder="200.000,00"
              prefix="R$"
            />
            <InputField
              label="Taxa de juros mensal"
              value={taxaMensal}
              onChangeText={setTaxaMensal}
              placeholder="0,99"
              suffix="% a.m."
            />
            <InputField
              label="Prazo"
              value={prazoMeses}
              onChangeText={setPrazoMeses}
              placeholder="360"
              suffix="meses"
            />

            {/* Sistema toggle */}
            <View style={styles.sistemaWrapper}>
              <Text style={inp.label}>Sistema de amortização</Text>
              <View style={styles.sistemaRow}>
                <TouchableOpacity
                  style={[styles.sistemaBtn, sistema === 'price' && styles.sistemaBtnAtivo]}
                  onPress={() => setSistema('price')}
                >
                  <Text style={[styles.sistemaText, sistema === 'price' && styles.sistemaTextAtivo]}>
                    Price
                  </Text>
                  <Text style={styles.sistemaDesc}>Parcela fixa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sistemaBtn, sistema === 'sac' && styles.sistemaBtnAtivo]}
                  onPress={() => setSistema('sac')}
                >
                  <Text style={[styles.sistemaText, sistema === 'sac' && styles.sistemaTextAtivo]}>
                    SAC
                  </Text>
                  <Text style={styles.sistemaDesc}>Parcela decrescente</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SectionCard>

        {/* Limpar */}
        {temInput && (
          <TouchableOpacity style={styles.limparBtn} onPress={limpar}>
            <Ionicons name="refresh-outline" size={16} color={theme.textMuted} />
            <Text style={styles.limparText}>Limpar campos</Text>
          </TouchableOpacity>
        )}

        {/* Resultado */}
        {resultado && (
          <>
            {/* Resumo principal */}
            <SectionCard titulo={`Resumo — ${sistema.toUpperCase()}`}>
              <View style={styles.resumo}>
                <View style={styles.resumoDestaque}>
                  <Text style={styles.resumoLabel}>
                    {sistema === 'price' ? 'Parcela fixa' : 'Primeira parcela'}
                  </Text>
                  <Text style={styles.resumoValor}>
                    {formatBRL(resultado.primeiraParcela)}
                  </Text>
                  {sistema === 'sac' && (
                    <Text style={styles.resumoSub}>
                      Última: {formatBRL(resultado.ultimaParcela)}
                    </Text>
                  )}
                </View>

                <View style={styles.resumoDivider} />

                <MetricRow label="Valor financiado" valor={formatBRL(resultado.valor)} />
                <MetricRow label="Total pago" valor={formatBRL(resultado.totalPago)} />
                <MetricRow
                  label="Total de juros"
                  valor={formatBRL(resultado.totalJuros)}
                  cor={theme.expense}
                />
                <MetricRow
                  label="% de juros sobre o valor"
                  valor={((resultado.totalJuros / resultado.valor) * 100).toFixed(1).replace('.', ',') + '%'}
                  cor={theme.expense}
                />
              </View>
            </SectionCard>

            {/* Comparação Price vs SAC */}
            <SectionCard titulo="Price vs SAC">
              <View style={styles.comparacao}>
                <View style={styles.compRow}>
                  <View style={styles.compCol}>
                    <Text style={styles.compLabel}>Total Price</Text>
                    <Text style={[styles.compValor, sistema === 'price' && { color: theme.primary }]}>
                      {formatBRL(resultado.totalPrice)}
                    </Text>
                  </View>
                  <View style={styles.compVs}>
                    <Text style={styles.compVsText}>vs</Text>
                  </View>
                  <View style={[styles.compCol, { alignItems: 'flex-end' }]}>
                    <Text style={styles.compLabel}>Total SAC</Text>
                    <Text style={[styles.compValor, sistema === 'sac' && { color: theme.primary }]}>
                      {formatBRL(resultado.totalSAC)}
                    </Text>
                  </View>
                </View>
                {resultado.economiaSAC > 0 && (
                  <View style={styles.economiaBox}>
                    <Ionicons name="trending-down" size={16} color={theme.income} />
                    <Text style={styles.economiaText}>
                      SAC economiza {formatBRL(resultado.economiaSAC)} em juros
                    </Text>
                  </View>
                )}
              </View>
            </SectionCard>

            {/* Gráfico evolução */}
            <SectionCard titulo="Evolução das parcelas">
              <View style={{ paddingVertical: 8 }}>
                <VictoryChart
                  height={220}
                  width={SCREEN_WIDTH - 64}
                  theme={VictoryTheme.material}
                  padding={{ top: 20, bottom: 40, left: 64, right: 16 }}
                  domainPadding={{ x: 8 }}
                >
                  <VictoryLegend
                    x={80} y={0}
                    orientation="horizontal"
                    gutter={20}
                    data={[
                      { name: 'Amortização', symbol: { fill: theme.primary } },
                      { name: 'Juros', symbol: { fill: theme.expense } },
                    ]}
                    style={{
                      labels: { fontSize: 9, fill: theme.textMuted },
                    }}
                  />
                  <VictoryAxis
                    tickFormat={(t: number) => `${t}`}
                    label="Mês"
                    style={{
                      tickLabels: { fontSize: 8, fill: theme.textMuted },
                      axisLabel: { fontSize: 9, fill: theme.textMuted, padding: 28 },
                      grid: { stroke: 'transparent' },
                      axis: { stroke: theme.border },
                    }}
                  />
                  <VictoryAxis
                    dependentAxis
                    tickFormat={(v: number) => formatBRLShort(v)}
                    style={{
                      tickLabels: { fontSize: 8, fill: theme.textMuted },
                      grid: { stroke: theme.border, strokeDasharray: '4,4' },
                      axis: { stroke: 'transparent' },
                    }}
                  />
                  <VictoryStack>
                    <VictoryBar
                      data={resultado.chartData}
                      x="mes"
                      y="amortizacao"
                      style={{ data: { fill: theme.primary } }}
                      cornerRadius={{ top: 0 }}
                    />
                    <VictoryBar
                      data={resultado.chartData}
                      x="mes"
                      y="juros"
                      style={{ data: { fill: theme.expense } }}
                      cornerRadius={{ top: 2 }}
                    />
                  </VictoryStack>
                </VictoryChart>
                <Text style={styles.graficoNota}>
                  {sistema === 'price'
                    ? 'No sistema Price, a parcela é fixa mas os juros diminuem ao longo do tempo.'
                    : 'No sistema SAC, a amortização é fixa e as parcelas diminuem ao longo do tempo.'
                  }
                </Text>
              </View>
            </SectionCard>

            {/* Tabela de parcelas */}
            <TouchableOpacity
              style={styles.tabelaToggle}
              onPress={() => setShowTabela(!showTabela)}
            >
              <Ionicons
                name={showTabela ? 'chevron-up' : 'chevron-down'}
                size={18} color={theme.primary}
              />
              <Text style={styles.tabelaToggleText}>
                {showTabela ? 'Ocultar' : 'Ver'} tabela de parcelas
              </Text>
            </TouchableOpacity>

            {showTabela && (
              <SectionCard titulo="Tabela de amortização">
                {/* Header */}
                <View style={[tab.row, tab.header]}>
                  <Text style={[tab.cell, tab.cellMes, tab.headerText]}>#</Text>
                  <Text style={[tab.cell, tab.headerText]}>Parcela</Text>
                  <Text style={[tab.cell, tab.headerText]}>Juros</Text>
                  <Text style={[tab.cell, tab.headerText]}>Saldo</Text>
                </View>
                {resultado.parcelas.map((p) => (
                  <View
                    key={p.mes}
                    style={[tab.row, p.mes % 2 === 0 && tab.rowEven]}
                  >
                    <Text style={[tab.cell, tab.cellMes]}>{p.mes}</Text>
                    <Text style={tab.cell}>{formatBRL(p.prestacao)}</Text>
                    <Text style={[tab.cell, { color: theme.expense }]}>
                      {formatBRL(p.juros)}
                    </Text>
                    <Text style={tab.cell}>{formatBRL(p.saldoDevedor)}</Text>
                  </View>
                ))}
              </SectionCard>
            )}
          </>
        )}

        {/* Empty state */}
        {!resultado && !temInput && (
          <EmptyState
            icon="home-outline"
            titulo="Simule seu financiamento"
            descricao="Preencha valor, taxa e prazo para ver parcelas, juros e comparar Price vs SAC."
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

  sistemaWrapper: { marginTop: 4 },
  sistemaRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  sistemaBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: theme.border,
    backgroundColor: theme.bg,
  },
  sistemaBtnAtivo: {
    borderColor: theme.primary, backgroundColor: '#f0fdf4',
  },
  sistemaText: { fontSize: 15, fontWeight: '700', color: theme.textMuted },
  sistemaTextAtivo: { color: theme.primary },
  sistemaDesc: { fontSize: 11, color: theme.textMuted, marginTop: 2 },

  limparBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, marginBottom: 16,
  },
  limparText: { fontSize: 13, color: theme.textMuted },

  resumo: { padding: 16 },
  resumoDestaque: {
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 16,
  },
  resumoLabel: { fontSize: 12, color: theme.textMuted },
  resumoValor: { fontSize: 32, fontWeight: 'bold', color: theme.primary, marginTop: 4 },
  resumoSub: { fontSize: 13, color: theme.textSecondary, marginTop: 4 },
  resumoDivider: { height: 1, backgroundColor: theme.border, marginBottom: 8 },

  comparacao: { padding: 16 },
  compRow: { flexDirection: 'row', alignItems: 'center' },
  compCol: { flex: 1 },
  compLabel: { fontSize: 12, color: theme.textMuted, marginBottom: 4 },
  compValor: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  compVs: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: theme.bg,
    justifyContent: 'center', alignItems: 'center', marginHorizontal: 8,
  },
  compVsText: { fontSize: 11, fontWeight: '700', color: theme.textMuted },
  economiaBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#dcfce7', borderRadius: 10, padding: 12, marginTop: 12,
  },
  economiaText: { fontSize: 13, color: theme.income, fontWeight: '600', flex: 1 },

  graficoNota: {
    fontSize: 10, color: theme.textMuted, textAlign: 'center',
    paddingHorizontal: 16, paddingBottom: 4,
  },

  tabelaToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, marginBottom: 12,
    backgroundColor: theme.surface, borderRadius: 12,
    borderWidth: 1, borderColor: theme.border,
  },
  tabelaToggleText: { fontSize: 14, color: theme.primary, fontWeight: '600' },
})

const inp = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textPrimary, marginBottom: 6 },
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
  label: { fontSize: 13, color: theme.textSecondary },
  valor: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
})

const tab = StyleSheet.create({
  row: {
    flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  rowEven: { backgroundColor: '#fafcfb' },
  header: { backgroundColor: theme.bg },
  headerText: { fontWeight: '700', color: theme.textPrimary, fontSize: 11 },
  cell: { flex: 1, fontSize: 11, color: theme.textSecondary, textAlign: 'right' },
  cellMes: { flex: 0.4, textAlign: 'center' },
})
