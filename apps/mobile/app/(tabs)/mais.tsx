import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Divider } from '@/components/ui/Divider';
import { useAuth } from '../../lib/auth-context';
import { useTheme } from '@/contexts/ThemeContext';
import { colors, spacing, fontSize } from '@/constants/tokens';

interface MenuItem {
  label: string;
  subtitle: string;
  emoji: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function MaisScreen() {
  const { theme } = useTheme();
  const { profile, userPlan, signOut } = useAuth();

  async function handleSignOut() {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ]);
  }

  function comingSoon(feature: string) {
    Alert.alert('Em breve', `${feature} estará disponível em breve.`);
  }

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Finanças',
      items: [
        {
          label: 'Bens & Investimentos',
          subtitle: 'Patrimônio, imóveis, ações',
          emoji: '💎',
          onPress: () => comingSoon('Bens & Investimentos'),
          disabled: true,
        },
        {
          label: 'Meu IR',
          subtitle: 'Imposto de renda',
          emoji: '📄',
          onPress: () => comingSoon('Meu IR'),
          disabled: true,
        },
        {
          label: 'Simuladores',
          subtitle: 'FIPE, financiamento, comparativo',
          emoji: '🚗',
          onPress: () => comingSoon('Simuladores'),
          disabled: true,
        },
      ],
    },
    {
      title: 'Conexões',
      items: [
        {
          label: 'Instituições financeiras',
          subtitle: 'Bancos conectados via Open Finance',
          emoji: '🏦',
          onPress: () => comingSoon('Instituições financeiras'),
          disabled: true,
        },
      ],
    },
    {
      title: 'Conta',
      items: [
        {
          label: 'Planos',
          subtitle: `Plano atual: ${userPlan?.plan_name ?? 'Free'}`,
          emoji: '⭐',
          onPress: () => comingSoon('Planos'),
          disabled: true,
        },
        {
          label: 'Configurações',
          subtitle: 'Notificações, tema, segurança',
          emoji: '⚙️',
          onPress: () => comingSoon('Configurações'),
          disabled: true,
        },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Mais" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: spacing[12] }}
        >
          {/* Perfil */}
          <Card variant="default" padding="md">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
              <Avatar name={profile?.full_name ?? ''} size="lg" />
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: fontSize.base, fontFamily: 'Inter_600SemiBold',
                  color: theme.textPrimary,
                }}>
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

          {/* Seções de menu */}
          {menuSections.map((section) => (
            <View key={section.title}>
              <Text style={{
                fontSize: 11, color: theme.textMuted,
                fontFamily: 'Inter_600SemiBold',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                marginBottom: spacing[2],
                marginLeft: spacing[1],
              }}>
                {section.title}
              </Text>
              <Card variant="default" padding="none">
                {section.items.map((item, idx) => (
                  <View key={item.label}>
                    <Pressable
                      onPress={item.onPress}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: spacing[4],
                        paddingVertical: spacing[3],
                        opacity: pressed ? 0.7 : 1,
                        gap: spacing[3],
                      })}
                    >
                      <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: fontSize.base,
                          fontFamily: 'Inter_500Medium',
                          color: item.disabled ? theme.textMuted : theme.textPrimary,
                        }}>
                          {item.label}
                        </Text>
                        <Text style={{ fontSize: fontSize.xs, color: theme.textMuted, marginTop: 1 }}>
                          {item.subtitle}
                        </Text>
                      </View>
                      <Text style={{ fontSize: fontSize.lg, color: theme.textMuted }}>›</Text>
                    </Pressable>
                    {idx < section.items.length - 1 && (
                      <View style={{ height: 1, backgroundColor: theme.border, marginHorizontal: spacing[4] }} />
                    )}
                  </View>
                ))}
              </Card>
            </View>
          ))}

          <Divider />

          {/* Sair */}
          <Pressable onPress={handleSignOut}>
            <Card variant="default" padding="md">
              <Text style={{
                fontSize: fontSize.base,
                fontFamily: 'Inter_500Medium',
                color: colors.status.error,
                textAlign: 'center',
              }}>
                Sair da conta
              </Text>
            </Card>
          </Pressable>

          {/* Versão */}
          <Text style={{
            fontSize: fontSize.xs, color: theme.textMuted,
            textAlign: 'center', marginTop: spacing[2],
          }}>
            RXFin Mobile v1.0.0
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
