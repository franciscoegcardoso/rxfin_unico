import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'

interface Transacao {
  id: string
  nome: string
  descricao_raw?: string
  valor: number
  tipo: 'receita' | 'despesa'
  data: string
  categoria?: string
  status?: string
  moeda?: string
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatData(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })
}

export default function TransacaoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [tx, setTx] = useState<Transacao | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const { data, error } = await supabase
        .from('pluggy_transactions')
        .select('id, description, description_raw, amount, type, date, category, status, currency_code')
        .eq('id', id)
        .single()

      if (error || !data) return

      setTx({
        id: data.id,
        nome: data.description ?? '—',
        descricao_raw: data.description_raw ?? undefined,
        valor: Number(data.amount),
        tipo: data.type === 'CREDIT' ? 'receita' : 'despesa',
        data: data.date,
        categoria: data.category ?? undefined,
        status: data.status ?? undefined,
        moeda: data.currency_code ?? 'BRL',
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function excluirTransacao() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Try pluggy_transactions first
      const { error: errPluggy } = await supabase
        .from('pluggy_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (errPluggy) {
        // Fallback to lancamentos_realizados
        const { error: errManual } = await supabase
          .from('lancamentos_realizados')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)

        if (errManual) throw errManual
      }

      router.back()
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Falha ao excluir')
    }
  }

  function confirmarExclusao() {
    Alert.alert(
      'Excluir lançamento',
      `Tem certeza que deseja excluir "${tx?.nome}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: excluirTransacao },
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    )
  }

  if (!tx) {
    return (
      <View style={styles.center}>
        <Text style={styles.erroText}>Transação não encontrada</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.voltarBtn}>
          <Text style={styles.voltarText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const isReceita = tx.tipo === 'receita'
  const cor = isReceita ? theme.income : theme.expense
  const bgIcone = isReceita ? '#dcfce7' : '#fee2e2'

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Detalhes</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push(`/lancamento/editar/${tx.id}` as any)}
            style={styles.actionBtn}
          >
            <Ionicons name="create-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmarExclusao} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={20} color={theme.expense} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Card principal */}
        <View style={styles.heroCard}>
          <View style={[styles.heroIcone, { backgroundColor: bgIcone }]}>
            <Ionicons
              name={isReceita ? 'arrow-up' : 'arrow-down'}
              size={28}
              color={cor}
            />
          </View>
          <Text style={styles.heroNome} numberOfLines={2}>{tx.nome}</Text>
          <Text style={[styles.heroValor, { color: cor }]}>
            {isReceita ? '+' : '-'}{formatBRL(tx.valor)}
          </Text>
          <View style={[styles.tipoBadge, { backgroundColor: bgIcone }]}>
            <Text style={[styles.tipoText, { color: cor }]}>
              {isReceita ? 'Receita' : 'Despesa'}
            </Text>
          </View>
        </View>

        {/* Detalhes */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>INFORMAÇÕES</Text>

          <DetalheRow
            icon="calendar-outline"
            label="Data"
            value={formatData(tx.data)}
          />
          {tx.categoria && (
            <DetalheRow
              icon="pricetag-outline"
              label="Categoria"
              value={tx.categoria}
            />
          )}
          {tx.moeda && (
            <DetalheRow
              icon="cash-outline"
              label="Moeda"
              value={tx.moeda}
            />
          )}
          {tx.status && (
            <DetalheRow
              icon="checkmark-circle-outline"
              label="Status"
              value={tx.status}
            />
          )}
          {tx.descricao_raw && tx.descricao_raw !== tx.nome && (
            <DetalheRow
              icon="document-text-outline"
              label="Descrição original"
              value={tx.descricao_raw}
            />
          )}
        </View>

        {/* Valor detalhado */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>VALOR</Text>
          <View style={styles.valorBox}>
            <Text style={styles.valorLabel}>Valor da transação</Text>
            <Text style={[styles.valorGrande, { color: cor }]}>
              {isReceita ? '+' : '-'}{formatBRL(tx.valor)}
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  )
}

function DetalheRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.detalheRow}>
      <View style={styles.detalheEsq}>
        <Ionicons name={icon} size={16} color={theme.primary} />
        <Text style={styles.detalheLabel}>{label}</Text>
      </View>
      <Text style={styles.detalheValor} numberOfLines={2}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
  erroText: { color: theme.textMuted, fontSize: 15 },
  voltarBtn: { backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  voltarText: { color: '#fff', fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backBtn: { padding: 8, borderRadius: 20, backgroundColor: theme.bg },
  headerTitulo: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
  headerActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 8, borderRadius: 20, backgroundColor: theme.bg },

  content: { padding: 16, paddingBottom: 40 },

  heroCard: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  heroIcone: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroNome: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroValor: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tipoBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tipoText: { fontSize: 13, fontWeight: '600' },

  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardTitulo: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textMuted,
    letterSpacing: 0.5,
    marginBottom: 14,
  },

  detalheRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  detalheEsq: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detalheLabel: { color: theme.textSecondary, fontSize: 14 },
  detalheValor: { color: theme.textPrimary, fontSize: 14, fontWeight: '500', maxWidth: 200, textAlign: 'right' },

  valorBox: { alignItems: 'center', paddingVertical: 8 },
  valorLabel: { color: theme.textMuted, fontSize: 13, marginBottom: 8 },
  valorGrande: { fontSize: 36, fontWeight: 'bold' },
})