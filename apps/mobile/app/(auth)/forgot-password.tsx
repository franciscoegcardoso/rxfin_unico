import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, fontSize, colors } from '@/constants/tokens';

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleReset() {
    if (!email.trim()) {
      setError('E-mail obrigatório');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: 'rxfin://reset-password',
    });
    setLoading(false);
    if (err) {
      Alert.alert('Erro', err.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <SafeAreaView edges={['top', 'bottom']}>
        <ScreenHeader title="Recuperar senha" showBack />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing[6],
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.status.success + '20',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing[6],
            }}
          >
            <Text style={{ fontSize: 32 }}>✉️</Text>
          </View>
          <Text
            style={{
              fontSize: fontSize.xl,
              fontFamily: 'Inter_700Bold',
              color: theme.textPrimary,
              textAlign: 'center',
              marginBottom: spacing[3],
            }}
          >
            E-mail enviado!
          </Text>
          <Text
            style={{
              fontSize: fontSize.base,
              color: theme.textSecondary,
              textAlign: 'center',
              lineHeight: 24,
              marginBottom: spacing[8],
            }}
          >
            Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
          </Text>
          <Button variant="outline" size="lg" fullWidth onPress={() => router.replace('/(auth)')}>
            Voltar para o login
          </Button>
        </View>
      </SafeAreaView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <View style={{ flex: 1 }}>
        <SafeAreaView edges={['top', 'bottom']}>
          <ScreenHeader title="Recuperar senha" showBack />
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: spacing[6], paddingTop: spacing[6] }}
            keyboardShouldPersistTaps="handled"
          >
            <Text
              style={{
                fontSize: fontSize.base,
                color: theme.textSecondary,
                marginBottom: spacing[8],
                lineHeight: 24,
              }}
            >
              Digite seu e-mail e enviaremos um link para redefinir sua senha.
            </Text>
            <Input
              label="E-mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError(undefined);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={error}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleReset}
            />
            <View style={{ marginTop: spacing[8] }}>
              <Button variant="primary" size="lg" fullWidth loading={loading} onPress={handleReset}>
                Enviar link de recuperação
              </Button>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}
