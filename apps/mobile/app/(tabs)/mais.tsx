import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

interface MenuItem {
  label: string
  icon: IoniconsName
  route?: string
  emBreve?: boolean
}

interface MenuSection {
  titulo: string
  icone: IoniconsName
  items: MenuItem[]
}

const secoes: MenuSection[] = [
  {
    titulo: 'Lançamentos',
    icone: 'swap-vertical-outline',
    items: [
      { label: 'Lançamentos', icon: 'list-outline', route: '/(tabs)/lancamentos' },
      { label: 'Fluxo Financeiro', icon: 'swap-vertical-outline', route: '/fluxo' },
      { label: 'Contas a Pagar/Receber', icon: 'calendar-outline', route: '/contas-pagar' },
      { label: 'Registro de Compras', icon: 'cart-outline', route: '/registro-compras' },
    ],
  },
  {
    titulo: 'Planejamento',
    icone: 'calendar-number-outline',
    items: [
      { label: 'Planejamento Mensal', icon: 'pie-chart-outline', route: '/(tabs)/orcamento' },
      { label: 'Planejamento Anual', icon: 'calendar-number-outline', route: '/planejamento-anual' },
      { label: 'Metas Mensais', icon: 'trophy-outline', route: '/metas' },
      { label: 'Cartão de Crédito', icon: 'card-outline', route: '/cartao' },
      { label: 'Sonhos', icon: 'star-outline', route: '/sonhos' },
    ],
  },
  {
    titulo: 'Patrimônio',
    icone: 'trending-up-outline',
    items: [
      { label: 'Bens e Investimentos', icon: 'trending-up-outline', route: '/(tabs)/ativos' },
      { label: 'Balanço Patrimonial', icon: 'bar-chart-outline', route: '/balanco' },
      { label: 'Meu IR', icon: 'document-text-outline', route: '/meu-ir' },
      { label: 'Gestão de Veículos', icon: 'car-outline', route: '/veiculos' },
      { label: 'Seguros', icon: 'shield-outline', route: '/seguros' },
    ],
  },
  {
    titulo: 'Simuladores',
    icone: 'calculator-outline',
    items: [
      { label: 'Tabela FIPE', icon: 'car-sport-outline', route: '/fipe' },
      { label: 'Financiamento', icon: 'home-outline', route: '/financiamento' },
      { label: 'Comparativo de Carros', icon: 'swap-horizontal-outline', route: '/comparativo' },
      { label: 'Custo por Hora', icon: 'time-outline', route: '/custo-hora' },
      { label: 'Custo de Oportunidade', icon: 'trending-up-outline', route: '/custo-oportunidade' },
      { label: 'Desconto Justo', icon: 'pricetag-outline', route: '/desconto-justo' },
    ],
  },
  {
    titulo: 'Configurações',
    icone: 'settings-outline',
    items: [
      { label: 'Meu Perfil', icon: 'person-outline', route: '/perfil' },
      { label: 'Parâmetros', icon: 'settings-outline', route: '/parametros' },
      { label: 'Instituições Financeiras', icon: 'business-outline', route: '/instituicoes' },
      { label: 'Configurações Fiscais', icon: 'receipt-outline', route: '/fiscal' },
      { label: 'Planos', icon: 'diamond-outline', route: '/planos' },
    ],
  },
]

export default function MaisScreen() {
  const [secaoAberta, setSecaoAberta] = useState<string | null>(null)

  async function handleLogout() {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  function toggleSecao(titulo: string) {
    setSecaoAberta(prev => prev === titulo ? null : titulo)
  }

  return (
    <View style={styles.container}>

      {/* Navbar */}
      <View style={styles.navbar}>
        <Image
          source={require('../../assets/logo-icon.png')}
          style={styles.navLogo}
          resizeMode="contain"
        />
        <Text style={styles.navTitulo}>Menu</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {secoes.map((secao) => {
          const aberta = secaoAberta === secao.titulo
          const temEmBreve = secao.items.some(i => i.emBreve)

          return (
            <View key={secao.titulo} style={styles.secaoWrapper}>

              {/* Header da seção — clicável para expandir/recolher */}
              <TouchableOpacity
                style={[styles.secaoHeader, aberta && styles.secaoHeaderAberta]}
                onPress={() => toggleSecao(secao.titulo)}
                activeOpacity={0.7}
              >
                <View style={styles.secaoHeaderLeft}>
                  <View style={styles.secaoIcone}>
                    <Ionicons name={secao.icone} size={16} color={theme.primary} />
                  </View>
                  <Text style={styles.secaoTitulo}>{secao.titulo}</Text>
                </View>
                <View style={styles.secaoHeaderRight}>
                  {temEmBreve && !aberta && (
                    <View style={styles.miniBreve}>
                      <Text style={styles.miniBreveText}>Em breve</Text>
                    </View>
                  )}
                  <Ionicons
                    name={aberta ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={theme.textMuted}
                  />
                </View>
              </TouchableOpacity>

              {/* Itens da seção */}
              {aberta && (
                <View style={styles.secaoItems}>
                  {secao.items.map((item, ii) => {
                    const ultimo = ii === secao.items.length - 1
                    const disponivel = !!item.route && !item.emBreve

                    return (
                      <TouchableOpacity
                        key={ii}
                        style={[
                          styles.item,
                          !ultimo && styles.itemBorder,
                          !disponivel && styles.itemDesabilitado,
                        ]}
                        onPress={() => {
                          if (item.route) router.push(item.route as any)
                        }}
                        disabled={!disponivel}
                        activeOpacity={0.6}
                      >
                        <View style={[
                          styles.itemIcone,
                          { backgroundColor: disponivel ? '#dcfce7' : theme.surfaceHigh },
                        ]}>
                          <Ionicons
                            name={item.icon}
                            size={16}
                            color={disponivel ? theme.primary : theme.textMuted}
                          />
                        </View>

                        <Text style={[
                          styles.itemLabel,
                          !disponivel && { color: theme.textMuted },
                        ]}>
                          {item.label}
                        </Text>

                        {item.emBreve ? (
                          <View style={styles.breveBadge}>
                            <Ionicons name="rocket-outline" size={9} color="#92400e" />
                            <Text style={styles.breveText}>Em breve</Text>
                          </View>
                        ) : (
                          <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                        )}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
            </View>
          )
        })}

        {/* Logout */}
        <View style={styles.secaoWrapper}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <View style={[styles.itemIcone, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="log-out-outline" size={16} color={theme.expense} />
            </View>
            <Text style={[styles.itemLabel, { color: theme.expense }]}>Encerrar sessão</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versao}>RXFin v1.1.0</Text>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },

  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  navLogo: { width: 26, height: 26 },
  navTitulo: { fontSize: 20, fontWeight: 'bold', color: theme.primary },

  content: { padding: 12, paddingBottom: 40 },

  secaoWrapper: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 8,
    overflow: 'hidden',
  },

  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  secaoHeaderAberta: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surfaceHigh,
  },
  secaoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  secaoIcone: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secaoTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  secaoHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniBreve: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  miniBreveText: {
    fontSize: 9,
    color: '#92400e',
    fontWeight: '600',
  },

  secaoItems: {},

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  itemDesabilitado: {
    opacity: 0.6,
  },
  itemIcone: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
    color: theme.textPrimary,
    fontWeight: '500',
  },

  breveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  breveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400e',
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },

  versao: {
    color: theme.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
})