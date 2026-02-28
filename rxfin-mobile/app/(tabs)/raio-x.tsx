import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RaioXScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top"]}>
      <View className="flex-1 items-center justify-center px-8">
        <Text style={{ fontSize: 36, marginBottom: 12 }}>🤖</Text>
        <Text className="text-lg font-semibold text-neutral-700 mb-2">Raio-X (IA)</Text>
        <Text className="text-sm text-neutral-500 text-center">Chat com IA será construído na Semana 7.</Text>
      </View>
    </SafeAreaView>
  );
}
