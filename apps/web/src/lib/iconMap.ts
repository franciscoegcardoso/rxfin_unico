import {
  Home,
  Wallet,
  FileSpreadsheet,
  Scale,
  ArrowLeftRight,
  Car,
  Shield,
  Receipt,
  FileText,
  CalendarRange,
  TrendingUp,
  Target,
  Package,
  ShoppingCart,
  Gift,
  LayoutDashboard,
  Star,
  CreditCard,
  Percent,
  Search,
  TrendingDown,
  GitCompare,
  Banknote,
  Clock,
  LineChart,
  Settings2,
  Settings,
  Building,
  Crown,
  Calculator,
  ShieldCheck,
  Users,
  Mail,
  Layers,
  BarChart3,
  Bell,
  FileQuestion,
  User,
  UserCog,
  PieChart,
  LucideIcon,
  // Additional icons from database
  LayoutGrid,
  LogIn,
  PiggyBank,
  Sliders,
  Rocket,
  Building2,
  Key,
  BarChart2,
  Calendar,
  UserPlus,
  HelpCircle,
  Circle,
  ClipboardList,
  HandCoins,
  Scissors,
} from 'lucide-react';

/**
 * Mapeamento de nomes de ícones (string do banco) para componentes Lucide
 * Usado para renderizar ícones dinamicamente baseado nos dados da tabela pages/page_groups
 * 
 * IMPORTANTE: Ao adicionar novas páginas no banco, certifique-se de adicionar
 * o ícone correspondente aqui também.
 */
export const ICON_MAP: Record<string, LucideIcon> = {
  // Páginas Principais
  Home,
  Wallet,
  FileSpreadsheet,
  Scale,
  
  // Lançamentos
  ArrowLeftRight,
  Car,
  Shield,
  Receipt,
  FileText,
  
  // Planejamento
  CalendarRange,
  TrendingUp,
  Target,
  Package,
  ShoppingCart,
  Gift,
  LayoutDashboard,
  Star,
  CreditCard,
  Calendar,
  
  // Simuladores
  Percent,
  Search,
  TrendingDown,
  GitCompare,
  Banknote,
  Clock,
  LineChart,
  Calculator,
  
  // Configurações
  Settings2,
  Settings,
  Building,
  Building2,
  Crown,
  User,
  UserCog,
  Sliders,
  
  // Controles & Simuladores extras
  ClipboardList,
  HandCoins,
  Scissors,
  
  // Admin
  ShieldCheck,
  Users,
  UserPlus,
  Mail,
  Layers,
  BarChart3,
  BarChart2,
  Bell,
  Key,
  PieChart,
  
  // Outros
  LayoutGrid,
  LogIn,
  PiggyBank,
  Rocket,
  
  // Fallback (incluído para referência)
  FileQuestion,
  HelpCircle,
  Circle,
};

// Tamanho e peso padrão para ícones de menu
export const ICON_DEFAULT_SIZE = 20;
export const ICON_DEFAULT_STROKE_WIDTH = 2;

/**
 * Retorna o componente de ícone baseado no nome (string)
 * @param iconName Nome do ícone como string (ex: "Home", "Car")
 * @returns Componente LucideIcon ou HelpCircle como fallback seguro
 */
export function getIconComponent(iconName: string | null | undefined): LucideIcon {
  if (!iconName) {
    return HelpCircle;
  }
  
  const icon = ICON_MAP[iconName];
  if (!icon) {
    console.warn(`[iconMap] Ícone "${iconName}" não encontrado no mapeamento. Usando fallback HelpCircle.`);
    return HelpCircle;
  }
  
  return icon;
}
