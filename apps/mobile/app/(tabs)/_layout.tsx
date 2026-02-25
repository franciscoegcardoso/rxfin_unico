import { useState } from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Pressable,
} from 'react-native'
import { theme } from '@/lib/theme'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function TabIcon({ name, color, size = 22 }: { name: IoniconsName; color: string; size?: number }) {
  return <Ionicons name={name} size={size} color={color} />
}

function QuickActionsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const acoes = [
    {
      icon: 'trending-down' as IoniconsName,
      label: 'Lançar Despesa',
      desc: 'Registrar saída de dinheiro',
      cor: theme.expense,
      bg: '#fee2e2',
    },
    {
      icon: 'trending-up' as IoniconsName,
      label: 'Lançar Receita',
      desc: 'Registrar entrada de dinheiro',
      cor: theme.income,
      bg: '#dcfce7',
    },
    {
      icon: 'car-outline' as IoniconsName,
      label: 'Despesa Veículo',
      desc: 'Combustível, manutenção etc.',
      cor: theme.textSecondary,
      bg: theme.surfaceHigh,
    },
  ]

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose} />
      <View style={sheet.container}>
        <View style={sheet.handle} />
        <View style={sheet.header}>
          <Text style={sheet.titulo}>Ação Rápida</Text>
          <TouchableOpacity onPress={onClose} style={sheet.closeBtn}>
            <Ionicons name="close" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={sheet.grid}>
          {acoes.map((a, i) => (
            <TouchableOpacity
              key={i}
              style={[sheet.acaoCard, { borderColor: a.bg, backgroundColor: a.bg }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <View style={[sheet.acaoIcone, { backgroundColor: `${a.cor}22` }]}>
                <Ionicons name={a.icon} size={22} color={a.cor} />
              </View>
              <Text style={[sheet.acaoLabel, { color: a.cor }]}>{a.label}</Text>
              <Text style={sheet.acaoDesc}>{a.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  )
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const [fabOpen, setFabOpen] = useState(false)

  const tabs = [
    { name: 'index', label: 'Início', icon: 'home' as IoniconsName },
    { name: 'lancamentos', label: 'Lançamentos', icon: 'list' as IoniconsName },
    { name: 'ativos', label: 'Patrimônio', icon: 'trending-up' as IoniconsName },
    { name: 'mais', label: 'Mais', icon: 'menu' as IoniconsName },
  ]

  return (
    <>
      <QuickActionsSheet visible={fabOpen} onClose={() => setFabOpen(false)} />
      <View style={bar.container}>
        {tabs.slice(0, 2).map(tab => {
          const route = state.routes.find((r: any) => r.name === tab.name)
          const isFocused = route && state.index === state.routes.indexOf(route)
          return (
            <TouchableOpacity
              key={tab.name}
              style={bar.tabBtn}
              onPress={() => { if (route) navigation.navigate(tab.name) }}
              activeOpacity={0.7}
            >
              <Ionicons name={tab.icon} size={22} color={isFocused ? theme.tabActive : theme.tabInactive} />
              <Text style={[bar.tabLabel, { color: isFocused ? theme.tabActive : theme.tabInactive }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}

        {/* FAB central */}
        <View style={bar.fabWrapper}>
          <TouchableOpacity style={bar.fab} onPress={() => setFabOpen(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {tabs.slice(2).map(tab => {
          const route = state.routes.find((r: any) => r.name === tab.name)
          const isFocused = route && state.index === state.routes.indexOf(route)
          return (
            <TouchableOpacity
              key={tab.name}
              style={bar.tabBtn}
              onPress={() => { if (route) navigation.navigate(tab.name) }}
              activeOpacity={0.7}
            >
              <Ionicons name={tab.icon} size={22} color={isFocused ? theme.tabActive : theme.tabInactive} />
              <Text style={[bar.tabLabel, { color: isFocused ? theme.tabActive : theme.tabInactive }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="lancamentos" />
      <Tabs.Screen name="ativos" />
      <Tabs.Screen name="mais" />
      <Tabs.Screen name="orcamento" options={{ href: null }} />
      <Tabs.Screen name="perfil" options={{ href: null }} />
      <Tabs.Screen name="cartoes" options={{ href: null }} />
      <Tabs.Screen name="contas" options={{ href: null }} />
    </Tabs>
  )
}

const bar = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    height: 64,
    paddingBottom: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  fabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
})

const sheet = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: theme.border,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  titulo: {
    fontSize: 16, fontWeight: '600', color: theme.textPrimary,
  },
  closeBtn: {
    position: 'absolute', right: 0,
    padding: 4,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
  },
  acaoCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  acaoIcone: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  acaoLabel: {
    fontSize: 11, fontWeight: '700', textAlign: 'center',
  },
  acaoDesc: {
    fontSize: 9, color: theme.textMuted, textAlign: 'center', lineHeight: 13,
  },
})