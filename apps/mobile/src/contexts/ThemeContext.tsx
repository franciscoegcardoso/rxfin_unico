import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { colors } from '@/constants/tokens';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  bg: string;
  surface: string;
  surfaceElevated: string;
  card: string;
  cardHover: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  textInverse: string;
}

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  theme: ThemeColors;
}

const darkTheme: ThemeColors = {
  ...colors.dark,
  textPrimary: colors.textDark.primary,
  textSecondary: colors.textDark.secondary,
  textMuted: colors.textDark.muted,
  textDisabled: colors.textDark.disabled,
  textInverse: colors.textDark.inverse,
};

const lightTheme: ThemeColors = {
  ...colors.light,
  textPrimary: colors.textLight.primary,
  textSecondary: colors.textLight.secondary,
  textMuted: colors.textLight.muted,
  textDisabled: colors.textLight.disabled,
  textInverse: colors.textLight.inverse,
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = 'rxfin_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Carregar preferência salva
  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    await SecureStore.setItemAsync(THEME_KEY, newMode);
  }, []);

  const resolvedDark =
    mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  const theme = resolvedDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ mode, isDark: resolvedDark, setMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return ctx;
}
