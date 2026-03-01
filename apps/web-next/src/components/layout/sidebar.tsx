'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ArrowLeftRight,
  CreditCard,
  Receipt,
  TrendingUp,
  Car,
  Shield,
  Calendar,
  CalendarDays,
  Star,
  FileText,
  Calculator,
  AlertCircle,
  BarChart2,
  ShoppingBag,
  Gift,
  Users,
  Activity,
  User,
  Building2,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

const navGroups = [
  {
    label: 'Financeiro',
    items: [
      { href: '/inicio', label: 'Início', icon: Home },
      { href: '/lancamentos', label: 'Lançamentos', icon: ArrowLeftRight },
      { href: '/cartao-credito', label: 'Cartão de Crédito', icon: CreditCard },
      { href: '/financeiro', label: 'Planos e Pagamentos', icon: Receipt },
    ],
  },
  {
    label: 'Patrimônio',
    items: [
      { href: '/bens-investimentos', label: 'Bens e Investimentos', icon: TrendingUp },
      { href: '/gestao-veiculos', label: 'Veículos', icon: Car },
      { href: '/seguros', label: 'Seguros', icon: Shield },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { href: '/planejamento', label: 'Planejamento Mensal', icon: Calendar },
      { href: '/planejamento-anual', label: 'Planejamento Anual', icon: CalendarDays },
      { href: '/sonhos', label: 'Sonhos', icon: Star },
      { href: '/meu-ir', label: 'Meu IR', icon: FileText },
    ],
  },
  {
    label: 'Simuladores',
    items: [
      { href: '/simuladores', label: 'Hub de Simuladores', icon: Calculator },
      { href: '/renegociacao-dividas', label: 'SOS Dívidas', icon: AlertCircle },
      { href: '/econograph', label: 'EconoGraph', icon: BarChart2 },
    ],
  },
  {
    label: 'Mais',
    items: [
      { href: '/registro-compras', label: 'Registro de Compras', icon: ShoppingBag },
      { href: '/presentes', label: 'Presentes', icon: Gift },
      { href: '/rx-split', label: 'RX Split', icon: Users },
      { href: '/dados-financeiros', label: 'Tendências', icon: Activity },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { href: '/minha-conta', label: 'Minha Conta', icon: User },
      { href: '/instituicoes-financeiras', label: 'Instituições', icon: Building2 },
      { href: '/parametros', label: 'Parâmetros', icon: Settings },
      { href: '/configuracoes-hub', label: 'Configurações', icon: SlidersHorizontal },
    ],
  },
];

function SidebarContent() {
  const pathname = usePathname();

  return (
    <ScrollArea className="h-full">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link href="/inicio" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
          <span className="text-lg">RXFin</span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.label}
            </p>
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <SidebarContent />
      </aside>
      {/* Mobile: Sheet (controlled by layout/header) */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
