import { useState, useEffect, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, FlatList, Modal, Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  VictoryChart, VictoryBar, VictoryAxis, VictoryTheme,
  VictoryGroup, VictoryLegend,
} from 'victory-native'
import { ScreenLayout } from '../../../src/components/ui/ScreenLayout'
import { SectionCard } from '../../../src/components/ui/SectionCard'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import { theme } from '../../../src/lib/theme'

const SCREEN_WIDTH = Dimensions.get('window').width

// ─── FIPE API ────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
const PROXY = `${SUPABASE_URL}/functions/v1/fipe-proxy`

interface FipeItem { codigo: string; nome: string }
interface FipePrice {
  Valor: string; Marca: string; Modelo: string
  AnoModelo: number; Combustivel: string; CodigoFipe: string
}

async function fipeGet(path: string) {
  const r = await fetch(`${PROXY}?path=${encodeURIComponent(path)}`, {
    headers: { Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
  })
  if (!r.ok) return null
  return r.json()
}

function parseBRL(s: string): number {
  return parseFloat(s.replace('R$ ', '').replace(/\./g, '').replace(',', '.')) || 0
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

function formatBRLShort(v: number): string {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`
  return formatBRL(v)
}

// ─── Selector com busca (reutilizado do FIPE) ───────────────────────────────
interface SelectorProps {
  label: string; valor: string; placeholder: string
  opcoes: FipeItem[]; loading?: boolean; disabled?: boolean
  onSelect: (item: FipeItem) => void; compact?: boolean
}

function Selector({ label, valor, placeholder, opcoes, loading, disabled, onSelect, compact }: SelectorProps) {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const filtradas = opcoes.filter(o => o.nome.toLowerCase().includes(busca.toLowerCase()))
  const selecionado = opcoes.find(o => o.codigo === valor)

  return (
    <>
      <View style={sel.wrapper}>
        {!compact && <Text style={sel.label}>{label}</Text>}
        <TouchableOpacity
          style={[sel.btn, disabled && sel.btnDisabled, compact && { height: 40 }]}
          onPress={() => { if (!disabled && !loading) setOpen(true) }}
          disabled={disabled || loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Text style={[sel.btnText, !selecionado && sel.placeholder, compact && { fontSize: 12 }]} numberOfLines={1}>
              {selecionado?.nome ?? placeholder}
            </Text>
          )}
          {!loading && <Ionicons name="chevron-down" size={14} color={theme.textMuted} />}
        </TouchableOpacity>
      </View>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={sel.modal}>
          <View style={sel.modalHeader}>
            <Text style={sel.modalTitulo}>{label}</Text>
            <TouchableOpacity onPress={() => { setOpen(false); setBusca('') }}>
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={sel.searchBox}>
            <Ionicons name="search-outline" size={16} color={theme.textMuted} />
            <TextInput
              style={sel.searchInput}
              placeholder={`Buscar ${label.toLowerCase()}...`}
              value={busca} onChangeText={setBusca} autoFocus
              placeholderTextColor={theme.textMuted}
            />
            {busca.length > 0 && (
              <TouchableOpacity onPress={() => setBusca('')}>
                <Ionicons name="close-circle" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={filtradas}
            keyExtractor={i => i.codigo}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[sel.opcao, item.codigo === valor && sel.opcaoAtiva]}
                onPress={() => { onSelect(item); setOpen(false); setBusca('') }}
              >
                <Text style={[sel.opcaoText, item.codigo === valor && sel.opcaoTextAtiva]}>
                  {item.nome}
                </Text>
                {item.codigo === valor && <Ionicons name="checkmark" size={16} color={theme.primary} />}
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={sel.vazio}>Nenhum resultado</Text>}
          />
        </View>
      </Modal>
    </>
  )
}

// ─── Input numérico ──────────────────────────────────────────────────────────
function InputField({ label, value, onChangeText, placeholder, prefix, suffix, hint }: {
  label: string; value: string; onChangeText: (t: string) => void
  placeholder: string; prefix?: string; suffix?: string; hint?: string
}) {
  return (
    <View style={inp.wrapper}>
      <Text style={inp.label}>{label}</Text>
      {hint && <Text style={inp.hint}>{hint}</Text>}
      <View style={inp.row}>
        {prefix && <Text style={inp.prefix}>{prefix}</Text>}
        <TextInput
          style={[inp.input, prefix && { paddingLeft: 0 }]}
          value={value} onChangeText={onChangeText} placeholder={placeholder}
          placeholderTextColor={theme.textMuted} keyboardType="numeric"
        />
        {suffix && <Text style={inp.suffix}>{suffix}</Text>}
      </View>
    </View>
  )
}

// ─── Vehicle state hook ──────────────────────────────────────────────────────
interface VehicleState {
  marcas: FipeItem[]; modelos: FipeItem[]; anos: FipeItem[]
  marcaSel: string; modeloSel: string; anoSel: string
  preco: FipePrice | null
  loadMarcas: boolean; loadModelos: boolean; loadAnos: boolean; loadPreco: boolean
}

function useVehicle() {
  const [s, setS] = useState<VehicleState>({
    marcas: [], modelos: [], anos: [],
    marcaSel: '', modeloSel: '', anoSel: '',
    preco: null,
    loadMarcas: true, loadModelos: false, loadAnos: false, loadPreco: false,
  })

  // Load brands on mount
  useEffect(() => {
    fipeGet('/carros/marcas').then(d => {
      setS(prev => ({ ...prev, marcas: d ?? [], loadMarcas: false }))
    })
  }, [])

  function setMarca(item: FipeItem) {
    setS(prev => ({
      ...prev, marcaSel: item.codigo, modeloSel: '', anoSel: '',
      modelos: [], anos: [], preco: null, loadModelos: true,
    }))
    fipeGet(`/carros/marcas/${item.codigo}/modelos`).then(d => {
      setS(prev => ({ ...prev, modelos: d?.modelos ?? [], loadModelos: false }))
    })
  }

  function setModelo(item: FipeItem) {
    setS(prev => ({
      ...prev, modeloSel: item.codigo, anoSel: '',
      anos: [], preco: null, loadAnos: true,
    }))
    fipeGet(`/carros/marcas/${s.marcaSel}/modelos/${item.codigo}/anos`).then(d => {
      setS(prev => ({ ...prev, anos: d ?? [], loadAnos: false }))
    })
  }

  function setAno(item: FipeItem) {
    setS(prev => ({ ...prev, anoSel: item.codigo, loadPreco: true }))
    fipeGet(`/carros/marcas/${s.marcaSel}/modelos/${s.modeloSel}/anos/${item.codigo}`).then(d => {
      setS(prev => ({ ...prev, preco: d ?? null, loadPreco: false }))
    })
  }

  function reset() {
    setS(prev => ({
      ...prev, marcaSel: '', modeloSel: '', anoSel: '',
      modelos: [], anos: [], preco: null,
    }))
  }

  return { ...s, setMarca, setModelo, setAno, reset }
}

// ─── Comparison row ──────────────────────────────────────────────────────────
function CompRow({ label, valorA, valorB, melhor, formato }: {
  label: string; valorA: string; valorB: string; melhor?: 'a' | 'b' | null; formato?: string
}) {
  return (
    <View style={cr.row}>
      <Text style={[cr.valor, melhor === 'a' && cr.valorBom]}>{valorA}</Text>
      <Text style={cr.label}>{label}</Text>
      <Text style={[cr.valor, melhor === 'b' && cr.valorBom]}>{valorB}</Text>
    </View>
  )
}

// ─── Tela principal ──────────────────────────────────────────────────────────
export default function ComparativoScreen() {
  const veiculoA = useVehicle()
  const veiculoB = useVehicle()

  // Custos estimados
  const [seguroA, setSeguroA] = useState('')
  const [seguroB, setSeguroB] = useState('')
  const [combustivelA, setCombustivelA] = useState('')
  const [combustivelB, setCombustivelB] = useState('')
  const [manutencaoA, setManutencaoA] = useState('')
  const [manutencaoB, setManutencaoB] = useState('')

  const [showCustos, setShowCustos] = useState(false)
  const [activeTab, setActiveTab] = useState<'a' | 'b'>('a')

  const ambosPreenchidos = veiculoA.preco && veiculoB.preco

  const resultado = useMemo(() => {
    if (!veiculoA.preco || !veiculoB.preco) return null

    const valorA = parseBRL(veiculoA.preco.Valor)
    const valorB = parseBRL(veiculoB.preco.Valor)

    const anoA = veiculoA.preco.AnoModelo === 32000 ? new Date().getFullYear() : veiculoA.preco.AnoModelo
    const anoB = veiculoB.preco.AnoModelo === 32000 ? new Date().getFullYear() : veiculoB.preco.AnoModelo
    const idadeA = new Date().getFullYear() - anoA
    const idadeB = new Date().getFullYear() - anoB

    // Estimativas de custo mensal
    const segA = parseFloat(seguroA.replace(/\./g, '').replace(',', '.')) || valorA * 0.04 / 12
    const segB = parseFloat(seguroB.replace(/\./g, '').replace(',', '.')) || valorB * 0.04 / 12
    const combA = parseFloat(combustivelA.replace(/\./g, '').replace(',', '.')) || 400
    const combB = parseFloat(combustivelB.replace(/\./g, '').replace(',', '.')) || 400
    const manA = parseFloat(manutencaoA.replace(/\./g, '').replace(',', '.')) || (idadeA > 5 ? 300 : 150)
    const manB = parseFloat(manutencaoB.replace(/\./g, '').replace(',', '.')) || (idadeB > 5 ? 300 : 150)

    // IPVA estimado (3% do valor em SP)
    const ipvaA = valorA * 0.03 / 12
    const ipvaB = valorB * 0.03 / 12

    // Depreciação anual estimada
    const deprecA = idadeA <= 3 ? 0.12 : idadeA <= 5 ? 0.10 : idadeA <= 10 ? 0.07 : 0.04
    const deprecB = idadeB <= 3 ? 0.12 : idadeB <= 5 ? 0.10 : idadeB <= 10 ? 0.07 : 0.04
    const deprecMesA = valorA * deprecA / 12
    const deprecMesB = valorB * deprecB / 12

    const custoTotalA = segA + combA + manA + ipvaA + deprecMesA
    const custoTotalB = segB + combB + manB + ipvaB + deprecMesB

    // Diferença em 5 anos
    const diff5anos = (custoTotalA - custoTotalB) * 60

    // Dados para gráfico
    const chartData = [
      { categoria: 'Seguro', a: segA, b: segB },
      { categoria: 'Combustível', a: combA, b: combB },
      { categoria: 'Manutenção', a: manA, b: manB },
      { categoria: 'IPVA', a: ipvaA, b: ipvaB },
      { categoria: 'Depreciação', a: deprecMesA, b: deprecMesB },
    ]

    // Veredito
    const vencedor = custoTotalA < custoTotalB ? 'a' : custoTotalA > custoTotalB ? 'b' : null

    return {
      valorA, valorB,
      idadeA, idadeB,
      custos: {
        segA, segB, combA, combB, manA, manB,
        ipvaA, ipvaB, deprecMesA, deprecMesB,
      },
      custoTotalA, custoTotalB,
      diff5anos,
      chartData,
      vencedor,
      deprecA: deprecA * 100,
      deprecB: deprecB * 100,
    }
  }, [veiculoA.preco, veiculoB.preco, seguroA, seguroB, combustivelA, combustivelB, manutencaoA, manutencaoB])

  // ─── Vehicle selector card ─────────────────────────────────────────────────
  function VehicleCard({ v, label, cor }: { v: ReturnType<typeof useVehicle>; label: string; cor: string }) {
    return (
      <View style={vc.card}>
        <View style={[vc.badge, { backgroundColor: cor + '20' }]}>
          <Text style={[vc.badgeText, { color: cor }]}>{label}</Text>
        </View>

        {v.preco ? (
          <View style={vc.resultado}>
            <Text style={vc.modelo} numberOfLines={2}>
              {v.preco.Marca} {v.preco.Modelo}
            </Text>
            <Text style={[vc.valor, { color: cor }]}>{v.preco.Valor}</Text>
            <Text style={vc.ano}>
              {v.preco.AnoModelo === 32000 ? '0 km' : v.preco.AnoModelo} • {v.preco.Combustivel}
            </Text>
            <TouchableOpacity style={vc.trocarBtn} onPress={v.reset}>
              <Ionicons name="swap-horizontal-outline" size={14} color={theme.textMuted} />
              <Text style={vc.trocarText}>Trocar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={vc.seletores}>
            <Selector
              label="Marca" valor={v.marcaSel} placeholder="Marca"
              opcoes={v.marcas} loading={v.loadMarcas} onSelect={v.setMarca} compact
            />
            <Selector
              label="Modelo" valor={v.modeloSel} placeholder="Modelo"
              opcoes={v.modelos} loading={v.loadModelos}
              disabled={!v.marcaSel} onSelect={v.setModelo} compact
            />
            <Selector
              label="Ano" valor={v.anoSel} placeholder="Ano"
              opcoes={v.anos} loading={v.loadAnos}
              disabled={!v.modeloSel} onSelect={v.setAno} compact
            />
            {v.loadPreco && (
              <ActivityIndicator size="small" color={cor} style={{ marginTop: 8 }} />
            )}
          </View>
        )}
      </View>
    )
  }

  return (
    <ScreenLayout titulo="Comparativo de Carros">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcone}>
            <Ionicons name="swap-horizontal" size={28} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitulo}>Comparativo Financeiro</Text>
            <Text style={styles.heroDesc}>
              Compare dois veículos lado a lado — valor, custos, depreciação e custo total de propriedade.
            </Text>
          </View>
        </View>

        {/* Seletores lado a lado */}
        <View style={styles.vehicleRow}>
          <View style={{ flex: 1 }}>
            <VehicleCard v={veiculoA} label="Carro A" cor="#3b82f6" />
          </View>
          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <View style={{ flex: 1 }}>
            <VehicleCard v={veiculoB} label="Carro B" cor="#f59e0b" />
          </View>
        </View>

        {/* Custos opcionais */}
        {ambosPreenchidos && (
          <>
            <TouchableOpacity
              style={styles.toggleSection}
              onPress={() => setShowCustos(!showCustos)}
            >
              <View style={styles.toggleLeft}>
                <Ionicons name="calculator-outline" size={18} color={theme.primary} />
                <Text style={styles.toggleText}>Ajustar custos estimados</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.toggleHint}>Opcional</Text>
                <Ionicons name={showCustos ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textMuted} />
              </View>
            </TouchableOpacity>

            {showCustos && (
              <SectionCard titulo="Custos mensais personalizados">
                <View style={styles.form}>
                  {/* Tabs A / B */}
                  <View style={styles.tabRow}>
                    <TouchableOpacity
                      style={[styles.tabBtn, activeTab === 'a' && styles.tabBtnAtivoA]}
                      onPress={() => setActiveTab('a')}
                    >
                      <Text style={[styles.tabText, activeTab === 'a' && { color: '#3b82f6' }]}>
                        Carro A
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tabBtn, activeTab === 'b' && styles.tabBtnAtivoB]}
                      onPress={() => setActiveTab('b')}
                    >
                      <Text style={[styles.tabText, activeTab === 'b' && { color: '#f59e0b' }]}>
                        Carro B
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {activeTab === 'a' ? (
                    <>
                      <InputField label="Seguro mensal" value={seguroA} onChangeText={setSeguroA} placeholder="Auto" prefix="R$" />
                      <InputField label="Combustível mensal" value={combustivelA} onChangeText={setCombustivelA} placeholder="400" prefix="R$" />
                      <InputField label="Manutenção mensal" value={manutencaoA} onChangeText={setManutencaoA} placeholder="Auto" prefix="R$" />
                    </>
                  ) : (
                    <>
                      <InputField label="Seguro mensal" value={seguroB} onChangeText={setSeguroB} placeholder="Auto" prefix="R$" />
                      <InputField label="Combustível mensal" value={combustivelB} onChangeText={setCombustivelB} placeholder="400" prefix="R$" />
                      <InputField label="Manutenção mensal" value={manutencaoB} onChangeText={setManutencaoB} placeholder="Auto" prefix="R$" />
                    </>
                  )}
                  <Text style={styles.autoHint}>
                    Deixe em branco para usar estimativas automáticas baseadas no perfil do veículo.
                  </Text>
                </View>
              </SectionCard>
            )}
          </>
        )}

        {/* ─── RESULTADOS ─── */}
        {resultado && (
          <>
            {/* Veredito */}
            <View style={[
              styles.vereditoCard,
              { borderColor: resultado.vencedor === 'a' ? '#3b82f6' : resultado.vencedor === 'b' ? '#f59e0b' : theme.border },
            ]}>
              <Ionicons
                name="trophy"
                size={24}
                color={resultado.vencedor === 'a' ? '#3b82f6' : '#f59e0b'}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.vereditoTitulo}>
                  {resultado.vencedor === 'a'
                    ? `${veiculoA.preco!.Marca} ${veiculoA.preco!.Modelo}`
                    : `${veiculoB.preco!.Marca} ${veiculoB.preco!.Modelo}`
                  } é mais econômico
                </Text>
                <Text style={styles.vereditoSub}>
                  Economia de {formatBRL(Math.abs(resultado.diff5anos))} em 5 anos
                  ({formatBRL(Math.abs(resultado.custoTotalA - resultado.custoTotalB))}/mês)
                </Text>
              </View>
            </View>

            {/* Comparação lado a lado */}
            <SectionCard titulo="Comparação detalhada">
              <View style={cr.container}>
                <View style={cr.headerRow}>
                  <Text style={[cr.headerLabel, { color: '#3b82f6' }]}>Carro A</Text>
                  <Text style={cr.headerCenter}> </Text>
                  <Text style={[cr.headerLabel, { color: '#f59e0b' }]}>Carro B</Text>
                </View>

                <CompRow
                  label="Valor FIPE"
                  valorA={formatBRL(resultado.valorA)}
                  valorB={formatBRL(resultado.valorB)}
                  melhor={resultado.valorA < resultado.valorB ? 'a' : resultado.valorB < resultado.valorA ? 'b' : null}
                />
                <CompRow
                  label="Idade"
                  valorA={resultado.idadeA === 0 ? '0 km' : `${resultado.idadeA} anos`}
                  valorB={resultado.idadeB === 0 ? '0 km' : `${resultado.idadeB} anos`}
                  melhor={resultado.idadeA < resultado.idadeB ? 'a' : resultado.idadeB < resultado.idadeA ? 'b' : null}
                />
                <CompRow
                  label="Depreciação"
                  valorA={`${resultado.deprecA.toFixed(0)}% a.a.`}
                  valorB={`${resultado.deprecB.toFixed(0)}% a.a.`}
                  melhor={resultado.deprecA < resultado.deprecB ? 'a' : resultado.deprecB < resultado.deprecA ? 'b' : null}
                />

                <View style={cr.divider} />

                <CompRow
                  label="Seguro/mês"
                  valorA={formatBRL(resultado.custos.segA)}
                  valorB={formatBRL(resultado.custos.segB)}
                  melhor={resultado.custos.segA < resultado.custos.segB ? 'a' : resultado.custos.segB < resultado.custos.segA ? 'b' : null}
                />
                <CompRow
                  label="Combustível/mês"
                  valorA={formatBRL(resultado.custos.combA)}
                  valorB={formatBRL(resultado.custos.combB)}
                  melhor={resultado.custos.combA < resultado.custos.combB ? 'a' : resultado.custos.combB < resultado.custos.combA ? 'b' : null}
                />
                <CompRow
                  label="Manutenção/mês"
                  valorA={formatBRL(resultado.custos.manA)}
                  valorB={formatBRL(resultado.custos.manB)}
                  melhor={resultado.custos.manA < resultado.custos.manB ? 'a' : resultado.custos.manB < resultado.custos.manA ? 'b' : null}
                />
                <CompRow
                  label="IPVA/mês"
                  valorA={formatBRL(resultado.custos.ipvaA)}
                  valorB={formatBRL(resultado.custos.ipvaB)}
                  melhor={resultado.custos.ipvaA < resultado.custos.ipvaB ? 'a' : resultado.custos.ipvaB < resultado.custos.ipvaA ? 'b' : null}
                />
                <CompRow
                  label="Depreciação/mês"
                  valorA={formatBRL(resultado.custos.deprecMesA)}
                  valorB={formatBRL(resultado.custos.deprecMesB)}
                  melhor={resultado.custos.deprecMesA < resultado.custos.deprecMesB ? 'a' : resultado.custos.deprecMesB < resultado.custos.deprecMesA ? 'b' : null}
                />

                <View style={cr.divider} />

                <CompRow
                  label="CUSTO TOTAL/MÊS"
                  valorA={formatBRL(resultado.custoTotalA)}
                  valorB={formatBRL(resultado.custoTotalB)}
                  melhor={resultado.vencedor}
                />
              </View>
            </SectionCard>

            {/* Gráfico comparativo */}
            <SectionCard titulo="Custos por categoria">
              <View style={{ paddingVertical: 8 }}>
                <VictoryChart
                  height={220}
                  width={SCREEN_WIDTH - 64}
                  theme={VictoryTheme.material}
                  padding={{ top: 30, bottom: 50, left: 56, right: 16 }}
                  domainPadding={{ x: 24 }}
                >
                  <VictoryLegend
                    x={80} y={0}
                    orientation="horizontal" gutter={20}
                    data={[
                      { name: 'Carro A', symbol: { fill: '#3b82f6' } },
                      { name: 'Carro B', symbol: { fill: '#f59e0b' } },
                    ]}
                    style={{ labels: { fontSize: 9, fill: theme.textMuted } }}
                  />
                  <VictoryAxis
                    style={{
                      tickLabels: { fontSize: 8, fill: theme.textMuted, angle: -20, textAnchor: 'end' },
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
                  <VictoryGroup offset={14}>
                    <VictoryBar
                      data={resultado.chartData}
                      x="categoria" y="a"
                      style={{ data: { fill: '#3b82f6' } }}
                      cornerRadius={{ top: 3 }}
                      barWidth={12}
                    />
                    <VictoryBar
                      data={resultado.chartData}
                      x="categoria" y="b"
                      style={{ data: { fill: '#f59e0b' } }}
                      cornerRadius={{ top: 3 }}
                      barWidth={12}
                    />
                  </VictoryGroup>
                </VictoryChart>
              </View>
            </SectionCard>

            {/* Projeção 5 anos */}
            <SectionCard titulo="Projeção em 5 anos">
              <View style={styles.projecao}>
                <View style={styles.projRow}>
                  <View style={[styles.projCol, { borderRightWidth: 1, borderRightColor: theme.border }]}>
                    <View style={[styles.projDot, { backgroundColor: '#3b82f6' }]} />
                    <Text style={styles.projLabel}>Carro A</Text>
                    <Text style={[styles.projValor, { color: '#3b82f6' }]}>
                      {formatBRL(resultado.custoTotalA * 60)}
                    </Text>
                    <Text style={styles.projSub}>custo total</Text>
                  </View>
                  <View style={styles.projCol}>
                    <View style={[styles.projDot, { backgroundColor: '#f59e0b' }]} />
                    <Text style={styles.projLabel}>Carro B</Text>
                    <Text style={[styles.projValor, { color: '#f59e0b' }]}>
                      {formatBRL(resultado.custoTotalB * 60)}
                    </Text>
                    <Text style={styles.projSub}>custo total</Text>
                  </View>
                </View>
                <View style={styles.projEconomia}>
                  <Ionicons name="arrow-down" size={16} color={theme.income} />
                  <Text style={styles.projEconomiaText}>
                    Economia escolhendo o mais barato: {formatBRL(Math.abs(resultado.diff5anos))}
                  </Text>
                </View>
              </View>
            </SectionCard>
          </>
        )}

        {/* Empty state */}
        {!ambosPreenchidos && (
          <EmptyState
            icon="swap-horizontal-outline"
            titulo="Compare dois veículos"
            descricao="Selecione marca, modelo e ano de dois carros para ver a comparação financeira completa."
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

  vehicleRow: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'flex-start' },
  vsCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: theme.bg,
    justifyContent: 'center', alignItems: 'center', marginTop: 40,
    borderWidth: 1, borderColor: theme.border,
  },
  vsText: { fontSize: 10, fontWeight: '800', color: theme.textMuted },

  toggleSection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.surface, borderRadius: 12,
    borderWidth: 1, borderColor: theme.border,
    padding: 14, marginBottom: 16,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleText: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  toggleHint: { fontSize: 12, color: theme.textMuted },

  form: { padding: 16, gap: 4 },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tabBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.bg,
  },
  tabBtnAtivoA: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  tabBtnAtivoB: { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },

  autoHint: { fontSize: 11, color: theme.textMuted, fontStyle: 'italic', marginTop: 4 },

  vereditoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.surface, borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 2,
  },
  vereditoTitulo: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
  vereditoSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  projecao: { padding: 16 },
  projRow: { flexDirection: 'row' },
  projCol: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  projDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  projLabel: { fontSize: 12, color: theme.textMuted },
  projValor: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  projSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  projEconomia: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#dcfce7', borderRadius: 10, padding: 12, marginTop: 12,
  },
  projEconomiaText: { fontSize: 13, color: theme.income, fontWeight: '600', flex: 1 },
})

const vc = StyleSheet.create({
  card: {
    backgroundColor: theme.surface, borderRadius: 14,
    borderWidth: 1, borderColor: theme.border, padding: 12,
    minHeight: 120,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  resultado: { alignItems: 'center', gap: 4 },
  modelo: { fontSize: 12, fontWeight: '600', color: theme.textPrimary, textAlign: 'center' },
  valor: { fontSize: 18, fontWeight: '700' },
  ano: { fontSize: 11, color: theme.textMuted },
  trocarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 6, paddingVertical: 4, paddingHorizontal: 8,
    backgroundColor: theme.bg, borderRadius: 8,
  },
  trocarText: { fontSize: 11, color: theme.textMuted },
  seletores: { gap: 4 },
})

const sel = StyleSheet.create({
  wrapper: { marginBottom: 6 },
  label: { fontSize: 11, fontWeight: '600', color: theme.textSecondary, marginBottom: 4 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.bg, borderRadius: 10, borderWidth: 1,
    borderColor: theme.border, paddingHorizontal: 10, paddingVertical: 10,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 13, color: theme.textPrimary, flex: 1 },
  placeholder: { color: theme.textMuted },
  modal: { flex: 1, backgroundColor: theme.bg, paddingTop: 56 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  modalTitulo: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 12, backgroundColor: theme.surface, borderRadius: 12,
    borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.textPrimary },
  opcao: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  opcaoAtiva: { backgroundColor: '#f0fdf4' },
  opcaoText: { fontSize: 14, color: theme.textPrimary, flex: 1 },
  opcaoTextAtiva: { color: theme.primary, fontWeight: '600' },
  vazio: { textAlign: 'center', color: theme.textMuted, padding: 32, fontSize: 14 },
})

const inp = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textPrimary, marginBottom: 2 },
  hint: { fontSize: 11, color: theme.textMuted, marginBottom: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.bg, borderRadius: 12,
    borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, height: 46,
  },
  prefix: { fontSize: 14, color: theme.textMuted, marginRight: 6 },
  suffix: { fontSize: 13, color: theme.textMuted, marginLeft: 4 },
  input: { flex: 1, fontSize: 15, color: theme.textPrimary },
})

const cr = StyleSheet.create({
  container: { padding: 12 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: theme.border, marginBottom: 4,
  },
  headerLabel: { fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerCenter: { width: 80 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  label: { fontSize: 11, color: theme.textMuted, width: 80, textAlign: 'center' },
  valor: { flex: 1, fontSize: 12, fontWeight: '500', color: theme.textPrimary, textAlign: 'center' },
  valorBom: { color: theme.income, fontWeight: '700' },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 4 },
})
