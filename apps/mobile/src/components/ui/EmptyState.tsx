import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Button } from './Button';
import { fontSize, spacing } from '@/constants/tokens';
import { useTheme } from '@/contexts/ThemeContext';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {icon && (
        <View style={[styles.iconWrap, { backgroundColor: theme.surfaceElevated }]}>
          {icon}
        </View>
      )}
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      {description && (
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          variant="outline"
          size="md"
          onPress={onAction}
          style={{ marginTop: spacing[6] } as ViewStyle}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[12],
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: fontSize.lg,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
  },
});