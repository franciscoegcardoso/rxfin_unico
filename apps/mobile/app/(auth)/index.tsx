import React, { useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Divider } from '@/components/ui/Divider';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { colors, spacing } from '@/constants/tokens';

function Section({
  title,
  theme,
  children,
}: {
  title: string;
  theme: { textMuted: string };
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text
        style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 11,
          color: theme.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: spacing[3],
        }}
      >
        {title}
      </Text>
      <View style={{ gap: spacing[3] }}>{children}</View>
    </View>
  );
}

export default function DesignSystemShowcase() {
  const { theme, isDark, setMode } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
      <ScreenHeader
        title="Design System v2"
        subtitle="Fase 1 — Mobile"
        rightElement={
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setMode(isDark ? 'light' : 'dark')}
          >
            {isDark ? '☀️' : '🌙'}
          </Button>
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing[4], gap: spacing[6] }}
        showsVerticalScrollIndicator={false}
      >
        <Section title="Buttons" theme={theme}>
          <Button variant="primary">Entrar na conta</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="outline">Saiba mais</Button>
          <Button variant="ghost">Pular</Button>
          <Button variant="destructive">Excluir conta</Button>
          <Button variant="primary" loading>
            Carregando...
          </Button>
          <Button variant="primary" disabled>
            Desabilitado
          </Button>
        </Section>

        <Section title="Cards" theme={theme}>
          <Card variant="default" padding="md">
            <Text style={{ color: theme.textPrimary, fontFamily: 'Inter_500Medium' }}>
              Card padrão
            </Text>
            <Text
              style={{
                color: theme.textSecondary,
                marginTop: 4,
                fontFamily: 'Inter_400Regular',
                fontSize: 13,
              }}
            >
              Saldo disponível: R$ 12.450,00
            </Text>
          </Card>
          <Card variant="elevated" padding="md">
            <Text style={{ color: theme.textPrimary, fontFamily: 'Inter_500Medium' }}>
              Card elevado
            </Text>
          </Card>
          <Card variant="outlined" padding="md">
            <Text style={{ color: theme.textPrimary, fontFamily: 'Inter_500Medium' }}>
              Card outline (brand)
            </Text>
          </Card>
        </Section>

        <Section title="Inputs" theme={theme}>
          <Input
            label="Email"
            placeholder="seu@email.com"
            value={inputValue}
            onChangeText={setInputValue}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Senha"
            placeholder="••••••••"
            secureTextEntry
            error="Senha incorreta"
          />
          <Input
            label="Valor"
            placeholder="R$ 0,00"
            hint="Informe o valor do lançamento"
            keyboardType="numeric"
          />
        </Section>

        <Section title="Badges" theme={theme}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
            <Badge variant="default">Padrão</Badge>
            <Badge variant="success" dot>
              Pago
            </Badge>
            <Badge variant="warning" dot>
              Pendente
            </Badge>
            <Badge variant="error" dot>
              Vencido
            </Badge>
            <Badge variant="info">Novo</Badge>
            <Badge variant="brand">Pro</Badge>
          </View>
        </Section>

        <Section title="Avatars" theme={theme}>
          <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'flex-end' }}>
            <Avatar size="xs" name="Francisco Cardoso" />
            <Avatar size="sm" name="Francisco Cardoso" />
            <Avatar size="md" name="Francisco Cardoso" />
            <Avatar size="lg" name="Francisco Cardoso" />
            <Avatar size="xl" name="Francisco Cardoso" />
          </View>
        </Section>

        <Section title="Dividers" theme={theme}>
          <Divider />
          <Divider label="ou continue com" />
        </Section>

        <Section title="Empty State" theme={theme}>
          <Card variant="default" padding="none">
            <EmptyState
              title="Nenhuma transação"
              description="Suas transações aparecerão aqui quando você conectar seu banco."
              actionLabel="Conectar banco"
              onAction={() => {}}
            />
          </Card>
        </Section>

        <Card variant="outlined" padding="md">
          <Text
            style={{
              color: colors.brand.accent,
              fontFamily: 'Inter_700Bold',
              fontSize: 16,
              textAlign: 'center',
            }}
          >
            ✅ Fase 1 — Design System Mobile Completo
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontFamily: 'Inter_400Regular',
              fontSize: 13,
              textAlign: 'center',
              marginTop: 6,
            }}
          >
            Tokens • ThemeProvider • Inter Font • 8 componentes base
          </Text>
        </Card>

        <Button
          variant="outline"
          fullWidth
          onPress={() => router.push('/(auth)/login')}
        >
          Fazer login
        </Button>

        <View style={{ height: spacing[8] }} />
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}
