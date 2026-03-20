import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { detectEnvironment } from '@/lib/environment';
import { useNavMenuPages, NavMenuItem, NavMenuSection } from '@/hooks/useNavMenuPages';
import { LockedFeatureIndicator } from '@/components/subscription/LockedFeatureIndicator';
import { ImpersonationButton } from '@/components/admin/ImpersonationButton';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { showComingSoonToast } from '@/components/subscription/ComingSoonToast';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import logoRxfin from '@/assets/logo-rxfin-icon.png';
import logoRxfinWhite from '@/assets/logo-rxfin-white.png';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'rxfin-sidebar-collapsed';
const STORAGE_KEY_WIDTH = 'rxfin-sidebar-width';
const DEFAULT_SIDEBAR_WIDTH_PX = 280;
const MIN_SIDEBAR_WIDTH_PX = 200;
const MAX_SIDEBAR_WIDTH_PX = 420;
const COLLAPSED_WIDTH_PX = 56;

interface AppSidebarProps {
  className?: string;
  /** Quando true (tablet): sidebar sempre colapsada, sem toggle, não persiste em localStorage. */
  forceCollapsed?: boolean;
}

function getSidebarCollapsed(forceCollapsed?: boolean): boolean {
  if (forceCollapsed) return true;
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ className, forceCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const queryClient = useQueryClient();
  const { isAdmin } = useIsAdmin();
  const { mainItems, groupedSections } = useNavMenuPages();
  const { resolvedTheme } = useTheme();

  const [collapsed, setCollapsed] = useState<boolean>(() => getSidebarCollapsed(forceCollapsed));

  useEffect(() => {
    if (!forceCollapsed) setCollapsed(getSidebarCollapsed(false));
  }, [forceCollapsed]);

  const [sidebarWidthPx, setSidebarWidthPx] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_WIDTH);
      if (stored) {
        const n = Number(stored);
        if (!Number.isNaN(n)) return Math.min(MAX_SIDEBAR_WIDTH_PX, Math.max(MIN_SIDEBAR_WIDTH_PX, n));
      }
    } catch {}
    return DEFAULT_SIDEBAR_WIDTH_PX;
  });

  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ x: 0, w: 0 });

  useEffect(() => {
    if (forceCollapsed) return;
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)); } catch {}
  }, [collapsed, forceCollapsed]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_WIDTH, String(sidebarWidthPx)); } catch {}
  }, [sidebarWidthPx]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (collapsed) return;
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = { x: e.clientX, w: sidebarWidthPx };
  }, [collapsed, sidebarWidthPx]);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartRef.current.x;
      const next = Math.min(MAX_SIDEBAR_WIDTH_PX, Math.max(MIN_SIDEBAR_WIDTH_PX, resizeStartRef.current.w + delta));
      setSidebarWidthPx(next);
    };
    const onUp = () => setIsResizing(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set<string>());

  useEffect(() => {
    groupedSections.forEach((section) => {
      const hasActive = section.items.some((item) => {
        const path = toPath(item.path);
        return location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));
      });
      if (hasActive) {
        setOpenSections((prev) => new Set(prev).add(section.slug));
      }
    });
  }, [location.pathname, groupedSections]);

  const toggleSection = (slug: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const currentLogo = resolvedTheme === 'dark' ? logoRxfinWhite : logoRxfin;
  const env = detectEnvironment();
  const isStaging = env === 'staging';
  const isAdminActive = location.pathname.startsWith('/admin');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const toPath = (path: string): string =>
    path && path.startsWith('/') ? path : `/${path}`;

  /** Item está ativo por match exato ou por rota aninhada (ex: /planejamento ativo em /planejamento/visao-mensal) */
  const isPathActive = (path: string): boolean => {
    const p = toPath(path);
    return location.pathname === p || (p !== '/' && location.pathname.startsWith(p + '/'));
  };

  const handleItemClick = (item: NavMenuItem, e: React.MouseEvent, path: string) => {
    if (item.canAccessAsAdmin) return;
    if (item.isComingSoon || item.isLocked) {
      e.preventDefault();
      e.stopPropagation();
      showComingSoonToast({ featureName: item.label });
      return;
    }
    e.preventDefault();
    navigate(path);
  };

  const prefetchByPath = useCallback((path: string) => {
    if (!user?.id) return;
    const now = new Date();
    const monthRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (path.startsWith('/inicio')) {
      void queryClient.prefetchQuery({
        queryKey: ['home-dashboard', user.id, monthRef],
        queryFn: async () => {
          const { data, error } = await supabase.rpc('get_home_dashboard', { p_month: monthRef });
          if (error) throw error;
          return data;
        },
      });
      return;
    }

    if (path.startsWith('/bens-investimentos')) {
      void queryClient.prefetchQuery({
        queryKey: ['investments-list', user.id],
        queryFn: async () => {
          const { data, error } = await supabase.rpc('get_investments_list');
          if (error) throw error;
          return data ?? [];
        },
      });
      return;
    }

    if (path.startsWith('/movimentacoes')) {
      void queryClient.prefetchQuery({
        queryKey: ['consolidated-expenses', user.id, monthRef],
        queryFn: async () => {
          const { data, error } = await supabase.rpc('get_consolidated_expenses', {
            p_user_id: user.id,
            p_month_ref: monthRef,
          });
          if (error) throw error;
          return data;
        },
      });
    }
  }, [queryClient, user?.id]);

  /** Em seções com sub-itens, só destaca o item de path mais específico que bater com a URL (evita dois ativos em rotas aninhadas). */
  const isItemActive = (item: NavMenuItem, sectionItems?: NavMenuItem[]): boolean => {
    if (!isPathActive(item.path)) return false;
    if (!sectionItems || sectionItems.length <= 1) return true;
    const myPath = toPath(item.path);
    const hasStricterMatch = sectionItems.some(
      (other) => other.path !== item.path && isPathActive(other.path) && toPath(other.path).length > myPath.length
    );
    return !hasStricterMatch;
  };

  const renderItem = (item: NavMenuItem, indent = false, sectionItems?: NavMenuItem[]) => {
    const path = toPath(item.path);
    const isActive = isItemActive(item, sectionItems);
    const isVisuallyDisabled = item.isLocked || item.isComingSoon;
    const canNavigate = item.canAccessAsAdmin || !isVisuallyDisabled;
    // Primeiro nível: mais destaque (text-sm, font-medium, ícone 4). Segundo nível: mais discreto (text-xs, font-normal, ícone 3.5).
    const isSecondLevel = indent;

    const baseClass = cn(
      'group flex items-center rounded-md transition-all duration-150',
      isSecondLevel ? 'gap-2 px-3 py-1.5 min-h-[32px] text-xs font-normal' : 'gap-2.5 px-3 py-2 min-h-[36px] text-sm font-medium',
      indent && !isActive && 'ml-3 pl-3 border-l border-[hsl(var(--color-border))]',
      indent && isActive  && 'ml-3 pl-3 border-l-2 border-primary',
      isActive
        ? 'bg-accent text-accent-foreground'
        : 'text-[hsl(var(--color-text-tertiary))] hover:bg-accent/60 hover:text-foreground',
      isVisuallyDisabled && !item.canAccessAsAdmin && 'opacity-50',
    );

    const iconSizeClass = isSecondLevel ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0';
    const inner = (
      <>
        {item.icon && (
          <item.icon
            className={cn(
              iconSizeClass,
              isActive ? 'text-primary' : 'text-[hsl(var(--color-text-tertiary))] group-hover:text-foreground',
            )}
          />
        )}
        {!collapsed && (
          <span className="flex-1 truncate leading-tight">{item.label}</span>
        )}
        {!collapsed && item.isComingSoon && (
          <span className="ml-auto flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--color-surface-raised))] text-[hsl(var(--color-text-tertiary))] border border-[hsl(var(--color-border))] font-semibold">
            <Rocket className="h-2.5 w-2.5" />
            Em breve
          </span>
        )}
        {!collapsed && item.isLocked && !item.isComingSoon && (
          <LockedFeatureIndicator featureName={item.label} requiredPlan="Pro" />
        )}
      </>
    );

    if (collapsed) {
      return (
        <TooltipProvider key={item.path} delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              {canNavigate ? (
                <a
                  href={path}
                  className={cn(baseClass, 'justify-center px-2')}
                  onClick={(e) => handleItemClick(item, e, path)}
                  onMouseEnter={() => prefetchByPath(path)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.icon && <item.icon className={iconSizeClass} />}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={(e) => handleItemClick(item, e, path)}
                  onMouseEnter={() => prefetchByPath(path)}
                  className={cn(baseClass, 'justify-center px-2 w-full')}
                >
                  {item.icon && <item.icon className={iconSizeClass} />}
                </button>
              )}
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {item.label}{item.isComingSoon && ' (Em breve)'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <div key={item.path}>
        {canNavigate ? (
          <a
            href={path}
            className={baseClass}
            onClick={(e) => handleItemClick(item, e, path)}
            onMouseEnter={() => prefetchByPath(path)}
            aria-current={isActive ? 'page' : undefined}
          >
            {inner}
          </a>
        ) : (
          <button
            type="button"
            onClick={(e) => handleItemClick(item, e, path)}
            onMouseEnter={() => prefetchByPath(path)}
            className={cn(baseClass, 'w-full text-left')}
          >
            {inner}
          </button>
        )}
      </div>
    );
  };

  const renderSection = (section: NavMenuSection) => {
    const isOpen = openSections.has(section.slug);
    const isGroupActive = section.items.some((i) => isPathActive(i.path));

    // Configurações: CTA único (sem sub-itens) → link para /minha-conta; considerado ativo em qualquer página de configurações
    const isConfiguracoesCta = section.slug === 'configuracoes' && section.items.length === 0;
    const configuracoesPath = '/minha-conta';
    const settingsPaths = ['/minha-conta', '/parametros', '/instituicoes-financeiras', '/configuracoes-fiscais', '/financeiro'];
    const isOnSettingsPage = settingsPaths.some((p) => location.pathname === p || (p !== '/minha-conta' && location.pathname.startsWith(p + '/')));
    const isConfiguracoesActive = isConfiguracoesCta && (location.pathname === configuracoesPath || location.pathname.startsWith(configuracoesPath + '/') || isOnSettingsPage);

    if (isConfiguracoesCta) {
      const configClass = cn(
        'flex w-full items-center rounded-md text-sm font-medium transition-all duration-150',
        isConfiguracoesActive ? 'bg-accent text-accent-foreground' : 'text-[hsl(var(--color-text-tertiary))] hover:bg-accent/60 hover:text-foreground',
      );
      // Em páginas de simulador, usar navegação programática para evitar travamento ao ir para Configurações
      const isOnSimulator = location.pathname.startsWith('/simuladores');
      const configClick = () => navigate(configuracoesPath);
      if (collapsed) {
        return (
          <div key={section.slug} className="py-0.5">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {isOnSimulator ? (
                    <button
                      type="button"
                      onClick={configClick}
                      className={cn(configClass, 'justify-center px-2 py-2')}
                      aria-current={isConfiguracoesActive ? 'page' : undefined}
                    >
                      {section.icon && <section.icon className="h-4 w-4 shrink-0" />}
                    </button>
                  ) : (
                    <Link
                      to={configuracoesPath}
                      className={cn(configClass, 'justify-center px-2 py-2')}
                      aria-current={isConfiguracoesActive ? 'page' : undefined}
                    >
                      {section.icon && <section.icon className="h-4 w-4 shrink-0" />}
                    </Link>
                  )}
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">{section.title}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      }
      return (
        <div key={section.slug} className="py-0.5">
          {isOnSimulator ? (
            <button
              type="button"
              onClick={configClick}
              className={cn(configClass, 'gap-2.5 px-3 py-2')}
              aria-current={isConfiguracoesActive ? 'page' : undefined}
            >
              {section.icon && (
                <section.icon className={cn('h-4 w-4 shrink-0', isConfiguracoesActive ? 'text-primary' : '')} />
              )}
              <span className="flex-1 truncate text-left">{section.title}</span>
            </button>
          ) : (
            <Link
              to={configuracoesPath}
              className={cn(configClass, 'gap-2.5 px-3 py-2')}
              aria-current={isConfiguracoesActive ? 'page' : undefined}
            >
              {section.icon && (
                <section.icon className={cn('h-4 w-4 shrink-0', isConfiguracoesActive ? 'text-primary' : '')} />
              )}
              <span className="flex-1 truncate text-left">{section.title}</span>
            </Link>
          )}
        </div>
      );
    }

    if (collapsed) {
      return (
        <div key={section.slug} className="py-0.5">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-all',
                    isGroupActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-[hsl(var(--color-text-tertiary))] hover:bg-accent/60 hover:text-foreground',
                  )}
                  onClick={() => {
                    setCollapsed(false);
                    setOpenSections((prev) => new Set(prev).add(section.slug));
                  }}
                >
                  {section.icon && <section.icon className="h-4 w-4 shrink-0" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">{section.title}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    }

    return (
      <div key={section.slug} className="py-0.5">
        <button
          type="button"
          onClick={() => toggleSection(section.slug)}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
            isGroupActive ? 'text-foreground' : 'text-[hsl(var(--color-text-tertiary))] hover:bg-accent/60 hover:text-foreground',
          )}
        >
          {section.icon && (
            <section.icon className={cn('h-4 w-4 shrink-0', isGroupActive ? 'text-primary' : '')} />
          )}
          <span className="flex-1 truncate text-left">{section.title}</span>
          {isOpen
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
          }
        </button>
        {isOpen && (
          <div className="mt-0.5 space-y-0.5">
            {section.items.map((item) => renderItem(item, true, section.items))}
          </div>
        )}
      </div>
    );
  };

  const effectiveWidthPx = collapsed ? COLLAPSED_WIDTH_PX : sidebarWidthPx;

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen bg-[hsl(var(--color-surface-raised))] border-r border-[hsl(var(--color-border))] relative',
        'overflow-hidden shrink-0',
        !collapsed && 'transition-[width] duration-200 ease-in-out',
        className,
      )}
      style={{ width: effectiveWidthPx }}
    >
      <div className={cn(
        'flex items-center h-14 px-3 border-b border-[hsl(var(--color-border))] shrink-0',
        collapsed ? 'justify-center flex-col gap-1 pt-2' : 'justify-between',
      )}>
        {!collapsed && (
          <a
            href="/"
            className="flex items-center gap-2 min-w-0"
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
          >
            <img
              src={currentLogo}
              alt="RXFin"
              width={28}
              height={28}
              className="h-7 w-7 object-contain shrink-0"
            />
            <span className="font-semibold text-sm text-[hsl(var(--color-text-primary))] truncate">RXFin</span>
          </a>
        )}
        {collapsed && (
          <a
            href="/"
            className="flex items-center justify-center"
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
          >
            <img
              src={currentLogo}
              alt="RXFin"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
          </a>
        )}
        {!forceCollapsed && (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-md p-1.5 text-[hsl(var(--color-text-tertiary))] hover:bg-accent hover:text-foreground transition-colors shrink-0"
            aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {mainItems.map((item) => renderItem(item))}

        {mainItems.length > 0 && groupedSections.length > 0 && (
          <div className="my-2 border-t border-[hsl(var(--color-border-subtle))]" />
        )}

        {groupedSections.map((section) => renderSection(section))}

        {isAdmin && (
          <>
            <div className="my-2 border-t border-[hsl(var(--color-border-subtle))]" />
            {collapsed ? (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href="/admin"
                      className={cn(
                        'flex w-full items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-all',
                        isAdminActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-[hsl(var(--color-text-tertiary))] hover:bg-accent/60 hover:text-foreground',
                      )}
                      onClick={(e) => { e.preventDefault(); navigate('/admin'); }}
                      aria-current={isAdminActive ? 'page' : undefined}
                    >
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">Admin</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <a
                href="/admin"
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all',
                  isAdminActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-[hsl(var(--color-text-tertiary))] hover:bg-accent/60 hover:text-foreground',
                )}
                onClick={(e) => { e.preventDefault(); navigate('/admin'); }}
                aria-current={isAdminActive ? 'page' : undefined}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Admin</span>
              </a>
            )}
          </>
        )}
      </nav>

      <div className={cn(
        'border-t border-[hsl(var(--color-border))] py-3 px-2 space-y-1 shrink-0',
        collapsed && 'flex flex-col items-center',
      )}>
        <div className={cn('flex', collapsed ? 'justify-center' : 'px-1')}>
          <NotificationBell />
        </div>

        {isAdmin && (
          <div className={cn('flex', collapsed ? 'justify-center' : 'px-1')}>
            <ImpersonationButton />
          </div>
        )}

        {!collapsed && isAdmin && (
          <div className="flex flex-wrap gap-1 px-1 pt-1">
            <span className={cn(
              'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[hsl(var(--color-border))]',
              isStaging
                ? 'bg-[hsl(var(--color-surface-raised))] text-[hsl(var(--color-text-tertiary))]'
                : 'bg-primary/10 text-primary',
            )}>
              {isStaging ? 'Staging' : 'Produção'}
            </span>
            <Badge variant="warning" className="gap-1 text-[10px] uppercase tracking-wider font-bold">
              <ShieldCheck className="h-3 w-3" />
              Admin
            </Badge>
          </div>
        )}

        {collapsed ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center justify-center rounded-md p-2 text-[hsl(var(--color-text-tertiary))] hover:bg-accent hover:text-foreground transition-colors w-full"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Sair</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-[hsl(var(--color-text-tertiary))] hover:bg-accent hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sair</span>
          </button>
        )}
      </div>

      {/* Resize handle — desktop, quando expandido */}
      {!collapsed && (
        <div
          role="separator"
          aria-label="Redimensionar menu"
          onMouseDown={handleResizeStart}
          className={cn(
            'absolute top-0 right-0 w-1 h-full cursor-col-resize shrink-0 z-10',
            'hover:bg-primary/20 active:bg-primary/30',
            isResizing && 'bg-primary/30',
          )}
        />
      )}
    </aside>
  );
};
