import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native'
import { supabase } from '@/lib/supabase'

interface Conta {
  id: string
  nome: string
  valor: number
  data_vencimento: string
  tipo: string
  vencida: boolean
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ContasScreen() {
  const [contas, setContas] = useState<Conta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContas()
  }, [])

  async function loadContas() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const hoje = new Date().toISOString().split('T')[0]

      const { data } = await supabase
        .from('contas_pagar_receber')
        .select('id, nome, valor, data_vencimento, tipo')
        .eq('user_id', user.id)
        .is('data_pagamento', null)
        .order('data_vencimento', { ascending: true })
        .limit(50)

      setContas(data?.map(c => ({
        id: c.id,
        nome: c.nome,
        valor: c.valor,
        data_vencimento: c.data_vencimento,
        tipo: c.tipo,
        vencida: c.data_vencimento < hoje,
      })) ?? [])

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const vencidas = contas.filter(c => c.vencida)
  const aVencer = contas.filter(c => !c.vencida)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contas</Text>
        <Text style={styles.subtitle}>A pagar e a receber</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#6366f1" />
        </View>
      ) : contas.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nenhuma conta pendente</Text>
          <Text style={styles.emptyHint}>Adicione contas na versão web</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>

          {vencidas.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>🔴 Vencidas ({vencidas.length})</Text>
              {vencidas.map(c => <ContaItem key={c.id} conta={c} />)}
            </>
          )}

          {aVencer.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>📅 A vencer ({aVencer.length})</Text>
              {aVencer.map(c => <ContaItem key={c.id} conta={c} />)}
            </>
          )}

        </ScrollView>
      )}
    </View>
  )
}

function ContaItem({ conta }: { conta: Conta }) {
  const isPagar = conta.tipo === 'pagar'
  return (
    <View style={styles.item}>
      <View style={styles.itemLeft}>
        <Text style={styles.itemNome}>{conta.nome}</Text>
        <Text style={styles.itemData}>Vence: {conta.data_vencimento}</Text>
      </View>
      <View style={styles.itemRight}>
        <Text style={[styles.itemValor, { color: isPagar ? '#f87171' : '#4ade80' }]}>
          {formatBRL(conta.valor)}
        </Text>
        <Text style={styles.itemTipo}>{isPagar ? 'Pagar' : 'Receber'}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  lista: { padding: 24, paddingBottom: 40 },
  sectionTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 8 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 8 },
  itemLeft: { flex: 1, marginRight: 12 },
  itemNome: { color: '#e2e8f0', fontSize: 14 },
  itemData: { color: '#475569', fontSize: 11, marginTop: 4 },
  itemRight: { alignItems: 'flex-end' },
  itemValor: { fontSize: 15, fontWeight: 'bold' },
  itemTipo: { color: '#475569', fontSize: 11, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { color: '#64748b', fontSize: 14 },
  emptyHint: { color: '#475569', fontSize: 12 },
})