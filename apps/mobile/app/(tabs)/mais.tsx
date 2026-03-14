import { View, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Divider } from '@/components/ui/Divider';
import { useAuth } from '../../lib/auth-context';
import { useTheme } from '@/contexts/ThemeContext';
import { colors, spacing, fontSize } from '@/constants/tokens';

export default function MaisScreen() {
  const { theme } = useTheme();
  const { profile, userPlan, signOut } = useAuth();

  async function handleSignOut() {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
      <ScreenHeader title="Mais" />
      <View style={{ padding: spacing[4], gap: spacing[4] }}>
        <Card variant="default" padding="md">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
            <Avatar name={profile?.full_name ?? ''} size="lg" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.base, fontFamily: 'Inter_600SemiBold', color: theme.textPrimary }}>
                {profile?.full_name ?? 'Usuário'}
              </Text>
              <Text style={{ fontSize: fontSize.sm, color: theme.textSecondary }}>
                {profile?.email ?? ''}
              </Text>
            </View>
            {userPlan && (
              <Badge variant={userPlan.plan_slug === 'free' ? 'default' : 'brand'}>
                {userPlan.plan_name}
              </Badge>
            )}
          </View>
        </Card>

        <Divider />

        <Pressable onPress={handleSignOut}>
          <Card variant="default" padding="md">
            <Text
              style={{
                fontSize: fontSize.base,
                fontFamily: 'Inter_500Medium',
                color: colors.status.error,
                textAlign: 'center',
              }}
            >
              Sair da conta
            </Text>
          </Card>
        </Pressable>
      </View>
      </SafeAreaView>
    </View>
  );
}
