import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontSize, spacing } from '@/constants/tokens';
import { useTheme } from '@/contexts/ThemeContext';

interface DividerProps {
  label?: string;
  color?: string;
  thickness?: number;
  marginVertical?: number;
}

export function Divider({
  label,
  color,
  thickness = StyleSheet.hairlineWidth,
  marginVertical = spacing[4],
}: DividerProps) {
  const { theme } = useTheme();
  const lineColor = color ?? theme.border;

  if (!label) {
    return (
      <View
        style={{
          height: thickness,
          backgroundColor: lineColor,
          marginVertical,
        }}
      />
    );
  }

  return (
    <View style={[styles.withLabel, { marginVertical }]}>
      <View style={[styles.line, { backgroundColor: lineColor, flex: 1 }]} />
      <Text style={[styles.labelText, { color: theme.textMuted }]}>{label}</Text>
      <View style={[styles.line, { backgroundColor: lineColor, flex: 1 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  withLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  line: {
    height: StyleSheet.hairlineWidth,
  },
  labelText: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});