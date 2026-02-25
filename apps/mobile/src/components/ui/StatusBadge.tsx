import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

interface Props {
  label: string
  cor: string
  bg: string
  icon?: IoniconsName
}

export function StatusBadge({ label, cor, bg, icon }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={11} color={cor} />}
      <Text style={[styles.texto, { color: cor }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  texto: { fontSize: 11, fontWeight: '600' },
})