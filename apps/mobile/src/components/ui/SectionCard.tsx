import { View, Text, StyleSheet } from 'react-native'
import { theme } from '../../lib/theme'

interface Props {
  titulo?: string
  children: React.ReactNode
  marginBottom?: number
}

export function SectionCard({ titulo, children, marginBottom = 16 }: Props) {
  return (
    <View style={{ marginBottom }}>
      {titulo && <Text style={styles.titulo}>{titulo.toUpperCase()}</Text>}
      <View style={styles.card}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  titulo: {
    fontSize: 11, fontWeight: '700', color: theme.textMuted,
    letterSpacing: 0.8, marginBottom: 8, marginLeft: 4,
  },
  card: {
    backgroundColor: theme.surface, borderRadius: 16,
    borderWidth: 1, borderColor: theme.border, overflow: 'hidden',
  },
})