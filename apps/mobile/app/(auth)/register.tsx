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
import { colors, spacing, fontSize } from '@/constants/tokens';

export default function RegisterScreen() {
  const { theme } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Nome obrigatório';
    if (!email.trim()) e.email = 'E-mail obrigatório';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'E-mail inválido';
    if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (password !== confirmPassword) e.confirmPassword = 'Senhas não coincidem';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignUp() {
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Erro ao criar conta', error.message);
    } else {
      Alert.alert(
        'Conta criada!',
        'Verifique seu e-mail para confirmar o cadastro.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)') }]
      );
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <View style={{ flex: 1 }}>
        <SafeAreaView edges={['top', 'bottom']}>
        <ScreenHeader title="Criar conta" showBack />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing[6], paddingTop: spacing[6] }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              fontSize: fontSize.lg,
              fontFamily: 'Inter_600SemiBold',
              color: theme.textPrimary,
              marginBottom: spacing[1],
            }}
          >
            Crie sua conta gratuita
          </Text>
          <Text
            style={{
              fontSize: fontSize.base,
              color: theme.textSecondary,
              marginBottom: spacing[8],
            }}
          >
            Comece a organizar suas finanças hoje
          </Text>

          <View style={{ gap: spacing[4] }}>
            <Input
              label="Nome completo"
              placeholder="João Silva"
              value={fullName}
              onChangeText={(t) => {
                setFullName(t);
                setErrors((e) => ({ ...e, fullName: undefined }));
              }}
              autoCapitalize="words"
              autoComplete="name"
              error={errors.fullName}
              editable={!loading}
              returnKeyType="next"
            />
            <Input
              label="E-mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setErrors((e) => ({ ...e, email: undefined }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
              editable={!loading}
              returnKeyType="next"
            />
            <Input
              label="Senha"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrors((e) => ({ ...e, password: undefined }));
              }}
              secureTextEntry
              autoCapitalize="none"
              error={errors.password}
              editable={!loading}
              returnKeyType="next"
            />
            <Input
              label="Confirmar senha"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                setErrors((e) => ({ ...e, confirmPassword: undefined }));
              }}
              secureTextEntry
              autoCapitalize="none"
              error={errors.confirmPassword}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />
          </View>

          <View style={{ marginTop: spacing[8], gap: spacing[3] }}>
            <Button variant="primary" size="lg" fullWidth loading={loading} onPress={handleSignUp}>
              Criar conta
            </Button>
            <Button variant="ghost" size="md" fullWidth disabled={loading} onPress={() => router.back()}>
              Já tenho uma conta
            </Button>
          </View>

          <Text
            style={{
              fontSize: fontSize.xs,
              color: theme.textMuted,
              textAlign: 'center',
              marginTop: spacing[6],
              marginBottom: spacing[8],
              lineHeight: 18,
            }}
          >
            Ao criar sua conta você concorda com nossos{' '}
            <Text style={{ color: colors.brand.primary }}>Termos de Uso</Text> e{' '}
            <Text style={{ color: colors.brand.primary }}>Política de Privacidade</Text>
          </Text>
        </ScrollView>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}
