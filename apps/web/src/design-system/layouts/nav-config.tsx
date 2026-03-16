import {
  Home,
  ArrowLeftRight,
  TrendingUp,
  Car,
  User,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";

/** Itens da bottom nav (mobile) e sidebar. Estrutura canônica: Início, Compromissos, Movimentações, Bens e Invest., Simuladores, Minha Conta. */
export const NAV_ITEMS: { path: string; label: string; icon: LucideIcon }[] = [
  { path: "/inicio", label: "Início", icon: Home },
  { path: "/compromissos", label: "Compromissos", icon: CalendarClock },
  { path: "/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
  { path: "/bens-investimentos", label: "Bens e Invest.", icon: TrendingUp },
  { path: "/simuladores", label: "Simuladores", icon: Car },
  { path: "/minha-conta", label: "Minha Conta", icon: User },
];

const TITLE_MAP: Record<string, string> = {
  "/inicio": "Início",
  "/compromissos": "Compromissos Fixos",
  "/movimentacoes": "Movimentações",
  "/movimentacoes/extrato": "Extrato de conta",
  "/movimentacoes/cartao-credito": "Cartão de Crédito",
  "/bens-investimentos": "Bens e Investimentos",
  "/bens-investimentos/consolidado": "Consolidado",
  "/bens-investimentos/patrimonio": "Patrimônio",
  "/bens-investimentos/investimentos": "Investimentos",
  "/bens-investimentos/credito": "Crédito",
  "/bens-investimentos/seguros": "Seguros",
  "/simuladores": "Simuladores",
  "/simuladores/veiculos/simulador-fipe": "Simulador FIPE",
  "/minha-conta": "Minha Conta",
};

export function getPageTitle(pathname: string): string {
  if (TITLE_MAP[pathname]) return TITLE_MAP[pathname];
  for (const [path, title] of Object.entries(TITLE_MAP)) {
    if (path !== "/inicio" && pathname.startsWith(path)) return title;
  }
  const item = NAV_ITEMS.find((i) => pathname === i.path || pathname.startsWith(i.path + "/"));
  return item ? item.label : "RXFin";
}

export function isNavActive(pathname: string, itemPath: string): boolean {
  if (itemPath === "/inicio") return pathname === "/inicio";
  if (itemPath === "/movimentacoes") return pathname === "/movimentacoes" || pathname.startsWith("/movimentacoes/");
  return pathname === itemPath || pathname.startsWith(itemPath + "/");
}
