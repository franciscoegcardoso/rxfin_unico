import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { theme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

interface Veiculo {
  id: string
  display_name: string
  brand_name: string
  model_name: string
  year_label: string | null
  fipe_code: string | null
  fipe_value: number | null
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

export default function VeiculosScreen() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('favorite_vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true })
      if (error) throw error
      setVeiculos(data ?? [])
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  return (
    <ScreenLayout titulo="Meus Veículos">
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcone}>
            <Ionicons name="car" size={28} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitulo}>Gestão de Veículos</Text>
            <Text style={styles.heroDesc}>
              Controle abastecimentos, manutenções e custos dos seus veículos.
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        ) : veiculos.length === 0 ? (
          <EmptyState
            icon="car-outline"
            titulo="Nenhum veículo cadastrado"
            descricao="Adicione seus veículos para controlar gastos, abastecimentos e manutenções."
          />
        ) : (
          <SectionCard titulo={`${veiculos.length} veículo${veiculos.length > 1 ? 's' : ''}`}>
            {veiculos.map((v, i) => (
              <TouchableOpacity
                key={v.id}
                style={[styles.item, i < veiculos.length - 1 && styles.itemBorder]}
                onPress={() => router.push(`/veiculos/${v.id}` as any)}
                activeOpacity={0.6}
              >
                <View style={styles.itemIcone}>
                  <Ionicons name="car-sport-outline" size={22} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemNome} numberOfLines={1}>{v.display_name}</Text>
                  <Text style={styles.itemSub}>
                    {v.year_label ?? ''}{v.fipe_code ? ` • ${v.fipe_code}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {v.fipe_value ? (
                    <Text style={styles.itemValor}>{formatBRL(v.fipe_value)}</Text>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </SectionCard>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/veiculos/novo' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 80 },
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
  heroTitulo: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginBottom: 3 },
  heroDesc: { fontSize: 12, color: theme.textMuted, lineHeight: 18 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  itemIcone: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center',
  },
  itemNome: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
  itemSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  itemValor: { fontSize: 14, fontWeight: '600', color: theme.income, marginBottom: 2 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
})
