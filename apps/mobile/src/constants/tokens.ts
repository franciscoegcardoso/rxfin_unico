/**
 * Design System v2 — RXFin Mobile
 * Tokens sincronizados com o web (CSS custom properties → JS objects)
 * Fonte: apps/web/src/styles/tokens.css (ou equivalente)
 */

export const colors = {
  // Brand
  brand: {
    primary: '#5C6BC0',
    primaryHover: '#4A5AB0',
    secondary: '#7E57C2',
    accent: '#26C6DA',
    accentHover: '#00B8D4',
  },

  // Dark mode surfaces (default)
  dark: {
    bg: '#0D1117',
    surface: '#1A1A2E',
    surfaceElevated: '#16213E',
    card: '#0F3460',
    cardHover: '#163A70',
    border: '#2D3748',
    borderSubtle: '#1E2A3A',
  },

  // Light mode surfaces
  light: {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    card: '#FFFFFF',
    cardHover: '#F8FAFC',
    border: '#E2E8F0',
    borderSubtle: '#F1F5F9',
  },

  // Text — dark mode
  textDark: {
    primary: '#F1F5F9',
    secondary: '#94A3B8',
    muted: '#64748B',
    disabled: '#475569',
    inverse: '#1E293B',
  },

  // Text — light mode
  textLight: {
    primary: '#1E293B',
    secondary: '#475569',
    muted: '#94A3B8',
    disabled: '#CBD5E1',
    inverse: '#F1F5F9',
  },

  // Semantic
  status: {
    success: '#22C55E',
    successBg: '#DCFCE7',
    successText: '#166534',
    warning: '#F59E0B',
    warningBg: '#FEF9C3',
    warningText: '#92400E',
    error: '#EF4444',
    errorBg: '#FEE2E2',
    errorText: '#991B1B',
    info: '#3B82F6',
    infoBg: '#DBEAFE',
    infoText: '#1E40AF',
  },

  // Finance-specific
  finance: {
    income: '#22C55E',
    expense: '#EF4444',
    investment: '#8B5CF6',
    neutral: '#94A3B8',
  },

  // Always
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const borderRadius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  brand: {
    shadowColor: '#5C6BC0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
} as const;
