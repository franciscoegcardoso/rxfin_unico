import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { theme } from '../lib/theme'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

interface Props {
  titulo: string
  descricao?: string
  icon?: IoniconsName
}

export function ComingSoon({ titulo, descricao, icon = 'construct-outline' }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitulo}>{titulo}</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={styles.center}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={36} color={theme.primary} />
        </View>
        <Text style={styles.titulo}>{titulo}</Text>
        <View style={styles.badge}>
          <Ionicons name="rocket-outline" size={12} color="#92400e" />
          <Text style={styles.badgeText}>Em breve</Text>
        </View>
        <Text style={styles.desc}>
          {descricao ?? 'Esta funcionalidade está disponível na versão web e será lançada no app em breve.'}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  backBtn: { padding: 6, borderRadius: 20, backgroundColor: theme.bg },
  navTitulo: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  iconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.surfaceHigh,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  titulo: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary, textAlign: 'center' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: '#fde68a',
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  desc: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22, marginTop: 4 },
  btn: {
    backgroundColor: theme.primary, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 14, marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
})