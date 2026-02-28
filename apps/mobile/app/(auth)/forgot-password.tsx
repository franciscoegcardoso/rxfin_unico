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

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResetPassword() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) { Alert.alert("Campo obrigatório", "Informe seu e-mail."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: "https://app.rxfin.com.br/reset-password",
    });
    setLoading(false);
    if (error) { Alert.alert("Erro", error.message); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} className="px-8">
          <View className="items-center">
            <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-6">
              <Text className="text-green-600 text-3xl">✓</Text>
            </View>
            <Text className="text-2xl font-bold text-neutral-800 mb-3 text-center">E-mail enviado!</Text>
            <Text className="text-base text-neutral-500 text-center mb-2 leading-6">Enviamos um link de recuperação para:</Text>
            <Text className="text-base font-semibold text-neutral-700 mb-8">{email.trim()}</Text>
            <Text className="text-sm text-neutral-400 text-center mb-8 leading-5">
              Verifique sua caixa de entrada e spam.{"\n"}O link expira em 24 horas.
            </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)")} className="bg-blue-600 rounded-xl py-4 items-center w-full" activeOpacity={0.8}>
              <Text className="text-white font-semibold text-base">Voltar ao login</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSent(false); handleResetPassword(); }} className="mt-4 items-center" activeOpacity={0.7}>
              <Text className="text-blue-600 text-sm font-medium">Reenviar e-mail</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-neutral-50">
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled" className="px-8">
          <TouchableOpacity onPress={() => router.back()} className="mb-8" activeOpacity={0.7}>
            <Text className="text-blue-600 text-base font-medium">← Voltar ao login</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-neutral-800 mb-2">Recuperar senha</Text>
          <Text className="text-base text-neutral-500 mb-8 leading-6">
            Digite seu e-mail e enviaremos um link{"\n"}para redefinir sua senha.
          </Text>
          <Text className="text-sm font-medium text-neutral-700 mb-1.5">E-mail</Text>
          <TextInput
            className="bg-white border border-neutral-200 rounded-xl px-4 py-3.5 text-neutral-800 text-base mb-6"
            placeholder="seu@email.com" placeholderTextColor="#a3a3a3" value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email"
            editable={!loading} autoFocus returnKeyType="done" onSubmitEditing={handleResetPassword}
          />
          <TouchableOpacity
            onPress={handleResetPassword} disabled={loading}
            className={`rounded-xl py-4 items-center ${loading ? "bg-blue-400" : "bg-blue-600"}`} activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white font-semibold text-base">Enviar link de recuperação</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
