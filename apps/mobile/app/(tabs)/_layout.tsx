import { Tabs } from 'expo-router';
import { View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { colors, fontSize } from '@/constants/tokens';

interface TabIconProps {
  focused: boolean;
  label: string;
  emoji: string;
}

function TabIcon({ focused, label, emoji }: TabIconProps) {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 10,
          fontFamily: focused ? 'Inter_600SemiBold' : 'Inter_400Regular',
          color: focused ? colors.brand.primary : theme.textMuted,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 56 + (Platform.OS === 'ios' ? insets.bottom : 0),
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: theme.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Início" emoji="🏠" />,
        }}
      />
      <Tabs.Screen
        name="lancamentos"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Lançamentos" emoji="💸" />,
        }}
      />
      <Tabs.Screen
        name="raio-x"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Raio-X" emoji="📊" />,
        }}
      />
      <Tabs.Screen
        name="planejamento"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Planejamento" emoji="🎯" />,
        }}
      />
      <Tabs.Screen
        name="mais"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Mais" emoji="⚙️" />,
        }}
      />
    </Tabs>
  );
}
