import { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ScreenLayout } from '../../../src/components/ui/ScreenLayout'
import { SectionCard } from '../../../src/components/ui/SectionCard'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import { theme } from '../../../src/lib/theme'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseMoney(text: string): number {
  return parseFloat(text.replace(/\./g, '').replace(',', '.')) || 0
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

function formatPercent(v: number): string {
  return v.toFixed(2).replace('.', ',') + '%'
}

// ─── Input com label ─────────────────────────────────────────────────────────
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

// ─── Componente de resultado ──────────────────────────────────────────────────
interface ResultRowProps {
  label: string
  valor: string
  cor?: string
  destaque?: boolean
}

function ResultRow({ label, valor, cor, destaque }: ResultRowProps) {
  return (
    <View style={[res.row, destaque && res.rowDestaque]}>
      <Text style={[res.label, destaque && res.labelDestaque]}>{label}</Text>
      <Text style={[res.valor, cor ? { color: cor } : {}, destaque && res.valorDestaque]}>
        {valor}
      </Text>
    </View>
  )
}

// ─── Tela principal ──────────────────────────────────────────────────────────
export default function DescontoJustoScreen() {
  const [valorOriginal, setValorOriginal] = useState('')
  const [descontoOferecido, setDescontoOferecido] = useState('')
  const [taxaMensal, setTaxaMensal] = useState('')
  const [mesesAntecipacao, setMesesAntecipacao] = useState('')

  const resultado = useMemo(() => {
    const original = parseMoney(valorOriginal)
    const desconto = parseFloat(descontoOferecido.replace(',', '.')) || 0
    const taxa = parseFloat(taxaMensal.replace(',', '.')) || 0
    const meses = parseInt(mesesAntecipacao) || 0

    if (original <= 0 || taxa <= 0 || meses <= 0) return null

    const taxaDecimal = taxa / 100

    // Valor presente (quanto realmente vale pagar hoje, dado que o pagamento seria no futuro)
    const valorPresente = original / Math.pow(1 + taxaDecimal, meses)

    // Desconto justo = o quanto deveria valer a menos por pagar à vista
    const descontoJusto = ((original - valorPresente) / original) * 100

    // Valor com desconto oferecido
    const valorComDesconto = original * (1 - desconto / 100)

    // Diferença: positivo = bom negócio (desconto maior que o justo)
    const economia = valorPresente - valorComDesconto

    // Veredito
    let veredito: { texto: string; cor: string; icon: string; bg: string }
    if (desconto >= descontoJusto) {
      veredito = {
        texto: 'Bom negócio! O desconto oferecido é maior que o justo.',
        cor: '#16a34a', icon: 'checkmark-circle', bg: '#dcfce7',
      }
    } else if (desconto >= descontoJusto * 0.8) {
      veredito = {
        texto: 'Desconto aceitável, próximo do justo.',
        cor: '#d97706', icon: 'alert-circle', bg: '#fef3c7',
      }
    } else {
      veredito = {
        texto: 'Desconto insuficiente. Você merece mais!',
        cor: '#dc2626', icon: 'close-circle', bg: '#fee2e2',
      }
    }

    return {
      valorPresente,
      descontoJusto,
      valorComDesconto,
      economia,
      veredito,
    }
  }, [valorOriginal, descontoOferecido, taxaMensal, mesesAntecipacao])

  function limpar() {
    setValorOriginal('')
    setDescontoOferecido('')
    setTaxaMensal('')
    setMesesAntecipacao('')
  }

  const temInput = valorOriginal || descontoOferecido || taxaMensal || mesesAntecipacao

  return (
    <ScreenLayout titulo="Desconto Justo">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcone}>
            <Ionicons name="pricetag" size={28} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitulo}>Simulador de Desconto Justo</Text>
            <Text style={styles.heroDesc}>
              Descubra se o desconto oferecido compensa considerando o valor do dinheiro no tempo.
            </Text>
          </View>
        </View>

        {/* Inputs */}
        <SectionCard titulo="Dados da negociação">
          <View style={styles.form}>
            <InputField
              label="Valor original"
              value={valorOriginal}
              onChangeText={setValorOriginal}
              placeholder="10.000,00"
              prefix="R$"
              hint="Preço cheio sem desconto"
            />
            <InputField
              label="Desconto oferecido"
              value={descontoOferecido}
              onChangeText={setDescontoOferecido}
              placeholder="5"
              suffix="%"
              hint="Percentual de desconto que te ofertaram"
            />
            <InputField
              label="Taxa de juros mensal"
              value={taxaMensal}
              onChangeText={setTaxaMensal}
              placeholder="1,0"
              suffix="% a.m."
              hint="Quanto seu dinheiro rende por mês (ex: Selic ~1%)"
            />
            <InputField
              label="Meses de antecipação"
              value={mesesAntecipacao}
              onChangeText={setMesesAntecipacao}
              placeholder="12"
              suffix="meses"
              hint="Quantos meses antes do vencimento você pagaria"
            />
          </View>
        </SectionCard>

        {/* Botão limpar */}
        {temInput && (
          <TouchableOpacity style={styles.limparBtn} onPress={limpar}>
            <Ionicons name="refresh-outline" size={16} color={theme.textMuted} />
            <Text style={styles.limparText}>Limpar campos</Text>
          </TouchableOpacity>
        )}

        {/* Resultado */}
        {resultado && (
          <>
            {/* Veredito */}
            <View style={[styles.vereditoCard, { backgroundColor: resultado.veredito.bg }]}>
              <Ionicons
                name={resultado.veredito.icon as any}
                size={28}
                color={resultado.veredito.cor}
              />
              <Text style={[styles.vereditoTexto, { color: resultado.veredito.cor }]}>
                {resultado.veredito.texto}
              </Text>
            </View>

            {/* Detalhes */}
            <SectionCard titulo="Resultado da análise">
              <View style={res.container}>
                <ResultRow
                  label="Desconto justo"
                  valor={formatPercent(resultado.descontoJusto)}
                  destaque
                  cor={theme.primary}
                />
                <ResultRow
                  label="Desconto oferecido"
                  valor={formatPercent(parseFloat(descontoOferecido.replace(',', '.')) || 0)}
                  cor={
                    (parseFloat(descontoOferecido.replace(',', '.')) || 0) >= resultado.descontoJusto
                      ? theme.income
                      : theme.expense
                  }
                />
                <View style={res.divider} />
                <ResultRow
                  label="Valor presente (justo)"
                  valor={formatBRL(resultado.valorPresente)}
                />
                <ResultRow
                  label="Valor com desconto oferecido"
                  valor={formatBRL(resultado.valorComDesconto)}
                />
                <View style={res.divider} />
                <ResultRow
                  label={resultado.economia >= 0 ? 'Sua economia' : 'Prejuízo'}
                  valor={formatBRL(Math.abs(resultado.economia))}
                  cor={resultado.economia >= 0 ? theme.income : theme.expense}
                  destaque
                />
              </View>
            </SectionCard>

            {/* Explicação */}
            <SectionCard titulo="Como funciona">
              <View style={styles.explicacao}>
                <View style={styles.explicacaoItem}>
                  <Ionicons name="information-circle-outline" size={18} color={theme.textMuted} />
                  <Text style={styles.explicacaoTexto}>
                    O <Text style={{ fontWeight: '700' }}>desconto justo</Text> é calculado pelo valor 
                    presente do dinheiro. Se você pagaria R$ 10.000 daqui a 12 meses, com juros de 1% ao 
                    mês, o valor justo hoje é R$ {formatBRL(10000 / Math.pow(1.01, 12))}.
                  </Text>
                </View>
                <View style={styles.explicacaoItem}>
                  <Ionicons name="bulb-outline" size={18} color={theme.warning} />
                  <Text style={styles.explicacaoTexto}>
                    Se o desconto oferecido for <Text style={{ fontWeight: '700' }}>maior</Text> que o 
                    desconto justo, vale a pena antecipar. Caso contrário, mantenha seu dinheiro investido.
                  </Text>
                </View>
              </View>
            </SectionCard>
          </>
        )}

        {/* Empty state */}
        {!resultado && !temInput && (
          <EmptyState
            icon="pricetag-outline"
            titulo="Calcule o desconto justo"
            descricao="Preencha os dados acima para descobrir se o desconto oferecido realmente vale a pena."
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

  limparBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, marginBottom: 16,
  },
  limparText: { fontSize: 13, color: theme.textMuted },

  vereditoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 16, marginBottom: 16,
  },
  vereditoTexto: { fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 20 },

  explicacao: { padding: 16, gap: 14 },
  explicacaoItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  explicacaoTexto: { fontSize: 13, color: theme.textSecondary, lineHeight: 20, flex: 1 },
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

const res = StyleSheet.create({
  container: { padding: 16 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10,
  },
  rowDestaque: {
    backgroundColor: '#f0fdf4', marginHorizontal: -16, paddingHorizontal: 16,
    borderRadius: 8,
  },
  label: { fontSize: 13, color: theme.textSecondary },
  labelDestaque: { fontWeight: '600', color: theme.textPrimary },
  valor: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
  valorDestaque: { fontSize: 17, fontWeight: '700' },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 4 },
})
