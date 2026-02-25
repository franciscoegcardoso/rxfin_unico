import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../lib/theme'

interface Props {
  titulo: string
  children: React.ReactNode
  direita?: React.ReactNode
  semBack?: boolean
}

export function ScreenLayout({ titulo, children, direita, semBack }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />
      <View style={styles.navbar}>
        {semBack ? (
          <View style={{ width: 36 }} />
        ) : (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={styles.titulo} numberOfLines={1}>{titulo}</Text>
        {direita ?? <View style={{ width: 36 }} />}
      </View>
      {children}
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
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' },
  titulo: { flex: 1, fontSize: 17, fontWeight: '600', color: theme.textPrimary, textAlign: 'center', marginHorizontal: 8 },
})