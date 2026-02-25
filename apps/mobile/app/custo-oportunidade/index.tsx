import { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  VictoryChart, VictoryLine, VictoryAxis, VictoryTheme,
  VictoryArea, VictoryLegend, VictoryBar, VictoryStack,
} from 'victory-native'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { theme } from '@/lib/theme'

const SCREEN_WIDTH = Dimensions.get('window').width

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseMoney(text: string): number {
  return parseFloat(text.replace(/\./g, '').replace(',', '.')) || 0
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

function formatBRLShort(v: number): string {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`
  return formatBRL(v)
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

// ─── Custo item com ícone ────────────────────────────────────────────────────
function CustoItem({ icon, label, mensal, anual, cor }: {
  icon: string; label: string; mensal: number; anual: number; cor: string
}) {
  return (
    <View style={ci.row}>
      <View style={[ci.dot, { backgroundColor: cor }]} />
      <View style={ci.iconBox}>
        <Ionicons name={icon as any} size={16} color={cor} />
      </View>
      <Text style={ci.label}>{label}</Text>
      <View style={ci.valores}>
        <Text style={ci.mensal}>{formatBRL(mensal)}/mês</Text>
        <Text style={ci.anual}>{formatBRL(anual)}/ano</Text>
      </View>
    </View>
  )
}

// ─── Custos fixos do carro ───────────────────────────────────────────────────
interface CustoCarro {
  key: string; label: string; icon: string; cor: string
}

const CUSTOS: CustoCarro[] = [
  { key: 'seguro', label: 'Seguro', icon: 'shield-checkmark-outline', cor: '#3b82f6' },
  { key: 'ipva', label: 'IPVA', icon: 'document-text-outline', cor: '#8b5cf6' },
  { key: 'manutencao', label: 'Manutenção', icon: 'build-outline', cor: '#f59e0b' },
  { key: 'combustivel', label: 'Combustível', icon: 'speedometer-outline', cor: '#ef4444' },
  { key: 'estacionamento', label: 'Estacionamento', icon: 'car-outline', cor: '#06b6d4' },
  { key: 'lavagem', label: 'Lavagem / outros', icon: 'water-outline', cor: '#10b981' },
]

// ─── Tela principal ──────────────────────────────────────────────────────────
export default function CustoOportunidadeScreen() {
  // Veículo
  const [valorVeiculo, setValorVeiculo] = useState('')
  const [depreciacao, setDepreciacao] = useState('10')

  // Custos mensais
  const [custos, setCustos] = useState<Record<string, string>>({
    seguro: '', ipva: '', manutencao: '', combustivel: '', estacionamento: '', lavagem: '',
  })

  // Investimento alternativo
  const [rendimentoAnual, setRendimentoAnual] = useState('12')
  const [periodoAnos, setPeriodoAnos] = useState('5')

  // Transporte alternativo
  const [custoAlternativo, setCustoAlternativo] = useState('')

  const [showCustos, setShowCustos] = useState(true)

  const resultado = useMemo(() => {
    const valor = parseMoney(valorVeiculo)
    const deprec = parseFloat(depreciacao.replace(',', '.')) || 10
    const rendimento = parseFloat(rendimentoAnual.replace(',', '.')) || 12
    const periodo = parseInt(periodoAnos) || 5
    const altMensal = parseMoney(custoAlternativo)

    if (valor <= 0 || periodo <= 0) return null

    const rendMensal = rendimento / 12 / 100

    // Custos mensais do carro
    const custosMensais = CUSTOS.map(c => ({
      ...c,
      mensal: parseMoney(custos[c.key]),
      anual: parseMoney(custos[c.key]) * 12,
    }))

    const custoMensalTotal = custosMensais.reduce((s, c) => s + c.mensal, 0)
    const depreciacaoMensal = (valor * deprec / 100) / 12
    const custoTotalMensal = custoMensalTotal + depreciacaoMensal
    const custoTotalAnual = custoTotalMensal * 12

    // Simulação mês a mês
    const meses = periodo * 12
    const evolucao: Array<{
      mes: number; ano: number
      patrimonioComCarro: number
      patrimonioSemCarro: number
      custoAcumuladoCarro: number
    }> = []

    let patrimonioComCarro = 0  // não tem o valor investido (comprou o carro)
    let patrimonioSemCarro = valor // investiu o valor do carro
    let custoAcumuladoCarro = valor // começou gastando o valor do carro
    let valorCarroAtual = valor

    for (let m = 1; m <= meses; m++) {
      // Carro: depreciação + custos mensais
      valorCarroAtual *= (1 - deprec / 100 / 12)
      custoAcumuladoCarro += custoMensalTotal

      // Patrimônio de quem tem carro = valor do carro depreciado
      patrimonioComCarro = valorCarroAtual

      // Sem carro: investe valor + economiza custos mensais (gasta apenas alternativo)
      const economiaMensal = custoTotalMensal - altMensal
      patrimonioSemCarro = patrimonioSemCarro * (1 + rendMensal) + (economiaMensal > 0 ? economiaMensal : 0)

      // Quem não tem carro paga transporte alternativo
      if (altMensal > 0) {
        patrimonioSemCarro -= altMensal
      }

      if (m % 12 === 0 || m === 1 || m === meses) {
        evolucao.push({
          mes: m,
          ano: Math.ceil(m / 12),
          patrimonioComCarro,
          patrimonioSemCarro: Math.max(patrimonioSemCarro, 0),
          custoAcumuladoCarro,
        })
      }
    }

    // Resultado final
    const patrimonioFinalComCarro = evolucao[evolucao.length - 1].patrimonioComCarro
    const patrimonioFinalSemCarro = evolucao[evolucao.length - 1].patrimonioSemCarro
    const custoOportunidadeTotal = patrimonioFinalSemCarro - patrimonioFinalComCarro
    const custoOportunidadeMensal = custoOportunidadeTotal / meses

    // Custo real por km (se tiver combustível como referência)
    const combustivelMensal = parseMoney(custos.combustivel)

    // Dados gráfico de composição
    const composicaoData = custosMensais.filter(c => c.mensal > 0)
    composicaoData.push({
      key: 'depreciacao', label: 'Depreciação', icon: 'trending-down-outline',
      cor: '#64748b', mensal: depreciacaoMensal, anual: depreciacaoMensal * 12,
    })

    return {
      custosMensais: custosMensais.filter(c => c.mensal > 0),
      custoMensalTotal,
      depreciacaoMensal,
      custoTotalMensal,
      custoTotalAnual,
      evolucao,
      patrimonioFinalComCarro,
      patrimonioFinalSemCarro,
      custoOportunidadeTotal,
      custoOportunidadeMensal,
      custoAcumulado: custoAcumuladoCarro + custoMensalTotal * meses,
      composicaoData,
      periodo,
      valor,
    }
  }, [valorVeiculo, depreciacao, custos, rendimentoAnual, periodoAnos, custoAlternativo])

  function limpar() {
    setValorVeiculo('')
    setDepreciacao('10')
    setCustos({ seguro: '', ipva: '', manutencao: '', combustivel: '', estacionamento: '', lavagem: '' })
    setRendimentoAnual('12')
    setPeriodoAnos('5')
    setCustoAlternativo('')
  }

  return (
    <ScreenLayout titulo="Custo de Oportunidade">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcone}>
            <Ionicons name="trending-up" size={28} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitulo}>Custo de Oportunidade do Carro</Text>
            <Text style={styles.heroDesc}>
              Quanto você deixa de ganhar ao ter um carro? Compare com investir o mesmo dinheiro.
            </Text>
          </View>
        </View>

        {/* Valor do veículo */}
        <SectionCard titulo="Veículo">
          <View style={styles.form}>
            <InputField
              label="Valor do veículo"
              value={valorVeiculo}
              onChangeText={setValorVeiculo}
              placeholder="80.000,00"
              prefix="R$"
              hint="Valor FIPE ou de compra"
            />
            <InputField
              label="Depreciação anual estimada"
              value={depreciacao}
              onChangeText={setDepreciacao}
              placeholder="10"
              suffix="% a.a."
              hint="Carros populares: ~10-15%. Luxo: ~15-20%"
            />
          </View>
        </SectionCard>

        {/* Custos mensais */}
        <TouchableOpacity
          style={styles.toggleSection}
          onPress={() => setShowCustos(!showCustos)}
        >
          <View style={styles.toggleLeft}>
            <Ionicons name="wallet-outline" size={18} color={theme.primary} />
            <Text style={styles.toggleText}>Custos mensais do carro</Text>
          </View>
          <Ionicons
            name={showCustos ? 'chevron-up' : 'chevron-down'}
            size={16} color={theme.textMuted}
          />
        </TouchableOpacity>

        {showCustos && (
          <SectionCard titulo="Custos mensais">
            <View style={styles.form}>
              {CUSTOS.map(c => (
                <View key={c.key} style={styles.custoRow}>
                  <View style={[styles.custoDot, { backgroundColor: c.cor }]} />
                  <View style={{ flex: 1 }}>
                    <InputField
                      label={c.label}
                      value={custos[c.key]}
                      onChangeText={(t) => setCustos(prev => ({ ...prev, [c.key]: t }))}
                      placeholder="0,00"
                      prefix="R$"
                    />
                  </View>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* Investimento */}
        <SectionCard titulo="Cenário alternativo">
          <View style={styles.form}>
            <InputField
              label="Rendimento anual do investimento"
              value={rendimentoAnual}
              onChangeText={setRendimentoAnual}
              placeholder="12"
              suffix="% a.a."
              hint="CDI ~12%, Renda fixa ~13%, Ações ~15%"
            />
            <InputField
              label="Período de análise"
              value={periodoAnos}
              onChangeText={setPeriodoAnos}
              placeholder="5"
              suffix="anos"
            />
            <InputField
              label="Custo mensal de transporte alternativo"
              value={custoAlternativo}
              onChangeText={setCustoAlternativo}
              placeholder="1.500,00"
              prefix="R$"
              hint="Uber, ônibus, metrô, aluguel de carro etc."
            />
          </View>
        </SectionCard>

        {/* Limpar */}
        {valorVeiculo && (
          <TouchableOpacity style={styles.limparBtn} onPress={limpar}>
            <Ionicons name="refresh-outline" size={16} color={theme.textMuted} />
            <Text style={styles.limparText}>Limpar campos</Text>
          </TouchableOpacity>
        )}

        {/* ─── RESULTADOS ─── */}
        {resultado && (
          <>
            {/* Card destaque */}
            <View style={styles.destaqueCard}>
              <Text style={styles.destaqueLabel}>
                Custo de oportunidade em {resultado.periodo} anos
              </Text>
              <Text style={styles.destaqueValor}>
                {formatBRL(resultado.custoOportunidadeTotal)}
              </Text>
              <Text style={styles.destaqueSub}>
                {formatBRL(resultado.custoOportunidadeMensal)}/mês que você "perde" por ter um carro
              </Text>
            </View>

            {/* Veredito */}
            {parseMoney(custoAlternativo) > 0 && (
              <View style={[
                styles.vereditoCard,
                {
                  backgroundColor: resultado.custoOportunidadeTotal > 0 ? '#fee2e2' : '#dcfce7',
                  borderColor: resultado.custoOportunidadeTotal > 0 ? '#fca5a5' : '#86efac',
                }
              ]}>
                <Ionicons
                  name={resultado.custoOportunidadeTotal > 0 ? 'alert-circle' : 'checkmark-circle'}
                  size={24}
                  color={resultado.custoOportunidadeTotal > 0 ? theme.expense : theme.income}
                />
                <Text style={[
                  styles.vereditoTexto,
                  { color: resultado.custoOportunidadeTotal > 0 ? '#991b1b' : '#166534' }
                ]}>
                  {resultado.custoOportunidadeTotal > 0
                    ? `Sem carro, investindo e usando transporte alternativo, você teria ${formatBRL(resultado.custoOportunidadeTotal)} a mais em ${resultado.periodo} anos.`
                    : `O carro compensa financeiramente! O transporte alternativo custaria mais do que manter o veículo.`
                  }
                </Text>
              </View>
            )}

            {/* Custo mensal detalhado */}
            <SectionCard titulo="Custo mensal do carro">
              <View style={ci.container}>
                {resultado.custosMensais.map(c => (
                  <CustoItem key={c.key} {...c} />
                ))}
                <CustoItem
                  icon="trending-down-outline"
                  label="Depreciação"
                  mensal={resultado.depreciacaoMensal}
                  anual={resultado.depreciacaoMensal * 12}
                  cor="#64748b"
                />
                <View style={ci.totalRow}>
                  <Text style={ci.totalLabel}>Total mensal</Text>
                  <Text style={ci.totalValor}>{formatBRL(resultado.custoTotalMensal)}</Text>
                </View>
              </View>
            </SectionCard>

            {/* Composição de custos - gráfico de barras */}
            {resultado.composicaoData.length > 1 && (
              <SectionCard titulo="Composição dos custos">
                <View style={{ paddingVertical: 8 }}>
                  <VictoryChart
                    height={200}
                    width={SCREEN_WIDTH - 64}
                    theme={VictoryTheme.material}
                    padding={{ top: 16, bottom: 50, left: 16, right: 16 }}
                    domainPadding={{ x: 20 }}
                  >
                    <VictoryAxis
                      style={{
                        tickLabels: { fontSize: 8, fill: theme.textMuted, angle: -25, textAnchor: 'end' },
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
                    <VictoryBar
                      data={resultado.composicaoData.map(c => ({ x: c.label, y: c.mensal }))}
                      style={{
                        data: {
                          fill: ({ index }) => resultado.composicaoData[index as number]?.cor || theme.primary,
                        },
                      }}
                      cornerRadius={{ top: 4 }}
                      animate={{ duration: 500 }}
                    />
                  </VictoryChart>
                </View>
              </SectionCard>
            )}

            {/* Evolução patrimonial */}
            <SectionCard titulo="Evolução patrimonial">
              <View style={{ paddingVertical: 8 }}>
                <VictoryChart
                  height={240}
                  width={SCREEN_WIDTH - 64}
                  theme={VictoryTheme.material}
                  padding={{ top: 30, bottom: 40, left: 64, right: 16 }}
                >
                  <VictoryLegend
                    x={60} y={0}
                    orientation="horizontal"
                    gutter={16}
                    data={[
                      { name: 'Sem carro (investindo)', symbol: { fill: theme.primary } },
                      { name: 'Com carro', symbol: { fill: theme.warning } },
                    ]}
                    style={{ labels: { fontSize: 9, fill: theme.textMuted } }}
                  />
                  <VictoryAxis
                    tickFormat={(t: number) => `Ano ${t}`}
                    style={{
                      tickLabels: { fontSize: 9, fill: theme.textMuted },
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
                  <VictoryArea
                    data={resultado.evolucao}
                    x="ano"
                    y="patrimonioSemCarro"
                    style={{
                      data: { fill: `${theme.primary}20`, stroke: theme.primary, strokeWidth: 2 },
                    }}
                    animate={{ duration: 800 }}
                  />
                  <VictoryLine
                    data={resultado.evolucao}
                    x="ano"
                    y="patrimonioComCarro"
                    style={{
                      data: { stroke: theme.warning, strokeWidth: 2, strokeDasharray: '6,4' },
                    }}
                    animate={{ duration: 800 }}
                  />
                </VictoryChart>
                <Text style={styles.graficoNota}>
                  Linha verde = patrimônio investindo o valor do carro. Linha amarela = valor do carro depreciando.
                </Text>
              </View>
            </SectionCard>

            {/* Resumo comparativo */}
            <SectionCard titulo={`Resumo em ${resultado.periodo} anos`}>
              <View style={styles.resumo}>
                <MetricRow label="Valor inicial do carro" valor={formatBRL(resultado.valor)} />
                <MetricRow
                  label="Valor do carro depreciado"
                  valor={formatBRL(resultado.patrimonioFinalComCarro)}
                  cor={theme.warning}
                />
                <MetricRow label="Custo total (depreciação + gastos)" valor={formatBRL(resultado.custoTotalAnual * resultado.periodo)} cor={theme.expense} />
                <View style={met.divider} />
                <MetricRow
                  label="Patrimônio sem carro (investindo)"
                  valor={formatBRL(resultado.patrimonioFinalSemCarro)}
                  cor={theme.income}
                  destaque
                />
                <MetricRow
                  label="Diferença (custo de oportunidade)"
                  valor={formatBRL(resultado.custoOportunidadeTotal)}
                  cor={resultado.custoOportunidadeTotal > 0 ? theme.expense : theme.income}
                  destaque
                />
              </View>
            </SectionCard>

            {/* Insight */}
            <View style={styles.insightCard}>
              <Ionicons name="bulb-outline" size={20} color={theme.warning} />
              <Text style={styles.insightTexto}>
                O custo real do carro não é só o que você paga — é também o que você
                <Text style={{ fontWeight: '700' }}> deixa de ganhar</Text>. Seu carro custa{' '}
                <Text style={{ fontWeight: '700', color: theme.expense }}>
                  {formatBRL(resultado.custoTotalMensal)}
                </Text>{' '}
                por mês quando consideramos depreciação e manutenção.
              </Text>
            </View>
          </>
        )}

        {/* Empty state */}
        {!resultado && (
          <EmptyState
            icon="trending-up-outline"
            titulo="Analise o custo de oportunidade"
            descricao="Informe o valor do veículo e seus custos para descobrir quanto você deixa de ganhar."
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

  toggleSection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.surface, borderRadius: 12,
    borderWidth: 1, borderColor: theme.border,
    padding: 14, marginBottom: 16,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleText: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },

  custoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  custoDot: { width: 6, height: 6, borderRadius: 3, marginTop: 18 },

  limparBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, marginBottom: 16,
  },
  limparText: { fontSize: 13, color: theme.textMuted },

  destaqueCard: {
    backgroundColor: '#fee2e2', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  destaqueLabel: { fontSize: 13, color: '#991b1b' },
  destaqueValor: { fontSize: 32, fontWeight: 'bold', color: theme.expense, marginTop: 4 },
  destaqueSub: { fontSize: 12, color: '#991b1b', marginTop: 8, textAlign: 'center' },

  vereditoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1,
  },
  vereditoTexto: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 20 },

  resumo: { padding: 16 },

  graficoNota: {
    fontSize: 10, color: theme.textMuted, textAlign: 'center',
    paddingHorizontal: 16, paddingBottom: 4,
  },

  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fef3c7', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#fde68a', marginBottom: 16,
  },
  insightTexto: { fontSize: 13, color: '#92400e', lineHeight: 20, flex: 1 },
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

const ci = StyleSheet.create({
  container: { padding: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  dot: { width: 4, height: 4, borderRadius: 2 },
  iconBox: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center',
  },
  label: { flex: 1, fontSize: 13, color: theme.textPrimary },
  valores: { alignItems: 'flex-end' },
  mensal: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },
  anual: { fontSize: 10, color: theme.textMuted },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, paddingHorizontal: 4,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
  totalValor: { fontSize: 16, fontWeight: '700', color: theme.expense },
})
