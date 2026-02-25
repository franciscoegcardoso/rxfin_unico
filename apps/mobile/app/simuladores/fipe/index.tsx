import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, FlatList, Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme, VictoryTooltip } from 'victory-native'
import { ScreenLayout } from '../../../src/components/ui/ScreenLayout'
import { SectionCard } from '../../../src/components/ui/SectionCard'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import { CurrencyText } from '../../../src/components/ui/CurrencyText'
import { theme } from '../../../src/lib/theme'
import { supabase } from '../../../src/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────
type VehicleType = 'carros' | 'motos' | 'caminhoes'

interface FipeItem { codigo: string; nome: string }
interface FipePrice {
  Valor: string; Marca: string; Modelo: string
  AnoModelo: number; Combustivel: string
  CodigoFipe: string; MesReferencia: string
}
interface YearPrice { ano: string; label: string; valor: number }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
const PROXY = `${SUPABASE_URL}/functions/v1/fipe-proxy`

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

function idadeVeiculo(anoModelo: number): { label: string; cor: string; bg: string } {
  const idade = new Date().getFullYear() - anoModelo
  if (anoModelo === 32000 || idade <= 0) return { label: '0 km', cor: '#16a34a', bg: '#dcfce7' }
  if (idade <= 3) return { label: `${idade} ${idade === 1 ? 'ano' : 'anos'}`, cor: '#16a34a', bg: '#dcfce7' }
  if (idade <= 5) return { label: `${idade} anos`, cor: '#d97706', bg: '#fef3c7' }
  if (idade <= 10) return { label: `${idade} anos`, cor: '#ea580c', bg: '#ffedd5' }
  return { label: `${idade} anos`, cor: '#dc2626', bg: '#fee2e2' }
}

// ─── Componente de seleção com busca ─────────────────────────────────────────
interface SelectorProps {
  label: string
  valor: string
  placeholder: string
  opcoes: FipeItem[]
  loading?: boolean
  disabled?: boolean
  onSelect: (item: FipeItem) => void
}

function Selector({ label, valor, placeholder, opcoes, loading, disabled, onSelect }: SelectorProps) {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState('')

  const filtradas = opcoes.filter(o =>
    o.nome.toLowerCase().includes(busca.toLowerCase())
  )

  const selecionado = opcoes.find(o => o.codigo === valor)

  return (
    <>
      <View style={sel.wrapper}>
        <Text style={sel.label}>{label}</Text>
        <TouchableOpacity
          style={[sel.btn, disabled && sel.btnDisabled]}
          onPress={() => { if (!disabled && !loading) setOpen(true) }}
          disabled={disabled || loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Text style={[sel.btnText, !selecionado && sel.placeholder]} numberOfLines={1}>
              {selecionado?.nome ?? placeholder}
            </Text>
          )}
          {!loading && <Ionicons name="chevron-down" size={16} color={theme.textMuted} />}
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
              value={busca}
              onChangeText={setBusca}
              autoFocus
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
                {item.codigo === valor && (
                  <Ionicons name="checkmark" size={16} color={theme.primary} />
                )}
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={sel.vazio}>Nenhum resultado encontrado</Text>
            }
          />
        </View>
      </Modal>
    </>
  )
}

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function FipeScreen() {
  const [tipo, setTipo] = useState<VehicleType>('carros')
  const [marcas, setMarcas] = useState<FipeItem[]>([])
  const [modelos, setModelos] = useState<FipeItem[]>([])
  const [anos, setAnos] = useState<FipeItem[]>([])
  const [marcaSel, setMarcaSel] = useState('')
  const [modeloSel, setModeloSel] = useState('')
  const [anoSel, setAnoSel] = useState('')
  const [preco, setPreco] = useState<FipePrice | null>(null)
  const [precosPorAno, setPrecosPorAno] = useState<YearPrice[]>([])
  const [loadMarcas, setLoadMarcas] = useState(false)
  const [loadModelos, setLoadModelos] = useState(false)
  const [loadAnos, setLoadAnos] = useState(false)
  const [loadPreco, setLoadPreco] = useState(false)
  const [loadGrafico, setLoadGrafico] = useState(false)

  // Carrega marcas ao mudar tipo
  useEffect(() => {
    setMarcas([]); setModelos([]); setAnos([])
    setMarcaSel(''); setModeloSel(''); setAnoSel('')
    setPreco(null); setPrecosPorAno([])
    setLoadMarcas(true)
    fipeGet(`/${tipo}/marcas`).then(d => {
      setMarcas(d ?? [])
      setLoadMarcas(false)
    })
  }, [tipo])

  // Carrega modelos ao selecionar marca
  useEffect(() => {
    if (!marcaSel) return
    setModelos([]); setAnos([])
    setModeloSel(''); setAnoSel('')
    setPreco(null); setPrecosPorAno([])
    setLoadModelos(true)
    fipeGet(`/${tipo}/marcas/${marcaSel}/modelos`).then(d => {
      setModelos(d?.modelos ?? [])
      setLoadModelos(false)
    })
  }, [marcaSel])

  // Carrega anos ao selecionar modelo
  useEffect(() => {
    if (!marcaSel || !modeloSel) return
    setAnos([]); setAnoSel('')
    setPreco(null); setPrecosPorAno([])
    setLoadAnos(true)
    fipeGet(`/${tipo}/marcas/${marcaSel}/modelos/${modeloSel}/anos`).then(d => {
      setAnos(d ?? [])
      setLoadAnos(false)
    })
  }, [modeloSel])

  // Carrega preço ao selecionar ano
  useEffect(() => {
    if (!marcaSel || !modeloSel || !anoSel) return
    setPreco(null)
    setLoadPreco(true)
    fipeGet(`/${tipo}/marcas/${marcaSel}/modelos/${modeloSel}/anos/${anoSel}`).then(d => {
      setPreco(d)
      setLoadPreco(false)
    })
  }, [anoSel])

  // Carrega preços por ano para o gráfico (quando modelo selecionado)
  useEffect(() => {
    if (!marcaSel || !modeloSel || anos.length === 0) return
    setPrecosPorAno([])
    setLoadGrafico(true)

    const fetchTodos = async () => {
      const resultados: YearPrice[] = []
      for (const ano of anos) {
        try {
          await new Promise(r => setTimeout(r, 200))
          const d = await fipeGet(`/${tipo}/marcas/${marcaSel}/modelos/${modeloSel}/anos/${ano.codigo}`)
          if (d?.Valor) {
            const anoLabel = ano.nome.startsWith('32000') ? '0km' : ano.nome.split(' ')[0]
            resultados.push({ ano: ano.codigo, label: anoLabel, valor: parseBRL(d.Valor) })
          }
        } catch {}
      }
      setPrecosPorAno(resultados.sort((a, b) => a.label.localeCompare(b.label)))
      setLoadGrafico(false)
    }
    fetchTodos()
  }, [anos])

  const tipoOpcoes: { value: VehicleType; label: string; icon: any }[] = [
    { value: 'carros', label: 'Carros', icon: 'car' },
    { value: 'motos', label: 'Motos', icon: 'bicycle' },
    { value: 'caminhoes', label: 'Caminhões', icon: 'bus' },
  ]

  const precoValor = preco ? parseBRL(preco.Valor) : 0
  const idade = preco ? idadeVeiculo(preco.AnoModelo) : null

  return (
    <ScreenLayout titulo="Tabela FIPE">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Tipo de veículo */}
        <SectionCard titulo="Tipo de Veículo">
          <View style={styles.tipoRow}>
            {tipoOpcoes.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[styles.tipoBtn, tipo === t.value && styles.tipoBtnAtivo]}
                onPress={() => setTipo(t.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={t.icon}
                  size={22}
                  color={tipo === t.value ? theme.primary : theme.textMuted}
                />
                <Text style={[styles.tipoLabel, tipo === t.value && styles.tipoLabelAtivo]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SectionCard>

        {/* Seletores */}
        <SectionCard titulo="Dados do Veículo">
          <View style={{ padding: 16, gap: 4 }}>
            <Selector
              label="Marca"
              valor={marcaSel}
              placeholder="Selecione a marca"
              opcoes={marcas}
              loading={loadMarcas}
              onSelect={i => setMarcaSel(i.codigo)}
            />
            <Selector
              label="Modelo"
              valor={modeloSel}
              placeholder={marcaSel ? 'Selecione o modelo' : 'Selecione a marca primeiro'}
              opcoes={modelos}
              loading={loadModelos}
              disabled={!marcaSel}
              onSelect={i => setModeloSel(i.codigo)}
            />
            <Selector
              label="Ano / Modelo"
              valor={anoSel}
              placeholder={modeloSel ? 'Selecione o ano' : 'Selecione o modelo primeiro'}
              opcoes={anos.map(a => ({
                codigo: a.codigo,
                nome: a.nome.startsWith('32000')
                  ? `0 km (${a.nome.replace('32000', '').trim()})`
                  : a.nome,
              }))}
              loading={loadAnos}
              disabled={!modeloSel}
              onSelect={i => setAnoSel(i.codigo)}
            />
          </View>
        </SectionCard>

        {/* Resultado */}
        {loadPreco && (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.loadingText}>Consultando tabela FIPE...</Text>
          </View>
        )}

        {preco && !loadPreco && (
          <View style={styles.resultCard}>
            {/* Badge consulta + idade */}
            <View style={styles.resultTopRow}>
              <View style={styles.consultaBadge}>
                <Ionicons name="checkmark-circle" size={13} color={theme.income} />
                <Text style={styles.consultaText}>Consulta realizada</Text>
              </View>
              {idade && (
                <View style={[styles.idadeBadge, { backgroundColor: idade.bg }]}>
                  <Text style={[styles.idadeText, { color: idade.cor }]}>{idade.label}</Text>
                </View>
              )}
            </View>

            <Text style={styles.resultLabel}>Valor FIPE</Text>
            <Text style={styles.resultValor}>{preco.Valor}</Text>
            <Text style={styles.resultNome}>{preco.Marca} {preco.Modelo}</Text>

            <View style={styles.resultDivider} />

            <View style={styles.resultGrid}>
              <View style={styles.resultGridItem}>
                <Text style={styles.resultGridLabel}>Código FIPE</Text>
                <Text style={styles.resultGridValor}>{preco.CodigoFipe}</Text>
              </View>
              <View style={styles.resultGridItem}>
                <Text style={styles.resultGridLabel}>Referência</Text>
                <Text style={styles.resultGridValor}>{preco.MesReferencia}</Text>
              </View>
              <View style={styles.resultGridItem}>
                <Text style={styles.resultGridLabel}>Combustível</Text>
                <Text style={styles.resultGridValor}>{preco.Combustivel}</Text>
              </View>
              <View style={styles.resultGridItem}>
                <Text style={styles.resultGridLabel}>Ano Modelo</Text>
                <Text style={styles.resultGridValor}>
                  {preco.AnoModelo === 32000 ? '0 km' : String(preco.AnoModelo)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Gráfico preços por ano */}
        {(precosPorAno.length > 0 || loadGrafico) && marcaSel && modeloSel && (
          <SectionCard titulo="Preço por Ano / Modelo">
            {loadGrafico ? (
              <View style={styles.graficoPH}>
                <ActivityIndicator color={theme.primary} />
                <Text style={styles.loadingText}>Carregando preços por ano...</Text>
              </View>
            ) : (
              <View style={{ paddingBottom: 8 }}>
                <VictoryChart
                  height={220}
                  theme={VictoryTheme.material}
                  padding={{ top: 16, bottom: 40, left: 64, right: 16 }}
                  domainPadding={{ x: 12 }}
                >
                  <VictoryAxis
                    style={{
                      tickLabels: { fontSize: 8, fill: theme.textMuted, angle: -35, textAnchor: 'end' },
                      grid: { stroke: 'transparent' },
                      axis: { stroke: theme.border },
                    }}
                  />
                  <VictoryAxis
                    dependentAxis
                    tickFormat={v => formatBRLShort(v)}
                    style={{
                      tickLabels: { fontSize: 8, fill: theme.textMuted },
                      grid: { stroke: theme.border, strokeDasharray: '4,4' },
                      axis: { stroke: 'transparent' },
                    }}
                  />
                  <VictoryBar
                    data={precosPorAno}
                    x="label"
                    y="valor"
                    style={{
                      data: {
                        fill: ({ datum }) =>
                          datum.ano === anoSel ? '#f59e0b' : theme.primary,
                        borderRadius: 4,
                      },
                    }}
                    cornerRadius={{ top: 3 }}
                    animate={{ duration: 500 }}
                  />
                </VictoryChart>
                <Text style={styles.graficoNota}>
                  Barra destacada = ano selecionado. Valores FIPE atuais por ano/modelo.
                </Text>
              </View>
            )}
          </SectionCard>
        )}

        {/* Estado inicial */}
        {!marcaSel && !loadMarcas && (
          <EmptyState
            icon="car-outline"
            titulo="Consulte a Tabela FIPE"
            descricao="Selecione marca, modelo e ano para ver o valor de mercado do veículo."
          />
        )}

      </ScrollView>
    </ScreenLayout>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },

  tipoRow: { flexDirection: 'row' },
  tipoBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14, gap: 6,
    borderRightWidth: 1, borderRightColor: theme.border,
  },
  tipoBtnAtivo: { backgroundColor: '#f0fdf4' },
  tipoLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '600' },
  tipoLabelAtivo: { color: theme.primary },

  loadingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: theme.border, marginBottom: 16,
  },
  loadingText: { fontSize: 13, color: theme.textMuted },

  resultCard: {
    backgroundColor: '#f0fdf4', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 16,
  },
  resultTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  consultaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10,
  },
  consultaText: { fontSize: 11, color: theme.income, fontWeight: '600' },
  idadeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  idadeText: { fontSize: 11, fontWeight: '700' },
  resultLabel: { fontSize: 13, color: theme.textMuted, textAlign: 'center' },
  resultValor: { fontSize: 36, fontWeight: 'bold', color: theme.income, textAlign: 'center', marginTop: 4 },
  resultNome: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginTop: 4 },
  resultDivider: { height: 1, backgroundColor: '#bbf7d0', marginVertical: 16 },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  resultGridItem: { width: '45%' },
  resultGridLabel: { fontSize: 11, color: theme.textMuted, marginBottom: 2 },
  resultGridValor: { fontSize: 13, color: theme.textPrimary, fontWeight: '600' },

  graficoPH: {
    height: 180, justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  graficoNota: {
    fontSize: 10, color: theme.textMuted, textAlign: 'center',
    paddingHorizontal: 16, paddingBottom: 8,
  },
})

const sel = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.bg, borderRadius: 12, borderWidth: 1,
    borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 12,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 14, color: theme.textPrimary, flex: 1 },
  placeholder: { color: theme.textMuted },

  modal: { flex: 1, backgroundColor: theme.bg, paddingTop: 56 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border,
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
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  opcaoAtiva: { backgroundColor: '#f0fdf4' },
  opcaoText: { fontSize: 14, color: theme.textPrimary, flex: 1 },
  opcaoTextAtiva: { color: theme.primary, fontWeight: '600' },
  vazio: { textAlign: 'center', color: theme.textMuted, padding: 32, fontSize: 14 },
})