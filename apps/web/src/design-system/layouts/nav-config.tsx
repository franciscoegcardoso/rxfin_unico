import {
  Home,
  ArrowLeftRight,
  TrendingUp,
  Car,
  User,
  type LucideIcon,
} from "lucide-react";
import { INVESTIMENTOS_ALOCACAO_PATH } from "@/constants/appPaths";

/** Itens da bottom nav (mobile) e sidebar. Compromissos integrado em /movimentacoes/extrato e /movimentacoes/cartao-credito. */
export const NAV_ITEMS: { path: string; label: string; icon: LucideIcon }[] = [
  { path: "/inicio", label: "Início", icon: Home },
  { path: "/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
  { path: "/bens-investimentos", label: "Bens e Invest.", icon: TrendingUp },
  { path: "/simuladores", label: "Simuladores", icon: Car },
  { path: "/minha-conta", label: "Minha Conta", icon: User },
];

const TITLE_MAP: Record<string, string> = {
  "/inicio": "Início",
  "/movimentacoes": "Movimentações",
  "/movimentacoes/extrato": "Extrato de conta",
  "/movimentacoes/cartao-credito": "Cartão de Crédito",
  "/passivos": "Passivos",
  "/passivos/dividas": "Dívidas",
  "/passivos/financiamentos": "Financiamentos",
  "/passivos/consorcios": "Consórcios",
  "/bens-investimentos": "Bens e Investimentos",
  "/bens-investimentos/consolidado": "Visão Geral",
  "/bens-investimentos/imoveis": "Meus Imóveis",
  "/bens-investimentos/veiculos": "Meus Veículos",
  "/bens-investimentos/investimentos": "Investimentos",
  "/bens-investimentos/fgts": "FGTS",
  "/bens-investimentos/credito": "Crédito",
  "/bens-investimentos/seguros": "Seguros",
  [INVESTIMENTOS_ALOCACAO_PATH]: "Alocação de Ativos",
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
  if (itemPath === "/passivos") return pathname === "/passivos" || pathname.startsWith("/passivos/");
  return pathname === itemPath || pathname.startsWith(itemPath + "/");
}
