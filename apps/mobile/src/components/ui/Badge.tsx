import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, fontSize, spacing } from '@/constants/tokens';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'brand';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: colors.dark.border, text: colors.textDark.secondary },
  success: { bg: colors.status.successBg, text: colors.status.successText },
  warning: { bg: colors.status.warningBg, text: colors.status.warningText },
  error: { bg: colors.status.errorBg, text: colors.status.errorText },
  info: { bg: colors.status.infoBg, text: colors.status.infoText },
  brand: { bg: colors.brand.primary + '20', text: colors.brand.primary },
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
}: BadgeProps) {
  const { bg, text } = variantStyles[variant];

  return (
    <View
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: bg },
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: text }]} />}
      <Text
        style={[
          styles.label,
          size === 'sm' ? styles.labelSm : styles.labelMd,
          { color: text },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  sm: { paddingHorizontal: spacing[2], paddingVertical: 3 },
  md: { paddingHorizontal: spacing[3], paddingVertical: 5 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing[1],
  },
  label: { fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3 },
  labelSm: { fontSize: 10 },
  labelMd: { fontSize: fontSize.xs },
});
