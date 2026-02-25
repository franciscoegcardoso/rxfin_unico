import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { ScreenLayout } from '../../src/components/ui/ScreenLayout'
import { SectionCard } from '../../src/components/ui/SectionCard'
import { theme } from '../../src/lib/theme'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

interface Simulador {
  label: string
  desc: string
  icon: IoniconsName
  route?: string
  badge?: string
}

const simuladores: Simulador[] = [
  {
    label: 'Tabela FIPE',
    desc: 'Consulte o valor de mercado do seu veículo',
    icon: 'car-outline',
    route: '/simuladores/fipe',
  },
  {
    label: 'Financiamento',
    desc: 'Simule parcelas e juros de financiamentos',
    icon: 'home-outline',
    route: '/simuladores/financiamento',
  },
  {
    label: 'Desconto Justo',
    desc: 'Calcule o desconto ideal em uma compra',
    icon: 'pricetag-outline',
    route: '/simuladores/desconto-justo',
  },
  {
    label: 'Comparativo de Carros',
    desc: 'Compare dois veículos financeiramente',
    icon: 'swap-horizontal-outline',
    route: '/simuladores/comparativo',
  },
  {
    label: 'Custo por Hora',
    desc: 'Quanto vale seu tempo de trabalho?',
    icon: 'time-outline',
    route: '/simuladores/custo-hora',
  },
  {
    label: 'Custo de Oportunidade',
    desc: 'Quanto você deixa de ganhar com seu carro?',
    icon: 'trending-up-outline',
    route: '/simuladores/custo-oportunidade',
  },
]

export default function SimuladoresScreen() {
  return (
    <ScreenLayout titulo="Simuladores">
      <ScrollView contentContainerStyle={styles.content}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcone}>
            <Ionicons name="calculator" size={32} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitulo}>Simuladores Financeiros</Text>
            <Text style={styles.heroDesc}>Ferramentas para tomar melhores decisões com seu dinheiro</Text>
          </View>
        </View>

        <SectionCard titulo="Disponíveis">
          {simuladores.map((sim, i) => {
            const ultimo = i === simuladores.length - 1
            const disponivel = !!sim.route

            return (
              <TouchableOpacity
                key={i}
                style={[styles.item, !ultimo && styles.itemBorder]}
                onPress={() => { if (sim.route) router.push(sim.route as any) }}
                disabled={!disponivel}
                activeOpacity={disponivel ? 0.6 : 1}
              >
                <View style={[
                  styles.itemIcone,
                  { backgroundColor: disponivel ? '#dcfce7' : theme.surfaceHigh }
                ]}>
                  <Ionicons
                    name={sim.icon}
                    size={20}
                    color={disponivel ? theme.primary : theme.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemLabel, !disponivel && { color: theme.textMuted }]}>
                    {sim.label}
                  </Text>
                  <Text style={styles.itemDesc}>{sim.desc}</Text>
                </View>
                {sim.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{sim.badge}</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                )}
              </TouchableOpacity>
            )
          })}
        </SectionCard>

      </ScrollView>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
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
    width: 38, height: 38, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  itemLabel: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
  itemDesc: { fontSize: 12, color: theme.textMuted, marginTop: 1 },
  badge: {
    backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1, borderColor: '#fde68a',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#92400e' },
})