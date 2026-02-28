import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth-context";

export default function MaisScreen() {
  const { profile, userPlan, signOut } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top"]}>
      <View className="px-5 pt-4 mb-6">
        <Text className="text-xl font-bold text-neutral-800">Mais</Text>
      </View>
      <View className="px-5 gap-3">
        <View className="bg-white rounded-xl p-4 border border-neutral-100">
          <Text className="text-base font-semibold text-neutral-800">{profile?.full_name || "Usuário"}</Text>
          <Text className="text-sm text-neutral-500 mt-0.5">{profile?.email}</Text>
          <View className="bg-blue-50 self-start px-2.5 py-1 rounded-full mt-2">
            <Text className="text-xs font-medium text-blue-700">{userPlan?.plan_name || "Free"}</Text>
          </View>
        </View>
        {[
          { emoji: "⚙️", label: "Configurações", note: "Semana 10" },
          { emoji: "🏦", label: "Instituições Financeiras", note: "Semana 8" },
          { emoji: "🚗", label: "Simuladores FIPE", note: "Semana 11" },
          { emoji: "📄", label: "Meu IR", note: "Semana 12" },
          { emoji: "💎", label: "Planos", note: "Semana 6" },
        ].map((item) => (
          <TouchableOpacity key={item.label} className="bg-white rounded-xl p-4 border border-neutral-100 flex-row items-center" activeOpacity={0.7}>
            <Text style={{ fontSize: 20 }} className="mr-3">{item.emoji}</Text>
            <View className="flex-1">
              <Text className="text-base text-neutral-700">{item.label}</Text>
              <Text className="text-xs text-neutral-400">{item.note}</Text>
            </View>
            <Text className="text-neutral-300 text-lg">›</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={signOut} className="bg-white rounded-xl p-4 border border-red-100 items-center mt-4" activeOpacity={0.7}>
          <Text className="text-red-500 font-medium">Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
