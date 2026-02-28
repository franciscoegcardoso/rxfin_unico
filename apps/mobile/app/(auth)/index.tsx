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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignIn() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      Alert.alert("Campos obrigatórios", "Preencha o e-mail e a senha.");
      return;
    }
    setLoading(true);
    console.log("[LOGIN] Tentando:", trimmedEmail);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    setLoading(false);
    console.log("[LOGIN] Resultado:", error ? error.message : "OK");
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        Alert.alert("Erro ao entrar", "E-mail ou senha incorretos.");
      } else {
        Alert.alert("Erro ao entrar", error.message);
      }
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <View style={{ width: 64, height: 64, backgroundColor: "#2563EB", borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold" }}>RX</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1A1A1A" }}>
              Bem-vindo ao RXFin
            </Text>
            <Text style={{ fontSize: 16, color: "#737373", marginTop: 4 }}>
              Entre na sua conta para continuar
            </Text>
          </View>

          <Text style={{ fontSize: 14, fontWeight: "500", color: "#404040", marginBottom: 6 }}>E-mail</Text>
          <TextInput
            style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E5E5", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: "#1A1A1A", marginBottom: 16 }}
            placeholder="seu@email.com"
            placeholderTextColor="#a3a3a3"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!loading}
            returnKeyType="next"
          />

          <Text style={{ fontSize: 14, fontWeight: "500", color: "#404040", marginBottom: 6 }}>Senha</Text>
          <View style={{ position: "relative", marginBottom: 8 }}>
            <TextInput
              style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E5E5", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: "#1A1A1A", paddingRight: 64 }}
              placeholder="••••••••"
              placeholderTextColor="#a3a3a3"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ position: "absolute", right: 16, top: 14 }}
              activeOpacity={0.7}
            >
              <Text style={{ color: "#2563EB", fontSize: 14, fontWeight: "500" }}>
                {showPassword ? "Ocultar" : "Mostrar"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/forgot-password")}
            disabled={loading}
            activeOpacity={0.7}
            style={{ alignSelf: "flex-end", marginBottom: 24 }}
          >
            <Text style={{ color: "#2563EB", fontSize: 14, fontWeight: "500" }}>Esqueci minha senha</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading}
            style={{ backgroundColor: loading ? "#93C5FD" : "#2563EB", borderRadius: 12, paddingVertical: 16, alignItems: "center", justifyContent: "center" }}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Entrar</Text>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 32 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: "#E5E5E5" }} />
            <Text style={{ marginHorizontal: 16, color: "#A3A3A3", fontSize: 14 }}>ou</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "#E5E5E5" }} />
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/register")}
            disabled={loading}
            style={{ borderWidth: 1, borderColor: "#E5E5E5", borderRadius: 12, paddingVertical: 16, alignItems: "center" }}
            activeOpacity={0.7}
          >
            <Text style={{ color: "#404040", fontWeight: "600", fontSize: 16 }}>Criar uma conta</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}