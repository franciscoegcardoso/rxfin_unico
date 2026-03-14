// Reexporta tokens do Design System v2 como COLORS para compatibilidade
// Fonte única de verdade: src/constants/tokens.ts
import { colors } from '@/constants/tokens';

export const COLORS = {
  // Brand — DS v2
  primary: colors.brand.primary, // #5C6BC0
  primaryDark: colors.dark.card, // #0F3460
  primaryLight: colors.brand.primary + '20',
  accent: colors.brand.accent, // #26C6DA
  accentLight: colors.brand.accent + '20',

  // Status
  warning: colors.status.warning, // #F59E0B
  warningLight: colors.status.warningBg,
  error: colors.status.error, // #EF4444
  errorLight: colors.status.errorBg,
  success: colors.status.success, // #22C55E

  // Surfaces (dark mode padrão)
  background: colors.dark.bg, // #0D1117
  surface: colors.dark.surface, // #1A1A2E
  textPrimary: colors.textDark.primary, // #F1F5F9
  textSecondary: colors.textDark.secondary, // #94A3B8
  textMuted: colors.textDark.muted, // #64748B
  border: colors.dark.border, // #2D3748
  borderLight: colors.dark.borderSubtle, // #1E2A3A
} as const;

// Re-exportar constantes de plano (inalteradas)
export const PLAN_SLUGS = {
  SEM_CADASTRO: 'sem_cadastro',
  FREE: 'free',
  STARTER: 'starter',
  PRO: 'pro',
} as const;

export const FREE_ALLOWED_PAGES = [
  'inicio',
  'bens-investimentos',
  'meu-ir',
  'configuracoes',
  'parametros',
  'instituicoes-financeiras',
  'planos',
  'simuladores',
] as const;

export const STARTER_BLOCKED_PAGES = [
  'planejamento',
  'raio-x',
  'contas-pagar-receber',
] as const;
