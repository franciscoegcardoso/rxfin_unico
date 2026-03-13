import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { colors, borderRadius, spacing, shadows } from '@/constants/tokens';
import { useTheme } from '@/contexts/ThemeContext';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'brand';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Card({
  variant = 'default',
  padding = 'md',
  children,
  style,
  ...props
}: CardProps) {
  const { theme, isDark } = useTheme();

  const cardBg =
    variant === 'default'
      ? theme.card
      : variant === 'elevated'
        ? theme.surfaceElevated
        : variant === 'outlined'
          ? colors.transparent
          : isDark
            ? colors.dark.card
            : colors.light.card;

  const cardBorder =
    variant === 'default'
      ? { borderWidth: 1, borderColor: theme.border }
      : variant === 'elevated'
        ? {}
        : variant === 'outlined'
          ? { borderWidth: 1.5, borderColor: colors.brand.primary }
          : { borderWidth: 1, borderColor: colors.brand.primary + '40' };

  const cardShadow = variant === 'elevated' ? shadows.md : {};

  const paddingStyle =
    padding === 'none'
      ? {}
      : padding === 'sm'
        ? { padding: spacing[3] }
        : padding === 'md'
          ? { padding: spacing[4] }
          : { padding: spacing[6] };

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: cardBg },
        cardBorder,
        cardShadow,
        paddingStyle,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
  },
});
