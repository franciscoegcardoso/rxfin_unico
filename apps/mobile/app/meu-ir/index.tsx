import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { VictoryPie } from 'victory-native'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { theme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

const SCREEN_WIDTH = Dimensions.get('window').width

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

// Tabela IRPF 2025 (simplificada)
const FAIXAS_IR = [
  { ate: 2259.20, aliquota: 0, deducao: 0 },
  { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { ate: Infinity, aliquota: 0.275, deducao: 896.00 },
]

function calcularIRMensal(rendaMensal: number): number {
  const faixa = FAIXAS_IR.find(f => rendaMensal <= f.ate) || FAIXAS_IR[FAIXAS_IR.length - 1]
  return Math.max(0, rendaMensal * faixa.aliquota - faixa.deducao)
}

function getFaixa(rendaMensal: number) {
  for (let i = 0; i < FAIXAS_IR.length; i++) {
    if (rendaMensal <= FAIXAS_IR[i].ate) return { indice: i, ...FAIXAS_IR[i] }
  }
  return { indice: 4, ...FAIXAS_IR[4] }
}

interface IRData {
  rendimentosTributaveis: number
  deducoes: number
  rendimentosIsentos: number
  bensTotal: number
}

export default function MeuIRScreen() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<IRData>({
    rendimentosTributaveis: 0, deducoes: 0, rendimentosIsentos: 0, bensTotal: 0,
  })
  const [tab, setTab] = useState<'simulacao' | 'resumo'>('simulacao')

  const ano = new Date().getFullYear() - 1 // Ano calendário

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Pegar rendimentos do ano anterior via transações
      let rendTributaveis = 0, rendIsentos = 0
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, '0')
        const ultimo = new Date(ano, m, 0).getDate()
        const { data: txs } = await supabase
          .from('pluggy_transactions')
          .select('amount, type, category')
          .eq('user_id', user.id)
          .eq('type', 'CREDIT')
          .gte('date', `${ano}-${mm}-01`)
          .lte('date', `${ano}-${mm}-${ultimo}`)

        txs?.forEach(t => {
          const cat = (t.category ?? '').toLowerCase()
          if (cat.includes('isent') || cat.includes('indeniz') || cat.includes('fgts')) {
            rendIsentos += Number(t.amount)
          } else {
            rendTributaveis += Number(t.amount)
          }
        })
      }

      // Deduções estimadas (saúde, educação via comprovantes)
      const { data: comps } = await supabase
        .from('ir_comprovantes')
        .select('valor')
        .eq('user_id', user.id)
        .eq('ano_fiscal', ano)
      const deducoes = comps?.reduce((a, c) => a + Number(c.valor), 0) ?? 0

      // Bens
      const { data: assets } = await supabase
        .from('user_assets')
        .select('value')
        .eq('user_id', user.id)
      const bensTotal = assets?.reduce((a, b) => a + Number(b.value), 0) ?? 0

      setData({ rendimentosTributaveis: rendTributaveis, deducoes, rendimentosIsentos: rendIsentos, bensTotal })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  // Simulação
  const baseCalculo = Math.max(0, data.rendimentosTributaveis - data.deducoes)
  const rendaMensal = baseCalculo / 12
  const irMensal = calcularIRMensal(rendaMensal)
  const irAnual = irMensal * 12
  const faixa = getFaixa(rendaMensal)
  const aliquotaEfetiva = data.rendimentosTributaveis > 0
    ? (irAnual / data.rendimentosTributaveis) * 100 : 0

  // Gráfico pizza
  const pieData = [
    { x: 'IR', y: Math.max(irAnual, 1), color: theme.expense },
    { x: 'Líquido', y: Math.max(baseCalculo - irAnual, 1), color: theme.income },
    { x: 'Deduções', y: Math.max(data.deducoes, 1), color: '#3b82f6' },
  ].filter(d => d.y > 1)

  return (
    <ScreenLayout titulo="Meu IR">
      <ScrollView contentContainerStyle={styles.content}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcone}>
            <Ionicons name="document-text" size={28} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitulo}>Imposto de Renda {ano}</Text>
            <Text style={styles.heroDesc}>
              Simulação baseada nos seus rendimentos registrados. Valores estimados.
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'simulacao' && styles.tabBtnAtivo]}
            onPress={() => setTab('simulacao')}
          >
            <Text style={[styles.tabText, tab === 'simulacao' && styles.tabTextAtivo]}>Simulação</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'resumo' && styles.tabBtnAtivo]}
            onPress={() => setTab('resumo')}
          >
            <Text style={[styles.tabText, tab === 'resumo' && styles.tabTextAtivo]}>Resumo</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        ) : data.rendimentosTributaveis === 0 ? (
          <EmptyState
            icon="document-text-outline"
            titulo="Sem dados de rendimento"
            descricao={`Não encontramos rendimentos registrados para ${ano}. Conecte sua conta bancária ou adicione lançamentos.`}
          />
        ) : tab === 'simulacao' ? (
          <>
            {/* Resultado destaque */}
            <View style={styles.destaqueCard}>
              <Text style={styles.destaqueLabel}>Imposto estimado</Text>
              <Text style={styles.destaqueValor}>{formatBRL(irAnual)}</Text>
              <View style={styles.destaqueRow}>
                <View style={[styles.destaqueBadge, { backgroundColor: '#fee2e2' }]}>
                  <Text style={[styles.destaqueBadgeText, { color: theme.expense }]}>
                    Faixa {faixa.indice + 1} • {(faixa.aliquota * 100).toFixed(1)}%
                  </Text>
                </View>
                <Text style={styles.destaqueEfetiva}>
                  Alíquota efetiva: {aliquotaEfetiva.toFixed(1)}%
                </Text>
              </View>
            </View>

            {/* Gráfico */}
            {pieData.length > 0 && (
              <View style={styles.pieWrapper}>
                <VictoryPie
                  data={pieData}
                  x="x" y="y"
                  colorScale={pieData.map(d => d.color)}
                  innerRadius={55}
                  labelRadius={({ innerRadius }) => (Number(innerRadius) || 55) + 30}
                  style={{ labels: { fontSize: 10, fill: theme.textMuted } }}
                  width={SCREEN_WIDTH - 64}
                  height={200}
                  padding={40}
                />
              </View>
            )}

            {/* Tabela faixas */}
            <SectionCard titulo="Faixas IRPF">
              {FAIXAS_IR.map((f, i) => (
                <View key={i} style={[styles.faixaRow, i === faixa.indice && styles.faixaAtiva]}>
                  <Text style={styles.faixaLabel}>
                    {f.ate === Infinity ? `Acima de R$ ${FAIXAS_IR[i-1]?.ate.toLocaleString('pt-BR')}` : `Até R$ ${f.ate.toLocaleString('pt-BR')}`}
                  </Text>
                  <Text style={[styles.faixaAliq, i === faixa.indice && { color: theme.primary, fontWeight: '700' }]}>
                    {f.aliquota === 0 ? 'Isento' : `${(f.aliquota * 100).toFixed(1)}%`}
                  </Text>
                </View>
              ))}
            </SectionCard>
          </>
        ) : (
          <>
            {/* Resumo */}
            <SectionCard titulo="Rendimentos e deduções">
              <View style={styles.resumoContent}>
                <ResumoRow icon="arrow-up-circle" cor={theme.income}
                  label="Rendimentos tributáveis" valor={data.rendimentosTributaveis} />
                <ResumoRow icon="shield-checkmark" cor="#3b82f6"
                  label="Rendimentos isentos" valor={data.rendimentosIsentos} />
                <ResumoRow icon="remove-circle" cor="#8b5cf6"
                  label="Deduções" valor={data.deducoes} />
                <View style={styles.resumoDivider} />
                <ResumoRow icon="calculator" cor={theme.textPrimary}
                  label="Base de cálculo" valor={baseCalculo} destaque />
                <ResumoRow icon="cash" cor={theme.expense}
                  label="IR estimado anual" valor={irAnual} destaque />
                <ResumoRow icon="cash-outline" cor={theme.expense}
                  label="IR estimado mensal" valor={irMensal} />
              </View>
            </SectionCard>

            {data.bensTotal > 0 && (
              <SectionCard titulo="Bens e direitos">
                <View style={styles.resumoContent}>
                  <ResumoRow icon="briefcase" cor={theme.primary}
                    label="Total de bens declarados" valor={data.bensTotal} destaque />
                </View>
              </SectionCard>
            )}
          </>
        )}

        {/* Aviso */}
        <View style={styles.avisoCard}>
          <Ionicons name="warning-outline" size={16} color="#92400e" />
          <Text style={styles.avisoText}>
            Esta é uma simulação simplificada. Para declaração oficial, consulte um contador.
          </Text>
        </View>
      </ScrollView>
    </ScreenLayout>
  )
}

function ResumoRow({ icon, cor, label, valor, destaque }: {
  icon: string; cor: string; label: string; valor: number; destaque?: boolean
}) {
  return (
    <View style={[rr.row, destaque && rr.destaque]}>
      <View style={rr.left}>
        <Ionicons name={icon as any} size={16} color={cor} />
        <Text style={[rr.label, destaque && rr.labelDestaque]}>{label}</Text>
      </View>
      <Text style={[rr.valor, destaque && rr.valorDestaque, { color: cor }]}>
        {formatBRL(valor)}
      </Text>
    </View>
  )
}

const rr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  destaque: { paddingVertical: 12 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  label: { fontSize: 13, color: theme.textSecondary },
  labelDestaque: { fontWeight: '600', color: theme.textPrimary },
  valor: { fontSize: 13, fontWeight: '500' },
  valorDestaque: { fontSize: 15, fontWeight: '700' },
})

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

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface,
  },
  tabBtnAtivo: { borderColor: theme.primary, backgroundColor: '#f0fdf4' },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  tabTextAtivo: { color: theme.primary },

  destaqueCard: {
    backgroundColor: theme.surface, borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  destaqueLabel: { fontSize: 12, color: theme.textMuted },
  destaqueValor: { fontSize: 32, fontWeight: '700', color: theme.expense, marginTop: 4 },
  destaqueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  destaqueBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  destaqueBadgeText: { fontSize: 11, fontWeight: '700' },
  destaqueEfetiva: { fontSize: 11, color: theme.textMuted },

  pieWrapper: { alignItems: 'center', marginBottom: 8 },

  faixaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  faixaAtiva: { backgroundColor: '#f0fdf4' },
  faixaLabel: { fontSize: 13, color: theme.textSecondary },
  faixaAliq: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },

  resumoContent: { padding: 14 },
  resumoDivider: { height: 1, backgroundColor: theme.border, marginVertical: 4 },

  avisoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef3c7', borderRadius: 12, padding: 14, marginTop: 12,
  },
  avisoText: { fontSize: 11, color: '#92400e', flex: 1, lineHeight: 16 },
})
