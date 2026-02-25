import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { router } from 'expo-router'
import { theme } from '@/lib/theme'
import { Ionicons } from '@expo/vector-icons'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [senhaVisivel, setSenhaVisivel] = useState(false)

  async function handleLogin() {
    if (!email || !password) { setError('Preencha email e senha'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email ou senha incorretos')
    else router.replace('/(tabs)')
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Hero verde no topo */}
        <View style={styles.hero}>
          <Image source={require('../../assets/logo-icon.png')} style={styles.logoIcon} resizeMode="contain" />
          <Text style={styles.logoTitulo}>RXFin</Text>
          <Text style={styles.logoSub}>Suas finanças sob controle</Text>
        </View>

        {/* Card de login */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Entrar na sua conta</Text>
          <Text style={styles.cardSub}>Bem-vindo de volta 👋</Text>

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputBox}>
            <Ionicons name="mail-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor={theme.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Senha */}
          <Text style={styles.label}>Senha</Text>
          <View style={styles.inputBox}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!senhaVisivel}
            />
            <TouchableOpacity onPress={() => setSenhaVisivel(!senhaVisivel)} style={styles.inputIconRight}>
              <Ionicons name={senhaVisivel ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Erro */}
          {error !== '' && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.expense} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Botão entrar */}
          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Entrar</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>acesso seguro</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Badges segurança */}
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark-outline" size={14} color={theme.primary} />
              <Text style={styles.badgeText}>Criptografado</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="lock-closed-outline" size={14} color={theme.primary} />
              <Text style={styles.badgeText}>SSL Seguro</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="eye-off-outline" size={14} color={theme.primary} />
              <Text style={styles.badgeText}>Privado</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>RXFin © 2026 · Todos os direitos reservados</Text>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.primary,
  },
  scroll: {
    flexGrow: 1,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
    backgroundColor: theme.primary,
  },
  logoIcon: {
    width: 72,
    height: 72,
    tintColor: '#fff',
    marginBottom: 14,
  },
  logoTitulo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 6,
  },
  logoSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
  },

  // Card
  card: {
    flex: 1,
    backgroundColor: theme.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingTop: 32,
    minHeight: 500,
  },
  cardTitulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 14,
    color: theme.textMuted,
    marginBottom: 24,
  },

  // Inputs
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputIconRight: {
    padding: 4,
  },
  input: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 15,
    paddingVertical: 14,
  },

  // Erro
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: theme.expense,
    fontSize: 13,
    flex: 1,
  },

  // Botão
  btn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    padding: 17,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.border,
  },
  dividerText: {
    color: theme.textMuted,
    fontSize: 12,
  },

  // Badges
  badges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },

  footer: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 20,
    backgroundColor: theme.bg,
  },
})