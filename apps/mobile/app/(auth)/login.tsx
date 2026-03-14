import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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
import { Divider } from '@/components/ui/Divider';
import { useTheme } from '@/contexts/ThemeContext';
import { colors, spacing, fontSize } from '@/constants/tokens';

export default function LoginScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'E-mail obrigatório';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'E-mail inválido';
    if (!password) e.password = 'Senha obrigatória';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignIn() {
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      const msg = error.message.includes('Invalid login credentials')
        ? 'E-mail ou senha incorretos.'
        : error.message;
      Alert.alert('Erro ao entrar', msg);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <View style={{ flex: 1 }}>
        <SafeAreaView edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginBottom: spacing[10] }}>
            <View
              style={{
                width: 72,
                height: 72,
                backgroundColor: colors.brand.primary,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing[4],
                shadowColor: colors.brand.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <Text style={{ color: colors.white, fontSize: 26, fontFamily: 'Inter_700Bold' }}>RX</Text>
            </View>
            <Text style={{ fontSize: fontSize['2xl'], fontFamily: 'Inter_700Bold', color: theme.textPrimary }}>
              Bem-vindo ao RXFin
            </Text>
            <Text style={{ fontSize: fontSize.base, color: theme.textSecondary, marginTop: spacing[1] }}>
              Entre na sua conta para continuar
            </Text>
          </View>

          <View style={{ gap: spacing[4] }}>
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
              autoCorrect={false}
              autoComplete="email"
              error={errors.email}
              editable={!loading}
              returnKeyType="next"
            />

            <Input
              label="Senha"
              placeholder="••••••••"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrors((e) => ({ ...e, password: undefined }));
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              error={errors.password}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
              rightIcon={
                <Text style={{ color: colors.brand.primary, fontSize: fontSize.sm, fontFamily: 'Inter_500Medium' }}>
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </Text>
              }
              onRightIconPress={() => setShowPassword((v) => !v)}
            />
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            disabled={loading}
            style={{ alignSelf: 'flex-end', marginTop: spacing[2], marginBottom: spacing[6] }}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.brand.primary, fontSize: fontSize.sm, fontFamily: 'Inter_500Medium' }}>
              Esqueci minha senha
            </Text>
          </TouchableOpacity>

          <Button variant="primary" size="lg" fullWidth loading={loading} onPress={handleSignIn}>
            Entrar
          </Button>

          <Divider label="ou" marginVertical={spacing[6]} />

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={loading}
            onPress={() => router.push('/(auth)/register')}
          >
            Criar uma conta
          </Button>

          <View style={{ height: spacing[8] }} />
        </ScrollView>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}
