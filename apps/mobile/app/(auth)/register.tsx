import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";

type Step = "form" | "otp";

export default function RegisterScreen() {
  const [step, setStep] = useState<Step>("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleRegister() {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();
    if (!trimmedName) { Alert.alert("Campo obrigatório", "Informe seu nome completo."); return; }
    if (!trimmedEmail) { Alert.alert("Campo obrigatório", "Informe seu e-mail."); return; }
    if (password.length < 6) { Alert.alert("Senha fraca", "A senha deve ter pelo menos 6 caracteres."); return; }
    if (password !== confirmPassword) { Alert.alert("Senhas diferentes", "As senhas não coincidem."); return; }

    setLoading(true);
    const { error } = await supabase.functions.invoke("send-verification-code", {
      body: { email: trimmedEmail, name: trimmedName },
    });
    setLoading(false);
    if (error) { Alert.alert("Erro", "Não foi possível enviar o código de verificação."); return; }
    setStep("otp");
  }

  async function handleVerifyOTP() {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();
    const code = otpCode.trim();
    if (code.length < 4) { Alert.alert("Código inválido", "Digite o código completo."); return; }

    setLoading(true);
    const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
      "verify-code-and-register",
      { body: { email: trimmedEmail, otp: code, password, full_name: trimmedName, platform: Platform.OS } }
    );

    if (verifyError || verifyData?.error) {
      setLoading(false);
      Alert.alert("Erro na verificação", verifyData?.error || verifyError?.message || "Código inválido ou expirado.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
    setLoading(false);
    if (signInError) {
      Alert.alert("Conta criada!", "Sua conta foi criada com sucesso. Faça login para continuar.", [
        { text: "OK", onPress: () => router.replace("/(auth)") },
      ]);
    }
  }

  async function handleResendOTP() {
    setLoading(true);
    const { error } = await supabase.functions.invoke("send-verification-code", {
      body: { email: email.trim().toLowerCase(), name: fullName.trim() },
    });
    setLoading(false);
    if (error) { Alert.alert("Erro", "Não foi possível reenviar o código."); }
    else { Alert.alert("Código reenviado", "Verifique sua caixa de entrada."); }
  }

  if (step === "otp") {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-neutral-50">
        <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled" className="px-8">
            <TouchableOpacity onPress={() => setStep("form")} className="mb-8" activeOpacity={0.7}>
              <Text className="text-blue-600 text-base font-medium">← Voltar</Text>
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-neutral-800 mb-2">Verificar e-mail</Text>
            <Text className="text-base text-neutral-500 mb-8">
              Digite o código de 6 dígitos enviado para{"\n"}
              <Text className="font-semibold text-neutral-700">{email.trim()}</Text>
            </Text>
            <TextInput
              className="bg-white border border-neutral-200 rounded-xl px-4 py-4 text-neutral-800 text-2xl text-center tracking-[8px] mb-6"
              placeholder="000000"
              placeholderTextColor="#a3a3a3"
              value={otpCode}
              onChangeText={(t) => setOtpCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
              autoFocus
            />
            <TouchableOpacity
              onPress={handleVerifyOTP}
              disabled={loading || otpCode.length < 4}
              className={`rounded-xl py-4 items-center ${loading || otpCode.length < 4 ? "bg-blue-400" : "bg-blue-600"}`}
              activeOpacity={0.8}
            >
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white font-semibold text-base">Verificar e criar conta</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleResendOTP} disabled={loading} className="mt-6 items-center" activeOpacity={0.7}>
              <Text className="text-blue-600 text-sm font-medium">Reenviar código</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-neutral-50">
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled" className="px-8">
          <TouchableOpacity onPress={() => router.back()} className="mb-8" activeOpacity={0.7}>
            <Text className="text-blue-600 text-base font-medium">← Voltar ao login</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-neutral-800 mb-2">Criar conta</Text>
          <Text className="text-base text-neutral-500 mb-8">Preencha seus dados para começar</Text>

          <Text className="text-sm font-medium text-neutral-700 mb-1.5">Nome completo</Text>
          <TextInput
            className="bg-white border border-neutral-200 rounded-xl px-4 py-3.5 text-neutral-800 text-base mb-4"
            placeholder="João Silva" placeholderTextColor="#a3a3a3" value={fullName} onChangeText={setFullName}
            autoCapitalize="words" autoComplete="name" editable={!loading} returnKeyType="next"
          />

          <Text className="text-sm font-medium text-neutral-700 mb-1.5">E-mail</Text>
          <TextInput
            className="bg-white border border-neutral-200 rounded-xl px-4 py-3.5 text-neutral-800 text-base mb-4"
            placeholder="seu@email.com" placeholderTextColor="#a3a3a3" value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!loading} returnKeyType="next"
          />

          <Text className="text-sm font-medium text-neutral-700 mb-1.5">Senha</Text>
          <View className="relative mb-4">
            <TextInput
              className="bg-white border border-neutral-200 rounded-xl px-4 py-3.5 text-neutral-800 text-base pr-16"
              placeholder="Mínimo 6 caracteres" placeholderTextColor="#a3a3a3" value={password} onChangeText={setPassword}
              secureTextEntry={!showPassword} autoCapitalize="none" editable={!loading} returnKeyType="next"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5" activeOpacity={0.7}>
              <Text className="text-blue-600 text-sm font-medium">{showPassword ? "Ocultar" : "Mostrar"}</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-sm font-medium text-neutral-700 mb-1.5">Confirmar senha</Text>
          <TextInput
            className="bg-white border border-neutral-200 rounded-xl px-4 py-3.5 text-neutral-800 text-base mb-6"
            placeholder="Repita a senha" placeholderTextColor="#a3a3a3" value={confirmPassword} onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword} autoCapitalize="none" editable={!loading} returnKeyType="done" onSubmitEditing={handleRegister}
          />

          <TouchableOpacity
            onPress={handleRegister} disabled={loading}
            className={`rounded-xl py-4 items-center ${loading ? "bg-blue-400" : "bg-blue-600"}`} activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white font-semibold text-base">Continuar</Text>}
          </TouchableOpacity>

          <Text className="text-xs text-neutral-400 text-center mt-4 leading-5">
            Ao criar sua conta, você concorda com os{"\n"}Termos de Uso e Política de Privacidade
          </Text>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
