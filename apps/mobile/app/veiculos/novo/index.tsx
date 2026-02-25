import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, FlatList, Modal, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { theme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

interface FipeItem { codigo: string; nome: string }
interface FipePrice {
  Valor: string; Marca: string; Modelo: string
  AnoModelo: number; Combustivel: string; CodigoFipe: string
}

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

// Selector reutilizável
function Selector({ label, valor, placeholder, opcoes, loading, disabled, onSelect }: {
  label: string; valor: string; placeholder: string
  opcoes: FipeItem[]; loading?: boolean; disabled?: boolean
  onSelect: (item: FipeItem) => void
}) {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const filtradas = opcoes.filter(o => o.nome.toLowerCase().includes(busca.toLowerCase()))
  const selecionado = opcoes.find(o => o.codigo === valor)

  return (
    <>
      <View style={sel.wrapper}>
        <Text style={sel.label}>{label}</Text>
        <TouchableOpacity
          style={[sel.btn, disabled && sel.btnDisabled]}
          onPress={() => { if (!disabled && !loading) setOpen(true) }}
          disabled={disabled || loading}
        >
          {loading ? <ActivityIndicator size="small" color={theme.primary} /> : (
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
              style={sel.searchInput} placeholder={`Buscar ${label.toLowerCase()}...`}
              value={busca} onChangeText={setBusca} autoFocus
              placeholderTextColor={theme.textMuted}
            />
          </View>
          <FlatList
            data={filtradas} keyExtractor={i => i.codigo}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[sel.opcao, item.codigo === valor && sel.opcaoAtiva]}
                onPress={() => { onSelect(item); setOpen(false); setBusca('') }}
              >
                <Text style={[sel.opcaoText, item.codigo === valor && sel.opcaoTextAtiva]}>
                  {item.nome}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={sel.vazio}>Nenhum resultado</Text>}
          />
        </View>
      </Modal>
    </>
  )
}

export default function NovoVeiculoScreen() {
  const [marcas, setMarcas] = useState<FipeItem[]>([])
  const [modelos, setModelos] = useState<FipeItem[]>([])
  const [anos, setAnos] = useState<FipeItem[]>([])
  const [marcaSel, setMarcaSel] = useState('')
  const [modeloSel, setModeloSel] = useState('')
  const [anoSel, setAnoSel] = useState('')
  const [preco, setPreco] = useState<FipePrice | null>(null)
  const [loadMarcas, setLoadMarcas] = useState(true)
  const [loadModelos, setLoadModelos] = useState(false)
  const [loadAnos, setLoadAnos] = useState(false)
  const [loadPreco, setLoadPreco] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    fipeGet('/carros/marcas').then(d => { setMarcas(d ?? []); setLoadMarcas(false) })
  }, [])

  function selecionarMarca(item: FipeItem) {
    setMarcaSel(item.codigo); setModeloSel(''); setAnoSel('')
    setModelos([]); setAnos([]); setPreco(null); setLoadModelos(true)
    fipeGet(`/carros/marcas/${item.codigo}/modelos`).then(d => {
      setModelos(d?.modelos ?? []); setLoadModelos(false)
    })
  }

  function selecionarModelo(item: FipeItem) {
    setModeloSel(item.codigo); setAnoSel('')
    setAnos([]); setPreco(null); setLoadAnos(true)
    fipeGet(`/carros/marcas/${marcaSel}/modelos/${item.codigo}/anos`).then(d => {
      setAnos(d ?? []); setLoadAnos(false)
    })
  }

  function selecionarAno(item: FipeItem) {
    setAnoSel(item.codigo); setLoadPreco(true)
    fipeGet(`/carros/marcas/${marcaSel}/modelos/${modeloSel}/anos/${item.codigo}`).then(d => {
      setPreco(d ?? null); setLoadPreco(false)
    })
  }

  async function salvar() {
    if (!preco) return
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return Alert.alert('Erro', 'Sessão expirada')

      const marcaNome = marcas.find(m => m.codigo === marcaSel)?.nome ?? ''
      const modeloNome = modelos.find(m => m.codigo === modeloSel)?.nome ?? ''
      const anoLabel = anos.find(a => a.codigo === anoSel)?.nome ?? ''

      const { error } = await supabase.from('favorite_vehicles').insert({
        user_id: user.id,
        vehicle_type: 'carros',
        brand_code: marcaSel,
        brand_name: marcaNome,
        model_code: modeloSel,
        model_name: modeloNome,
        year_code: anoSel,
        year_label: anoLabel,
        fipe_code: preco.CodigoFipe,
        fipe_value: parseBRL(preco.Valor),
        display_name: `${marcaNome} ${modeloNome}`,
        position: 0,
      })

      if (error) throw error
      router.back()
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Falha ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Adicionar Veículo</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Selector label="Marca" valor={marcaSel} placeholder="Selecione a marca"
          opcoes={marcas} loading={loadMarcas} onSelect={selecionarMarca} />

        <Selector label="Modelo" valor={modeloSel} placeholder="Selecione o modelo"
          opcoes={modelos} loading={loadModelos} disabled={!marcaSel} onSelect={selecionarModelo} />

        <Selector label="Ano" valor={anoSel} placeholder="Selecione o ano"
          opcoes={anos} loading={loadAnos} disabled={!modeloSel} onSelect={selecionarAno} />

        {loadPreco && (
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        )}

        {preco && (
          <View style={styles.precoCard}>
            <View style={styles.precoIcone}>
              <Ionicons name="car-sport" size={28} color={theme.primary} />
            </View>
            <Text style={styles.precoNome}>{preco.Marca} {preco.Modelo}</Text>
            <Text style={styles.precoValor}>{preco.Valor}</Text>
            <Text style={styles.precoSub}>
              {preco.AnoModelo === 32000 ? '0 km' : preco.AnoModelo} • {preco.Combustivel}
              {preco.CodigoFipe ? ` • FIPE ${preco.CodigoFipe}` : ''}
            </Text>

            <TouchableOpacity
              style={[styles.salvarBtn, salvando && { opacity: 0.6 }]}
              onPress={salvar} disabled={salvando}
            >
              {salvando ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.salvarText}>Adicionar veículo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  backBtn: { padding: 8, borderRadius: 20, backgroundColor: theme.bg },
  headerTitulo: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
  content: { padding: 16, paddingBottom: 48 },

  precoCard: {
    backgroundColor: theme.surface, borderRadius: 20, padding: 24,
    alignItems: 'center', marginTop: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  precoIcone: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  precoNome: { fontSize: 16, fontWeight: '600', color: theme.textPrimary, textAlign: 'center' },
  precoValor: { fontSize: 28, fontWeight: '700', color: theme.income, marginTop: 4 },
  precoSub: { fontSize: 12, color: theme.textMuted, marginTop: 4 },

  salvarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 14,
    marginTop: 20, width: '100%',
  },
  salvarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})

const sel = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textPrimary, marginBottom: 6 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1,
    borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 14,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 15, color: theme.textPrimary, flex: 1 },
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
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  opcaoAtiva: { backgroundColor: '#f0fdf4' },
  opcaoText: { fontSize: 14, color: theme.textPrimary },
  opcaoTextAtiva: { color: theme.primary, fontWeight: '600' },
  vazio: { textAlign: 'center', color: theme.textMuted, padding: 32 },
})
