import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, fontSize } from '@/constants/tokens';

export default function PlanejamentoScreen() {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[8] }}>
        <Text style={{ fontSize: 36, marginBottom: 12 }}>📊</Text>
        <Text style={{ fontSize: fontSize.lg, fontFamily: 'Inter_600SemiBold', color: theme.textPrimary, marginBottom: spacing[2] }}>
          Planejamento
        </Text>
        <Text style={{ fontSize: fontSize.sm, color: theme.textSecondary, textAlign: 'center' }}>
          Planejamento mensal e anual será construído na Semana 5.
        </Text>
      </View>
      </SafeAreaView>
    </View>
  );
}
