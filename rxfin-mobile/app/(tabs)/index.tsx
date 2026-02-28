import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth-context";

export default function DashboardScreen() {
  const { profile, userPlan, signOut } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top"]}>
      <View className="px-5 pt-4">
        <Text className="text-sm text-neutral-500">Olá,</Text>
        <Text className="text-xl font-bold text-neutral-800">
          {profile?.full_name || "Usuário"} 👋
        </Text>
        <Text className="text-xs text-blue-600 mt-1">
          Plano: {userPlan?.plan_name || "Free"}
        </Text>
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-4">
          <Text style={{ fontSize: 36 }}>📱</Text>
        </View>
        <Text className="text-lg font-semibold text-neutral-700 mb-2">Dashboard em construção</Text>
        <Text className="text-sm text-neutral-500 text-center leading-5">
          O dashboard com saldos, resumo do mês{"\n"}e gráficos será construído na Semana 3.
        </Text>
      </View>
      <View className="px-5 pb-4">
        <TouchableOpacity onPress={signOut} className="border border-red-200 rounded-xl py-3 items-center" activeOpacity={0.7}>
          <Text className="text-red-500 font-medium text-sm">Sair da conta (dev)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
