import { useState } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Image, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { theme } from '../../src/lib/theme'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function Campo({
  label, value, onChangeText, placeholder, secureTextEntry = false,
  keyboardType = 'default', erro, icone, direita,
}: {
  label: string; value: string; onChangeText: (v: string) => void
  placeholder?: string; secureTextEntry?: boolean
  keyboardType?: 'default' | 'email-address' | 'phone-pad'; erro?: string
  icone: IoniconsName; direita?: React.ReactNode
}) {
  return (
    <View style={c.campoWrapper}>
      <Text style={c.campoLabel}>{label}</Text>
      <View style={[c.campoRow, !!erro && c.campoRowErro]}>
        <Ionicons name={icone} size={17} color={theme.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={c.campoInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {direita}
      </View>
      {erro ? <Text style={c.campoErro}>{erro}</Text> : null}
    </View>
  )
}

function CheckItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
        size={13}
        color={ok ? '#16a34a' : theme.textMuted}
      />
      <Text style={{ fontSize: 11, color: ok ? '#16a34a' : theme.textMuted }}>{text}</Text>
    </View>
  )
}

interface Erros {
  nome?: string; email?: string; senha?: string; confirmar?: string
}

export default function SignupScreen() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [erros, setErros] = useState<Erros>({})
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const senhaChecks = {
    length: senha.length >= 8,
    upper: /[A-Z]/.test(senha),
    lower: /[a-z]/.test(senha),
    number: /[0-9]/.test(senha),
  }
  const forca = Object.values(senhaChecks).filter(Boolean).length

  function validar() {
    const e: Erros = {}
    if (!nome.trim() || nome.trim().length < 3) e.nome = 'Nome deve ter no mínimo 3 caracteres'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'E-mail inválido'
    if (!senhaChecks.length || !senhaChecks.upper || !senhaChecks.lower || !senhaChecks.number)
      e.senha = 'A senha não atende todos os requisitos'
    if (senha !== confirmar) e.confirmar = 'As senhas não coincidem'
    setErros(e)
    return Object.keys(e).length === 0
  }

  async function handleSignup() {
    if (!validar()) return
    if (!aceitouTermos) {
      Alert.alert('Atenção', 'Aceite os Termos de Uso e Política de Privacidade para continuar.')
      return
    }

    setLoading(true)
    const { error, data } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { full_name: nome.trim() },
      },
    })

    if (error) {
      setLoading(false)
      if (error.message.includes('User already registered')) {
        Alert.alert('E-mail já cadastrado', 'Este e-mail já possui uma conta. Tente fazer login.')
      } else {
        Alert.alert('Erro', error.message)
      }
      return
    }

    // Atualizar perfil com telefone
    if (data?.user && telefone) {
      await supabase.from('profiles')
        .update({ phone: telefone })
        .eq('id', data.user.id)
    }

    // Registrar consentimento
    if (data?.user) {
      try {
        const { data: docs } = await supabase
          .from('legal_documents')
          .select('slug, version')
          .in('slug', ['termos-de-uso', 'politica-privacidade'])

        if (docs && docs.length > 0) {
          await supabase.from('user_consents').insert(
            docs.map(doc => ({
              user_id: data.user!.id,
              document_slug: doc.slug,
              document_version: doc.version,
            }))
          )
        }
      } catch (_) { /* silencioso */ }
    }

    setLoading(false)
    setSucesso(true)
  }

  // ─── Tela de sucesso ───
  if (sucesso) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <View style={s.sucessoIcone}>
          <Ionicons name="mail-outline" size={48} color={theme.primary} />
        </View>
        <Text style={s.sucessoTitulo}>Conta Criada!</Text>
        <Text style={s.sucessoDesc}>
          Verifique seu e-mail para ativar sua conta. Enviamos um link de confirmação para:
        </Text>
        <View style={s.emailBox}>
          <Text style={s.emailBoxText}>{email}</Text>
        </View>
        <Text style={s.sucessoHint}>Não recebeu? Verifique sua pasta de spam.</Text>
        <TouchableOpacity style={s.btnPrimario} onPress={() => router.replace('/(auth)/login')}>
          <Ionicons name="chevron-back" size={16} color="#fff" />
          <Text style={s.btnPrimarioText}>Voltar ao Login</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ─── Formulário de cadastro ───
  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={s.voltarBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={theme.primary} />
          <Text style={s.voltarText}>Voltar</Text>
        </TouchableOpacity>

        <View style={s.logoArea}>
          <Image source={require('../../assets/logo-icon.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.appNome}>RXFin</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitulo}>Criar Conta</Text>
          <Text style={s.cardDesc}>Preencha seus dados para começar</Text>

          <View style={{ marginTop: 20, gap: 2 }}>
            <Campo label="Nome Completo" value={nome}
              onChangeText={v => { setNome(v); setErros(p => ({ ...p, nome: undefined })) }}
              placeholder="Seu nome completo" icone="person-outline" erro={erros.nome} />

            <Campo label="E-mail" value={email}
              onChangeText={v => { setEmail(v); setErros(p => ({ ...p, email: undefined })) }}
              placeholder="seu@email.com" keyboardType="email-address" icone="mail-outline" erro={erros.email} />

            <Campo label="Telefone (opcional)" value={telefone}
              onChangeText={setTelefone}
              placeholder="+55 11 99999-9999" keyboardType="phone-pad" icone="call-outline" />

            <Campo label="Senha" value={senha}
              onChangeText={v => { setSenha(v); setErros(p => ({ ...p, senha: undefined })) }}
              placeholder="Crie uma senha forte" secureTextEntry={!mostrarSenha}
              icone="lock-closed-outline" erro={erros.senha}
              direita={
                <TouchableOpacity onPress={() => setMostrarSenha(p => !p)}>
                  <Ionicons name={mostrarSenha ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
                </TouchableOpacity>
              }
            />

            {/* Força da senha */}
            {senha.length > 0 && (
              <View style={s.forcaWrapper}>
                <View style={s.forcaBarras}>
                  {[1, 2, 3, 4].map(n => (
                    <View key={n} style={[
                      s.forcaBarra,
                      forca >= n && {
                        backgroundColor: forca <= 2 ? theme.expense : forca === 3 ? '#f59e0b' : '#16a34a',
                      },
                    ]} />
                  ))}
                </View>
                <View style={s.forcaChecks}>
                  <CheckItem ok={senhaChecks.length} text="8+ chars" />
                  <CheckItem ok={senhaChecks.upper} text="Maiúscula" />
                  <CheckItem ok={senhaChecks.lower} text="Minúscula" />
                  <CheckItem ok={senhaChecks.number} text="Número" />
                </View>
              </View>
            )}

            <Campo label="Confirmar Senha" value={confirmar}
              onChangeText={v => { setConfirmar(v); setErros(p => ({ ...p, confirmar: undefined })) }}
              placeholder="Repita sua senha" secureTextEntry={!mostrarConfirmar}
              icone="lock-closed-outline" erro={erros.confirmar}
              direita={
                <TouchableOpacity onPress={() => setMostrarConfirmar(p => !p)}>
                  <Ionicons name={mostrarConfirmar ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
                </TouchableOpacity>
              }
            />

            {confirmar && senha === confirmar && !erros.confirmar && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -8, marginBottom: 6 }}>
                <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                <Text style={{ fontSize: 11, color: '#16a34a' }}>Senhas coincidem</Text>
              </View>
            )}

            {/* Termos */}
            <TouchableOpacity
              style={s.termosRow}
              onPress={() => setAceitouTermos(p => !p)}
              activeOpacity={0.7}
            >
              <View style={[s.checkbox, aceitouTermos && s.checkboxAtivo]}>
                {aceitouTermos && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={s.termosText}>
                Li e aceito os{' '}
                <Text style={s.termosLink}>Termos de Uso</Text>
                {' '}e a{' '}
                <Text style={s.termosLink}>Política de Privacidade</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btnPrimario, (loading || !aceitouTermos) && { opacity: 0.5 }]}
              onPress={handleSignup}
              disabled={loading || !aceitouTermos}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.btnPrimarioText}>Criar Conta</Text>}
            </TouchableOpacity>
          </View>

          <View style={s.rodapeRow}>
            <Text style={s.rodapeText}>Já tem conta? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={s.rodapeLink}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { flexGrow: 1, padding: 24, paddingTop: 56, paddingBottom: 40 },

  voltarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20, alignSelf: 'flex-start' },
  voltarText: { fontSize: 14, color: theme.primary, fontWeight: '600' },

  logoArea: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 60, height: 60, marginBottom: 8 },
  appNome: { fontSize: 26, fontWeight: 'bold', color: theme.primary },

  card: { backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, padding: 24 },
  cardTitulo: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary, textAlign: 'center' },
  cardDesc: { fontSize: 13, color: theme.textMuted, textAlign: 'center', marginTop: 4 },

  btnPrimario: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, marginTop: 6 },
  btnPrimarioText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  forcaWrapper: { marginBottom: 14 },
  forcaBarras: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  forcaBarra: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.border },
  forcaChecks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  termosRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: theme.border, justifyContent: 'center', alignItems: 'center', marginTop: 1, backgroundColor: theme.surfaceHigh },
  checkboxAtivo: { backgroundColor: theme.primary, borderColor: theme.primary },
  termosText: { flex: 1, fontSize: 13, color: theme.textMuted, lineHeight: 18 },
  termosLink: { color: theme.primary, fontWeight: '600' },

  rodapeRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  rodapeText: { fontSize: 13, color: theme.textMuted },
  rodapeLink: { fontSize: 13, color: theme.primary, fontWeight: '700' },

  // Sucesso
  sucessoIcone: { width: 96, height: 96, borderRadius: 48, backgroundColor: theme.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  sucessoTitulo: { fontSize: 26, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 10 },
  sucessoDesc: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 14 },
  emailBox: { backgroundColor: theme.surfaceHigh, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  emailBoxText: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, textAlign: 'center' },
  sucessoHint: { fontSize: 12, color: theme.textMuted, fontStyle: 'italic', marginBottom: 24 },
})

const c = StyleSheet.create({
  campoWrapper: { marginBottom: 14 },
  campoLabel: { fontSize: 12, fontWeight: '600', color: theme.textMuted, marginBottom: 5 },
  campoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceHigh, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  campoRowErro: { borderColor: theme.expense },
  campoInput: { flex: 1, fontSize: 14, color: theme.textPrimary },
  campoErro: { fontSize: 11, color: theme.expense, marginTop: 4 },
})