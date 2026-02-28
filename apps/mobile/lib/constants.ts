// Brand colors matching web app
export const COLORS = {
  primary: "#1A56A0",
  primaryDark: "#0D2B50",
  primaryLight: "#E8F0FE",
  accent: "#2E8B57",
  accentLight: "#E8F5E9",
  warning: "#D4A017",
  warningLight: "#FFF3E0",
  error: "#C0392B",
  errorLight: "#FDECEA",
  background: "#FAFAFA",
  surface: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#666666",
  textMuted: "#A3A3A3",
  border: "#E5E5E5",
  borderLight: "#F0F0F0",
} as const;

export const PLAN_SLUGS = {
  SEM_CADASTRO: "sem_cadastro",
  FREE: "free",
  STARTER: "starter",
  PRO: "pro",
} as const;

export const FREE_ALLOWED_PAGES = [
  "inicio",
  "bens-investimentos",
  "meu-ir",
  "configuracoes",
  "parametros",
  "instituicoes-financeiras",
  "planos",
  "simuladores",
] as const;

export const STARTER_BLOCKED_PAGES = [
  "planejamento",
  "raio-x",
  "contas-pagar-receber",
] as const;
