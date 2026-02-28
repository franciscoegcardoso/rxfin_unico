import { Tabs } from "expo-router";
import { Text, View, Platform } from "react-native";
import { COLORS } from "../../lib/constants";

type TabIconProps = { label: string; emoji: string; focused: boolean };

function TabIcon({ label, emoji, focused }: TabIconProps) {
  return (
    <View className="items-center justify-center pt-1">
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text
        className={`text-[10px] mt-0.5 ${focused ? "font-semibold" : "font-normal"}`}
        style={{ color: focused ? COLORS.primary : COLORS.textMuted }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.borderLight,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Início" emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="lancamentos" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Lançamentos" emoji="💰" focused={focused} /> }} />
      <Tabs.Screen name="planejamento" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Planejamento" emoji="📊" focused={focused} /> }} />
      <Tabs.Screen name="raio-x" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Raio-X" emoji="🤖" focused={focused} /> }} />
      <Tabs.Screen name="mais" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Mais" emoji="☰" focused={focused} /> }} />
    </Tabs>
  );
}
