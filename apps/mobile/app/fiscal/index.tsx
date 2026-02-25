import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { SectionCard } from '@/components/ui/SectionCard'
import { theme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

interface FiscalConfig {
  regime_tributacao: 'simplificado' | 'completo'
  tem_dependentes: boolean
  num_dependentes: number
  deducao_saude_anual: number
  deducao_educacao_anual: number
  deducao_pensao_anual: number
  deducao_previdencia_anual: number
  estado: string
  profissao: string
}

const ESTADOS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

const DEFAULT_CONFIG: FiscalConfig = {
  regime_tributacao: 'simplificado',
  tem_dependentes: false,
  num_dependentes: 0,
  deducao_saude_anual: 0,
  deducao_educacao_anual: 0,
  deducao_pensao_anual: 0,
  deducao_previdencia_anual: 0,
  estado: 'SP',
  profissao: '',
}

export default function FiscalScreen() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<FiscalConfig>(DEFAULT_CONFIG)
  const [hasChanges, setHasChanges] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load from workspace fiscal_config
      const { data: ws } = await supabase
        .from('workspaces')
        .select('fiscal_config')
        .eq('owner_id', user.id)
        .single()

      if (ws?.fiscal_config && typeof ws.fiscal_config === 'object') {
        setConfig({ ...DEFAULT_CONFIG, ...(ws.fiscal_config as any) })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  function update(key: keyof FiscalConfig, value: any) {
    setConfig(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  async function salvar() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('workspaces')
        .update({ fiscal_config: config })
        .eq('owner_id', user.id)

      if (error) throw error
      setHasChanges(false)
      Alert.alert('Salvo', 'Configurações fiscais atualizadas.')
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  // Cálculo do desconto simplificado
  const descontoSimplificado = 16754.34 // Limite 2025
  const deducoesCompleto = config.deducao_saude_anual + config.deducao_educacao_anual +
    config.deducao_pensao_anual + config.deducao_previdencia_anual +
    (config.num_dependentes * 2275.08 * 12) // Dedução por dependente mensal * 12

  return (
    <ScreenLayout titulo="Configurações Fiscais">
      <ScrollView contentContainerStyle={styles.content}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcone}>
            <Ionicons name="receipt" size={28} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitulo}>Configurações Fiscais</Text>
            <Text style={styles.heroDesc}>
              Configure seu perfil tributário para simulações mais precisas do IR.
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        ) : (
          <>
            {/* Regime */}
            <SectionCard titulo="Regime de tributação">
              <View style={styles.regimeRow}>
                <TouchableOpacity
                  style={[styles.regimeBtn, config.regime_tributacao === 'simplificado' && styles.regimeBtnAtivo]}
                  onPress={() => update('regime_tributacao', 'simplificado')}
                >
                  <Ionicons name="flash" size={20}
                    color={config.regime_tributacao === 'simplificado' ? '#fff' : theme.textMuted} />
                  <Text style={[styles.regimeLabel, config.regime_tributacao === 'simplificado' && styles.regimeLabelAtivo]}>
                    Simplificado
                  </Text>
                  <Text style={[styles.regimeDesc, config.regime_tributacao === 'simplificado' && { color: '#ffffffbb' }]}>
                    20% desconto (até R$ {descontoSimplificado.toLocaleString('pt-BR')})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.regimeBtn, config.regime_tributacao === 'completo' && styles.regimeBtnAtivo]}
                  onPress={() => update('regime_tributacao', 'completo')}
                >
                  <Ionicons name="document-text" size={20}
                    color={config.regime_tributacao === 'completo' ? '#fff' : theme.textMuted} />
                  <Text style={[styles.regimeLabel, config.regime_tributacao === 'completo' && styles.regimeLabelAtivo]}>
                    Completo
                  </Text>
                  <Text style={[styles.regimeDesc, config.regime_tributacao === 'completo' && { color: '#ffffffbb' }]}>
                    Deduções reais detalhadas
                  </Text>
                </TouchableOpacity>
              </View>
            </SectionCard>

            {/* Dependentes */}
            <SectionCard titulo="Dependentes">
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Tenho dependentes</Text>
                  <Text style={styles.switchDesc}>Cônjuge, filhos, pais, etc.</Text>
                </View>
                <Switch
                  value={config.tem_dependentes}
                  onValueChange={(v) => { update('tem_dependentes', v); if (!v) update('num_dependentes', 0) }}
                  trackColor={{ true: theme.primary }}
                  thumbColor="#fff"
                />
              </View>
              {config.tem_dependentes && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Número de dependentes</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={String(config.num_dependentes)}
                    onChangeText={v => update('num_dependentes', parseInt(v) || 0)}
                    keyboardType="numeric" maxLength={2}
                  />
                </View>
              )}
            </SectionCard>

            {/* Deduções */}
            {config.regime_tributacao === 'completo' && (
              <SectionCard titulo="Deduções anuais estimadas">
                <View style={styles.deducoesForm}>
                  <DeducaoField label="Saúde" icon="medkit-outline"
                    value={config.deducao_saude_anual}
                    onChange={v => update('deducao_saude_anual', v)}
                    hint="Sem limite de dedução"
                  />
                  <DeducaoField label="Educação" icon="school-outline"
                    value={config.deducao_educacao_anual}
                    onChange={v => update('deducao_educacao_anual', v)}
                    hint="Limite R$ 3.561,50/pessoa"
                  />
                  <DeducaoField label="Pensão alimentícia" icon="people-outline"
                    value={config.deducao_pensao_anual}
                    onChange={v => update('deducao_pensao_anual', v)}
                    hint="Judicial ou acordo homologado"
                  />
                  <DeducaoField label="Previdência privada" icon="shield-checkmark-outline"
                    value={config.deducao_previdencia_anual}
                    onChange={v => update('deducao_previdencia_anual', v)}
                    hint="Limite 12% da renda bruta"
                  />

                  {deducoesCompleto > 0 && (
                    <View style={styles.totalDeducoes}>
                      <Text style={styles.totalLabel}>Total de deduções</Text>
                      <Text style={styles.totalValor}>
                        R$ {deducoesCompleto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Text>
                      {deducoesCompleto < descontoSimplificado && (
                        <Text style={styles.totalHint}>
                          ⚠️ Simplificado seria mais vantajoso (R$ {descontoSimplificado.toLocaleString('pt-BR')})
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </SectionCard>
            )}

            {/* Estado */}
            <SectionCard titulo="Localização">
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Estado</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.estadosScroll}>
                  <View style={styles.estadosRow}>
                    {ESTADOS.map(e => (
                      <TouchableOpacity
                        key={e}
                        style={[styles.estadoChip, config.estado === e && styles.estadoChipAtivo]}
                        onPress={() => update('estado', e)}
                      >
                        <Text style={[styles.estadoText, config.estado === e && styles.estadoTextAtivo]}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </SectionCard>

            {/* Botão salvar */}
            {hasChanges && (
              <TouchableOpacity
                style={[styles.salvarBtn, saving && { opacity: 0.6 }]}
                onPress={salvar} disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.salvarText}>Salvar configurações</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  )
}

function DeducaoField({ label, icon, value, onChange, hint }: {
  label: string; icon: string; value: number; onChange: (v: number) => void; hint: string
}) {
  return (
    <View style={df.container}>
      <View style={df.header}>
        <Ionicons name={icon as any} size={16} color={theme.primary} />
        <Text style={df.label}>{label}</Text>
      </View>
      <View style={df.inputRow}>
        <Text style={df.prefix}>R$</Text>
        <TextInput
          style={df.input}
          value={value > 0 ? String(value) : ''}
          onChangeText={v => onChange(parseFloat(v) || 0)}
          keyboardType="numeric" placeholder="0,00"
          placeholderTextColor={theme.textMuted}
        />
      </View>
      <Text style={df.hint}>{hint}</Text>
    </View>
  )
}

const df = StyleSheet.create({
  container: { marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.bg, borderRadius: 10, borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 12, height: 42,
  },
  prefix: { fontSize: 13, color: theme.textMuted, marginRight: 4 },
  input: { flex: 1, fontSize: 15, color: theme.textPrimary },
  hint: { fontSize: 10, color: theme.textMuted, marginTop: 4 },
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

  regimeRow: { flexDirection: 'row', gap: 10, padding: 14 },
  regimeBtn: {
    flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface,
  },
  regimeBtnAtivo: { backgroundColor: theme.primary, borderColor: theme.primary },
  regimeLabel: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  regimeLabelAtivo: { color: '#fff' },
  regimeDesc: { fontSize: 10, color: theme.textMuted, textAlign: 'center' },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  switchDesc: { fontSize: 11, color: theme.textMuted, marginTop: 2 },

  fieldRow: { paddingHorizontal: 14, paddingBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: theme.textPrimary, marginBottom: 6 },
  fieldInput: {
    backgroundColor: theme.bg, borderRadius: 10, borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: theme.textPrimary, width: 80,
  },

  deducoesForm: { padding: 14 },
  totalDeducoes: {
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, marginTop: 8, alignItems: 'center',
  },
  totalLabel: { fontSize: 11, color: theme.textMuted },
  totalValor: { fontSize: 18, fontWeight: '700', color: theme.primary, marginTop: 2 },
  totalHint: { fontSize: 10, color: '#92400e', marginTop: 6, textAlign: 'center' },

  estadosScroll: { marginTop: 4 },
  estadosRow: { flexDirection: 'row', gap: 6 },
  estadoChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface,
  },
  estadoChipAtivo: { backgroundColor: theme.primary, borderColor: theme.primary },
  estadoText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  estadoTextAtivo: { color: '#fff' },

  salvarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 16, marginTop: 16,
  },
  salvarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
