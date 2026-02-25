import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../lib/theme'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

interface Props {
  icon?: IoniconsName
  titulo: string
  descricao?: string
  acaoLabel?: string
  onAcao?: () => void
}

export function EmptyState({ icon = 'cube-outline', titulo, descricao, acaoLabel, onAcao }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={36} color={theme.primary} />
      </View>
      <Text style={styles.titulo}>{titulo}</Text>
      {descricao && <Text style={styles.desc}>{descricao}</Text>}
      {acaoLabel && onAcao && (
        <TouchableOpacity style={styles.btn} onPress={onAcao} activeOpacity={0.8}>
          <Text style={styles.btnText}>{acaoLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 10 },
  iconBox: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: theme.surfaceHigh,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  titulo: { fontSize: 17, fontWeight: '600', color: theme.textPrimary, textAlign: 'center' },
  desc: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 20 },
  btn: {
    backgroundColor: theme.primary, paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 12, marginTop: 4,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
})