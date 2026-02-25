import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'

type Tipo = 'despesa' | 'receita'

const CATEGORIAS_DESPESA = [
  'Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação',
  'Lazer', 'Vestuário', 'Assinaturas', 'Pets', 'Presentes',
  'Impostos', 'Seguros', 'Investimentos', 'Outros',
]

const CATEGORIAS_RECEITA = [
  'Salário', 'Freelance', 'Investimentos', 'Aluguel',
  'Vendas', 'Reembolso', 'Prêmio', 'Outros',
]

interface Props {
  // Para edição: dados iniciais
  initialData?: {
    id: string
    nome: string
    valor: string
    tipo: Tipo
    data: string
    categoria: string
    source: 'pluggy' | 'manual'
  }
}

export default function TransacaoForm({ initialData }: Props) {
  const isEdit = !!initialData

  const [tipo, setTipo] = useState<Tipo>(initialData?.tipo ?? 'despesa')
  const [nome, setNome] = useState(initialData?.nome ?? '')
  const [valor, setValor] = useState(initialData?.valor ?? '')
  const [data, setData] = useState(initialData?.data ?? new Date().toISOString().split('T')[0])
  const [categoria, setCategoria] = useState(initialData?.categoria ?? '')
  const [showCategorias, setShowCategorias] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const categorias = tipo === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA

  function parseMoney(text: string): number {
    return parseFloat(text.replace(/\./g, '').replace(',', '.')) || 0
  }

  function formatDateInput(d: string): string {
    // Convert yyyy-mm-dd to dd/mm/yyyy for display
    const parts = d.split('-')
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
    return d
  }

  function parseDateInput(d: string): string {
    // Convert dd/mm/yyyy back to yyyy-mm-dd
    const parts = d.replace(/\//g, '-').split('-')
    if (parts.length === 3 && parts[0].length === 2) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return d
  }

  const [dataDisplay, setDataDisplay] = useState(formatDateInput(data))

  async function salvar() {
    const valorNum = parseMoney(valor)
    if (!nome.trim()) return Alert.alert('Erro', 'Informe uma descrição')
    if (valorNum <= 0) return Alert.alert('Erro', 'Informe um valor válido')

    const dataISO = parseDateInput(dataDisplay)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) return Alert.alert('Erro', 'Data inválida. Use dd/mm/aaaa')

    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return Alert.alert('Erro', 'Sessão expirada')

      const mesRef = dataISO.substring(0, 7) // yyyy-mm

      if (isEdit && initialData) {
        if (initialData.source === 'pluggy') {
          // Editar pluggy_transactions
          const { error } = await supabase
            .from('pluggy_transactions')
            .update({
              description: nome.trim(),
              amount: valorNum,
              type: tipo === 'receita' ? 'CREDIT' : 'DEBIT',
              date: dataISO,
              category: categoria || null,
            })
            .eq('id', initialData.id)
            .eq('user_id', user.id)

          if (error) throw error
        } else {
          // Editar lancamentos_realizados
          const { error } = await supabase
            .from('lancamentos_realizados')
            .update({
              nome: nome.trim(),
              valor_realizado: valorNum,
              tipo,
              data_registro: dataISO,
              mes_referencia: mesRef,
            })
            .eq('id', initialData.id)
            .eq('user_id', user.id)

          if (error) throw error
        }
      } else {
        // Criar novo em lancamentos_realizados
        const { error } = await supabase
          .from('lancamentos_realizados')
          .insert({
            user_id: user.id,
            nome: nome.trim(),
            valor_realizado: valorNum,
            tipo,
            data_registro: dataISO,
            mes_referencia: mesRef,
          })

        if (error) throw error
      }

      router.back()
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Falha ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>
          {isEdit ? 'Editar Lançamento' : 'Novo Lançamento'}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Tipo toggle */}
        <View style={styles.tipoRow}>
          <TouchableOpacity
            style={[styles.tipoBtn, tipo === 'despesa' && styles.tipoBtnDespesa]}
            onPress={() => { setTipo('despesa'); setCategoria('') }}
          >
            <Ionicons
              name="arrow-down"
              size={18}
              color={tipo === 'despesa' ? '#fff' : theme.expense}
            />
            <Text style={[styles.tipoText, tipo === 'despesa' && styles.tipoTextAtivo]}>
              Despesa
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tipoBtn, tipo === 'receita' && styles.tipoBtnReceita]}
            onPress={() => { setTipo('receita'); setCategoria('') }}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={tipo === 'receita' ? '#fff' : theme.income}
            />
            <Text style={[styles.tipoText, tipo === 'receita' && styles.tipoTextAtivo]}>
              Receita
            </Text>
          </TouchableOpacity>
        </View>

        {/* Valor */}
        <View style={styles.valorCard}>
          <Text style={styles.valorLabel}>Valor</Text>
          <View style={styles.valorRow}>
            <Text style={[styles.valorPrefix, { color: tipo === 'receita' ? theme.income : theme.expense }]}>
              R$
            </Text>
            <TextInput
              style={[styles.valorInput, { color: tipo === 'receita' ? theme.income : theme.expense }]}
              value={valor}
              onChangeText={setValor}
              placeholder="0,00"
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
              autoFocus={!isEdit}
            />
          </View>
        </View>

        {/* Descrição */}
        <View style={styles.fieldCard}>
          <View style={styles.fieldRow}>
            <Ionicons name="document-text-outline" size={20} color={theme.primary} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Descrição</Text>
              <TextInput
                style={styles.fieldInput}
                value={nome}
                onChangeText={setNome}
                placeholder="Ex: Supermercado, Salário..."
                placeholderTextColor={theme.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Data */}
        <View style={styles.fieldCard}>
          <View style={styles.fieldRow}>
            <Ionicons name="calendar-outline" size={20} color={theme.primary} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Data</Text>
              <TextInput
                style={styles.fieldInput}
                value={dataDisplay}
                onChangeText={setDataDisplay}
                placeholder="dd/mm/aaaa"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </View>
        </View>

        {/* Categoria */}
        <TouchableOpacity
          style={styles.fieldCard}
          onPress={() => setShowCategorias(!showCategorias)}
        >
          <View style={styles.fieldRow}>
            <Ionicons name="pricetag-outline" size={20} color={theme.primary} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Categoria</Text>
              <Text style={[styles.fieldInput, !categoria && { color: theme.textMuted }]}>
                {categoria || 'Selecionar categoria'}
              </Text>
            </View>
            <Ionicons
              name={showCategorias ? 'chevron-up' : 'chevron-down'}
              size={18} color={theme.textMuted}
            />
          </View>
        </TouchableOpacity>

        {showCategorias && (
          <View style={styles.categoriasGrid}>
            {categorias.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, categoria === cat && styles.catChipAtivo]}
                onPress={() => { setCategoria(cat); setShowCategorias(false) }}
              >
                <Text style={[styles.catChipText, categoria === cat && styles.catChipTextAtivo]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Botão salvar */}
        <TouchableOpacity
          style={[styles.salvarBtn, salvando && styles.salvarBtnDisabled]}
          onPress={salvar}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.salvarText}>
                {isEdit ? 'Salvar alterações' : 'Adicionar lançamento'}
              </Text>
            </>
          )}
        </TouchableOpacity>

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

  tipoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tipoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border,
  },
  tipoBtnDespesa: { backgroundColor: theme.expense, borderColor: theme.expense },
  tipoBtnReceita: { backgroundColor: theme.income, borderColor: theme.income },
  tipoText: { fontSize: 15, fontWeight: '600', color: theme.textMuted },
  tipoTextAtivo: { color: '#fff' },

  valorCard: {
    backgroundColor: theme.surface, borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  valorLabel: { fontSize: 12, color: theme.textMuted, marginBottom: 8 },
  valorRow: { flexDirection: 'row', alignItems: 'baseline' },
  valorPrefix: { fontSize: 20, fontWeight: '600', marginRight: 4 },
  valorInput: { fontSize: 36, fontWeight: 'bold', minWidth: 100, textAlign: 'center' },

  fieldCard: {
    backgroundColor: theme.surface, borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: theme.border,
  },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fieldContent: { flex: 1 },
  fieldLabel: { fontSize: 11, color: theme.textMuted, marginBottom: 4 },
  fieldInput: { fontSize: 15, color: theme.textPrimary, fontWeight: '500' },

  categoriasGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginBottom: 16, paddingHorizontal: 4,
  },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
  },
  catChipAtivo: { backgroundColor: theme.primary, borderColor: theme.primary },
  catChipText: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
  catChipTextAtivo: { color: '#fff' },

  salvarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 16,
    marginTop: 16,
  },
  salvarBtnDisabled: { opacity: 0.6 },
  salvarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
