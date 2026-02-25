import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { VictoryPie, VictoryChart, VictoryBar, VictoryAxis, VictoryTheme } from 'victory-native'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { theme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

const SCREEN_WIDTH = Dimensions.get('window').width

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

const TIPO_CORES: Record<string, string> = {
  imovel: '#3b82f6', veiculo: '#f59e0b', investimento: '#16a34a',
  conta: '#8b5cf6', outro: '#6b7280',
}

const TIPO_ICONES: Record<string, string> = {
  imovel: 'home', veiculo: 'car', investimento: 'trending-up',
  conta: 'wallet', outro: 'cube',
}

const TIPO_LABELS: Record<string, string> = {
  imovel: 'Imóveis', veiculo: 'Veículos', investimento: 'Investimentos',
  conta: 'Contas', outro: 'Outros',
}

interface Asset {
  id: string; name: string; type: string; value: number
}

interface Divida {
  id: string; nome: string; saldo_devedor: number; tipo: string
}

export default function BalancoScreen() {
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState<Asset[]>([])
  const [investimentos, setInvestimentos] = useState<{ name: string; balance: number }[]>([])
  const [veiculosFipe, setVeiculosFipe] = useState<{ name: string; value: number }[]>([])
  const [dividas, setDividas] = useState<Divida[]>([])
  const [contasSaldo, setContasSaldo] = useState(0)

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Assets manuais
      const { data: a } = await supabase
        .from('user_assets')
        .select('id, name, type, value')
        .eq('user_id', user.id)
      setAssets(a ?? [])

      // Investimentos Pluggy
      const { data: inv } = await supabase
        .from('pluggy_investments')
        .select('name, balance')
        .eq('user_id', user.id)
      setInvestimentos(inv ?? [])

      // Veículos FIPE
      const { data: veic } = await supabase
        .from('favorite_vehicles')
        .select('display_name, fipe_value')
        .eq('user_id', user.id)
      setVeiculosFipe((veic ?? []).map(v => ({ name: v.display_name, value: Number(v.fipe_value) || 0 })))

      // Contas bancárias
      const { data: contas } = await supabase
        .from('pluggy_accounts')
        .select('balance')
        .eq('user_id', user.id)
      setContasSaldo((contas ?? []).reduce((a, c) => a + (Number(c.balance) || 0), 0))

      // Dívidas (financiamentos)
      const { data: fin } = await supabase
        .from('financiamentos')
        .select('id, nome, saldo_devedor')
        .eq('user_id', user.id)
      setDividas((fin ?? []).map(f => ({
        id: f.id, nome: f.nome, saldo_devedor: Number(f.saldo_devedor) || 0, tipo: 'financiamento',
      })))

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  // Totais por categoria
  const assetsManualValue = assets.reduce((a, b) => a + b.value, 0)
  const investimentosValue = investimentos.reduce((a, b) => a + b.balance, 0)
  const veiculosValue = veiculosFipe.reduce((a, b) => a + b.value, 0)
  const dividaTotal = dividas.reduce((a, b) => a + b.saldo_devedor, 0)

  const totalAtivos = assetsManualValue + investimentosValue + veiculosValue + contasSaldo
  const patrimonioLiquido = totalAtivos - dividaTotal

  // Composição por tipo
  const composicao = [
    { tipo: 'investimento', valor: investimentosValue, label: 'Investimentos' },
    { tipo: 'imovel', valor: assets.filter(a => a.type?.includes('imov') || a.type?.includes('prop')).reduce((s, a) => s + a.value, 0), label: 'Imóveis' },
    { tipo: 'veiculo', valor: veiculosValue, label: 'Veículos' },
    { tipo: 'conta', valor: contasSaldo, label: 'Contas' },
    { tipo: 'outro', valor: assetsManualValue - assets.filter(a => a.type?.includes('imov') || a.type?.includes('prop')).reduce((s, a) => s + a.value, 0), label: 'Outros bens' },
  ].filter(c => c.valor > 0)

  const pieData = composicao.map(c => ({
    x: c.label, y: c.valor,
    color: TIPO_CORES[c.tipo] || TIPO_CORES.outro,
  }))

  const hasData = totalAtivos > 0 || dividaTotal > 0

  return (
    <ScreenLayout titulo="Balanço Patrimonial">
      <ScrollView contentContainerStyle={styles.content}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcone}>
            <Ionicons name="bar-chart" size={28} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitulo}>Balanço Patrimonial</Text>
            <Text style={styles.heroDesc}>
              Visão consolidada dos seus ativos, passivos e patrimônio líquido.
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        ) : !hasData ? (
          <EmptyState
            icon="bar-chart-outline"
            titulo="Sem dados patrimoniais"
            descricao="Adicione bens, investimentos ou conecte sua conta bancária para ver seu balanço."
          />
        ) : (
          <>
            {/* Patrimônio líquido destaque */}
            <View style={[styles.plCard, { borderColor: patrimonioLiquido >= 0 ? theme.income : theme.expense }]}>
              <Text style={styles.plLabel}>Patrimônio líquido</Text>
              <Text style={[styles.plValor, { color: patrimonioLiquido >= 0 ? theme.income : theme.expense }]}>
                {formatBRL(patrimonioLiquido)}
              </Text>
              <View style={styles.plRow}>
                <View style={styles.plItem}>
                  <Ionicons name="arrow-up-circle" size={16} color={theme.income} />
                  <Text style={styles.plItemLabel}>Ativos</Text>
                  <Text style={[styles.plItemValor, { color: theme.income }]}>{formatBRL(totalAtivos)}</Text>
                </View>
                <View style={styles.plDivider} />
                <View style={styles.plItem}>
                  <Ionicons name="arrow-down-circle" size={16} color={theme.expense} />
                  <Text style={styles.plItemLabel}>Passivos</Text>
                  <Text style={[styles.plItemValor, { color: theme.expense }]}>{formatBRL(dividaTotal)}</Text>
                </View>
              </View>
            </View>

            {/* Gráfico composição */}
            {pieData.length > 0 && (
              <SectionCard titulo="Composição patrimonial">
                <View style={{ alignItems: 'center' }}>
                  <VictoryPie
                    data={pieData} x="x" y="y"
                    colorScale={pieData.map(d => d.color)}
                    innerRadius={50}
                    labelRadius={({ innerRadius }) => (Number(innerRadius) || 50) + 28}
                    style={{ labels: { fontSize: 9, fill: theme.textMuted } }}
                    width={SCREEN_WIDTH - 64} height={200}
                    padding={40}
                  />
                </View>
                {/* Legenda */}
                <View style={styles.legendaRow}>
                  {composicao.map(c => (
                    <View key={c.tipo} style={styles.legendaItem}>
                      <View style={[styles.legendaDot, { backgroundColor: TIPO_CORES[c.tipo] || TIPO_CORES.outro }]} />
                      <Text style={styles.legendaText}>{c.label}</Text>
                      <Text style={styles.legendaValor}>{formatBRL(c.valor)}</Text>
                    </View>
                  ))}
                </View>
              </SectionCard>
            )}

            {/* Lista de ativos */}
            <SectionCard titulo="Detalhamento">
              {investimentos.length > 0 && investimentos.map((inv, i) => (
                <View key={`inv-${i}`} style={[styles.detItem, i < investimentos.length - 1 && styles.detBorder]}>
                  <View style={[styles.detIcone, { backgroundColor: '#dcfce720' }]}>
                    <Ionicons name="trending-up" size={16} color={theme.income} />
                  </View>
                  <Text style={styles.detNome} numberOfLines={1}>{inv.name}</Text>
                  <Text style={styles.detValor}>{formatBRL(inv.balance)}</Text>
                </View>
              ))}

              {veiculosFipe.map((v, i) => (
                <View key={`veic-${i}`} style={[styles.detItem, styles.detBorder]}>
                  <View style={[styles.detIcone, { backgroundColor: '#fef3c720' }]}>
                    <Ionicons name="car" size={16} color="#f59e0b" />
                  </View>
                  <Text style={styles.detNome} numberOfLines={1}>{v.name}</Text>
                  <Text style={styles.detValor}>{formatBRL(v.value)}</Text>
                </View>
              ))}

              {contasSaldo > 0 && (
                <View style={[styles.detItem, styles.detBorder]}>
                  <View style={[styles.detIcone, { backgroundColor: '#ede9fe20' }]}>
                    <Ionicons name="wallet" size={16} color="#8b5cf6" />
                  </View>
                  <Text style={styles.detNome}>Contas bancárias</Text>
                  <Text style={styles.detValor}>{formatBRL(contasSaldo)}</Text>
                </View>
              )}

              {assets.map((a, i) => (
                <View key={a.id} style={[styles.detItem, styles.detBorder]}>
                  <View style={[styles.detIcone, { backgroundColor: '#f3f4f620' }]}>
                    <Ionicons name="cube" size={16} color="#6b7280" />
                  </View>
                  <Text style={styles.detNome} numberOfLines={1}>{a.name}</Text>
                  <Text style={styles.detValor}>{formatBRL(a.value)}</Text>
                </View>
              ))}

              {dividas.length > 0 && (
                <>
                  <Text style={styles.secaoPassivos}>Passivos</Text>
                  {dividas.map(d => (
                    <View key={d.id} style={[styles.detItem, styles.detBorder]}>
                      <View style={[styles.detIcone, { backgroundColor: '#fee2e220' }]}>
                        <Ionicons name="card" size={16} color={theme.expense} />
                      </View>
                      <Text style={styles.detNome} numberOfLines={1}>{d.nome}</Text>
                      <Text style={[styles.detValor, { color: theme.expense }]}>-{formatBRL(d.saldo_devedor)}</Text>
                    </View>
                  ))}
                </>
              )}
            </SectionCard>
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  center: { paddingTop: 60, alignItems: 'center' },

  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.surface, borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: theme.border,
  },
  heroIcone: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center',
  },
  heroTitulo: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  heroDesc: { fontSize: 12, color: theme.textMuted, lineHeight: 18, marginTop: 2 },

  plCard: {
    backgroundColor: theme.surface, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 2,
  },
  plLabel: { fontSize: 12, color: theme.textMuted },
  plValor: { fontSize: 32, fontWeight: '700', marginVertical: 4 },
  plRow: { flexDirection: 'row', marginTop: 12, width: '100%' },
  plItem: { flex: 1, alignItems: 'center', gap: 4 },
  plDivider: { width: 1, backgroundColor: theme.border },
  plItemLabel: { fontSize: 11, color: theme.textMuted },
  plItemValor: { fontSize: 15, fontWeight: '600' },

  legendaRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendaDot: { width: 10, height: 10, borderRadius: 5 },
  legendaText: { fontSize: 12, color: theme.textSecondary, flex: 1 },
  legendaValor: { fontSize: 12, fontWeight: '600', color: theme.textPrimary },

  detItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  detBorder: { borderTopWidth: 1, borderTopColor: theme.border },
  detIcone: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  detNome: { fontSize: 13, color: theme.textPrimary, flex: 1 },
  detValor: { fontSize: 14, fontWeight: '600', color: theme.income },
  secaoPassivos: {
    fontSize: 11, fontWeight: '700', color: theme.expense, letterSpacing: 0.5,
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4,
  },
})
