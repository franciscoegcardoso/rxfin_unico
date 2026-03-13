import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { colors, borderRadius, fontSize, spacing } from '@/constants/tokens';
import { useTheme } from '@/contexts/ThemeContext';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = isFocused
    ? colors.brand.primary
    : error
      ? colors.status.error
      : theme.border;
  const borderWidth = isFocused ? 1.5 : 1;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      )}
      <View
        style={[
          styles.container,
          { backgroundColor: theme.surfaceElevated, borderColor, borderWidth },
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            { color: theme.textPrimary, fontFamily: 'Inter_400Regular' },
            leftIcon ? styles.inputWithLeft : null,
            rightIcon ? styles.inputWithRight : null,
          ]}
          placeholderTextColor={theme.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={colors.brand.primary}
          {...props}
        />
        {rightIcon && (
          <Pressable
            style={styles.iconRight}
            onPress={onRightIconPress}
            hitSlop={8}
          >
            {rightIcon}
          </Pressable>
        )}
      </View>
      {(error || hint) && (
        <Text
          style={[
            styles.helper,
            { color: error ? colors.status.error : theme.textMuted },
          ]}
        >
          {error || hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing[1] },
  label: {
    fontSize: fontSize.sm,
    fontFamily: 'Inter_500Medium',
    marginBottom: spacing[2],
    letterSpacing: 0.2,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    height: 52,
    paddingHorizontal: spacing[4],
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    height: '100%',
  },
  inputWithLeft: { marginLeft: spacing[2] },
  inputWithRight: { marginRight: spacing[2] },
  iconLeft: { marginRight: spacing[1] },
  iconRight: { marginLeft: spacing[1] },
  helper: {
    fontSize: fontSize.xs,
    fontFamily: 'Inter_400Regular',
    marginTop: spacing[1],
    marginLeft: spacing[1],
  },
});
