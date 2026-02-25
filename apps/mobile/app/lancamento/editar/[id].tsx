import { useEffect, useState } from 'react'
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import TransacaoForm from '../novo'

export default function EditarTransacao() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [initialData, setInitialData] = useState<any>(null)

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      // Try pluggy_transactions first
      const { data: pluggy, error: errPluggy } = await supabase
        .from('pluggy_transactions')
        .select('id, description, amount, type, date, category')
        .eq('id', id)
        .single()

      if (pluggy && !errPluggy) {
        setInitialData({
          id: pluggy.id,
          nome: pluggy.description ?? '',
          valor: String(pluggy.amount ?? ''),
          tipo: pluggy.type === 'CREDIT' ? 'receita' : 'despesa',
          data: pluggy.date,
          categoria: pluggy.category ?? '',
          source: 'pluggy',
        })
        setLoading(false)
        return
      }

      // Fallback to lancamentos_realizados
      const { data: manual, error: errManual } = await supabase
        .from('lancamentos_realizados')
        .select('id, nome, valor_realizado, tipo, data_registro')
        .eq('id', id)
        .single()

      if (manual && !errManual) {
        setInitialData({
          id: manual.id,
          nome: manual.nome ?? '',
          valor: String(manual.valor_realizado ?? ''),
          tipo: manual.tipo === 'receita' ? 'receita' : 'despesa',
          data: manual.data_registro,
          categoria: '',
          source: 'manual',
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    )
  }

  if (!initialData) {
    return (
      <View style={styles.center}>
        <Text style={styles.erroText}>Transação não encontrada</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.voltarBtn}>
          <Text style={styles.voltarText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return <TransacaoForm initialData={initialData} />
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
  erroText: { color: theme.textMuted, fontSize: 15 },
  voltarBtn: { backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  voltarText: { color: '#fff', fontWeight: '600' },
})
