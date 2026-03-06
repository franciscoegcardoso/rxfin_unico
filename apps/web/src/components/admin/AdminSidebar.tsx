import { Link, useLocation } from 'react-router-dom';
import {
  Users,
  BarChart3,
  Megaphone,
  Brain,
  MessageSquareWarning,
  Kanban,
  Zap,
  ShieldCheck,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Crown,
  FileText,
  Mail,
  Scale,
  Bell,
  Rocket,
  RotateCcw,
  HeartPulse,
  Handshake,
  Eye,
  Target,
  Database,
  Server,
  KeyRound,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemedLogo } from '@/components/ui/themed-logo';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  // Principal
  { label: 'Painel', href: '/admin/dashboard', icon: LayoutDashboard, group: 'Principal' },
  { label: 'Estratégico', href: '/admin/estrategico', icon: Target, group: 'Principal' },
  { label: 'Usuários', href: '/admin/usuarios', icon: Users, group: 'Principal' },
  { label: 'Planos', href: '/admin/planos', icon: Crown, group: 'Principal' },

  // Negócio
  { label: 'CRM', href: '/admin/crm', icon: Kanban, group: 'Negócio' },
  { label: 'Automações', href: '/admin/crm/automations', icon: Zap, group: 'Negócio' },
  { label: 'Marketing', href: '/admin/marketing', icon: Megaphone, group: 'Negócio' },
  { label: 'E-mails', href: '/admin/emails', icon: Mail, group: 'Negócio' },
  { label: 'Notificações', href: '/admin/notificacoes', icon: Bell, group: 'Negócio' },
  { label: 'Afiliados', href: '/admin/afiliados', icon: Handshake, group: 'Negócio' },

  // Conteúdo
  { label: 'Páginas', href: '/admin/paginas', icon: FileText, group: 'Conteúdo' },
  { label: 'Termos', href: '/admin/termos', icon: Scale, group: 'Conteúdo' },

  // IA
  { label: 'Métricas IA', href: '/admin/ai-metrics', icon: Brain, group: 'IA' },
  { label: 'Feedback IA', href: '/admin/ai-feedback', icon: MessageSquareWarning, group: 'IA' },

  // Sistema
  { label: 'Impersonar', href: '/admin/impersonate', icon: Eye, group: 'Sistema' },
  { label: 'Deploy', href: '/admin/deploy', icon: Rocket, group: 'Sistema' },
  { label: 'Rollbacks', href: '/admin/rollbacks', icon: RotateCcw, group: 'Sistema' },
  { label: 'Health Check', href: '/admin/health', icon: HeartPulse, group: 'Sistema' },
  { label: 'Saúde do Banco', href: '/admin/database-health', icon: Database, group: 'Sistema' },
  { label: 'Arquitetura', href: '/admin/architecture', icon: Server, group: 'Sistema' },
  { label: 'API Keys', href: '/admin/api-keys', icon: KeyRound, group: 'Sistema' },
  { label: 'Roles & Acesso', href: '/admin/roles', icon: UserCog, group: 'Sistema' },
  { label: 'Auditoria', href: '/admin/audit', icon: ShieldCheck, group: 'Sistema' },
];

export function AdminSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') {
      return location.pathname === '/admin' && !location.search;
    }
    if (href.includes('?tab=')) {
      const tabMatch = href.match(/\?tab=(\w+)/);
      if (tabMatch) {
        return location.pathname === '/admin' && location.search.includes(`tab=${tabMatch[1]}`);
      }
    }
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  // Group items
  const groups = NAV_ITEMS.reduce<Record<string, NavItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <aside
      className={cn(
        'h-full bg-card border-r border-border flex flex-col transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo + collapse */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <ThemedLogo className="h-7 w-7 object-contain" />
            <span className="text-sm font-semibold text-foreground">Admin</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
                {group}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(item.href);
                const linkContent = (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                      collapsed && 'justify-center px-0'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-border">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar ao App
          </Link>
        </div>
      )}
    </aside>
  );
}
