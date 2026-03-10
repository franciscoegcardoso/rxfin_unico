import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home,
  Building2,
  FileText,
  ChevronDown,
  LogOut,
  Lock,
  ShieldCheck,
  Rocket,
  Menu,
  X,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { detectEnvironment } from '@/lib/environment';
import { useNavMenuPages, NavMenuItem, NavMenuSection } from '@/hooks/useNavMenuPages';
import { LockedFeatureIndicator } from '@/components/subscription/LockedFeatureIndicator';
import { ImpersonationButton } from '@/components/admin/ImpersonationButton';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { showComingSoonToast } from '@/components/subscription/ComingSoonToast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { useMobileMenu } from '@/contexts/MobileMenuContext';
import logoRxfin from '@/assets/logo-rxfin-icon.png';
import logoRxfinWhite from '@/assets/logo-rxfin-white.png';
import { useTheme } from 'next-themes';

// NOTE: Removed static fallback - menu items must come from database to respect visibility settings

const adminPath = '/admin';

export const TopNavbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { mainItems, groupedSections, isLoading } = useNavMenuPages();
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const { open: mobileMenuOpen, setOpen: setMobileMenuOpen } = useMobileMenu();
  const currentLogo = resolvedTheme === 'dark' ? logoRxfinWhite : logoRxfin;
  
  const isAdminActive = location.pathname.startsWith('/admin');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  // Use ONLY items from database - no fallback that bypasses visibility settings
  const displayMainItems = mainItems;

  // Verificar se algum grupo está ativo
  const getIsGroupActive = (section: NavMenuSection) => 
    section.items.some(item => location.pathname === item.path);

  const handleItemClick = (item: NavMenuItem, e: React.MouseEvent) => {
    // Admin can click through "coming soon" pages
    if (item.canAccessAsAdmin) {
      // Allow navigation - don't prevent default
      return;
    }
    if (item.isComingSoon || item.isLocked) {
      e.preventDefault();
      showComingSoonToast({ featureName: item.label });
    }
  };

  // Garantir path absoluto para cair na árvore autenticada (AppShell), não no layout público
  const toPath = (path: string) => (path && path.startsWith('/') ? path : `/${path || ''}`);

  const renderDropdownItem = (item: NavMenuItem) => {
    const isActive = location.pathname === toPath(item.path);
    const isVisuallyDisabled = item.isLocked || item.isComingSoon;
    const canNavigate = item.canAccessAsAdmin || !isVisuallyDisabled;

    // If admin can navigate, render as link with visual indicator
    if (canNavigate) {
      return (
        <Link
          key={item.path}
          to={toPath(item.path)}
          className={cn(
            "flex items-center gap-2",
            isActive && "text-primary",
            isVisuallyDisabled && "opacity-60"
          )}
        >
          <item.icon className="h-4 w-4" />
          <span className="flex-1">{item.label}</span>
          {item.isComingSoon && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 border border-amber-500/30 font-medium flex items-center gap-0.5">
              <Rocket className="h-2.5 w-2.5" />
              Em breve
            </span>
          )}
        </Link>
      );
    }

    // Non-admin with disabled item - show toast on click
    return (
      <div
        key={item.path}
        onClick={(e) => handleItemClick(item, e)}
        className={cn(
          "flex items-center gap-2 opacity-50 cursor-pointer px-2 py-1.5 rounded-sm hover:bg-accent/50",
          isActive && "text-primary"
        )}
      >
        <item.icon className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-muted-foreground">{item.label}</span>
        {item.isComingSoon ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 border border-amber-500/30 font-medium flex items-center gap-0.5">
            <Rocket className="h-2.5 w-2.5" />
            Em breve
          </span>
        ) : (
          <LockedFeatureIndicator 
            featureName={item.label}
            requiredPlan="Pro"
          />
        )}
      </div>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border overflow-x-hidden shadow-sm bg-background">
      <div className="flex h-14 items-center justify-between px-4 md:px-6 w-full max-w-full mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img 
            src={currentLogo} 
            alt="RXFin Logo" 
            className="h-8 w-8 object-contain"
          />
          <span className="font-semibold text-base text-foreground hidden sm:inline">RXFin</span>
        </Link>

        {/* Mobile/Tablet: Hamburger (Menu/X) + Notification Bell — visible only < md */}
        {isMobile && (
          <div className="flex items-center gap-1 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 min-h-[44px] min-w-[44px] touch-manipulation"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <NotificationBell />
          </div>
        )}

        {/* Desktop Navigation (lg+) */}
        <nav className="hidden lg:flex items-center gap-1 flex-1 ml-6">
          {/* Itens principais (Início, Bens, IR) */}
          {displayMainItems.map((item) => {
            const path = toPath(item.path);
            const isActive = location.pathname === path;
            const isVisuallyDisabled = item.isLocked || item.isComingSoon;
            const canNavigate = item.canAccessAsAdmin || !isVisuallyDisabled;
            const tourId = path === '/bens-investimentos' ? 'nav-patrimonio' : undefined;
            
            // Admin can navigate but sees visual indicator
            if (canNavigate) {
              return (
                <Link
                  key={item.path}
                  to={path}
                  data-tour={tourId}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    isVisuallyDisabled && "opacity-60"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                  {item.isComingSoon && (
                    <span className="absolute -top-1 -right-1 text-[8px] px-1 py-0 rounded-full bg-amber-500/20 text-amber-600 border border-amber-500/30 font-medium">
                      Em breve
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            }
            
            // Non-admin with disabled item
            return (
              <button
                key={item.path}
                type="button"
                onClick={(e) => handleItemClick(item as NavMenuItem, e as any)}
                data-tour={tourId}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all cursor-pointer min-h-[44px] min-w-[44px] touch-manipulation",
                  "text-muted-foreground/50 hover:bg-muted/50"
                )}
                aria-label={item.label}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
                {item.isComingSoon && (
                  <span className="absolute -top-1 -right-1 text-[8px] px-1 py-0 rounded-full bg-amber-500/20 text-amber-600 border border-amber-500/30 font-medium">
                    Em breve
                  </span>
                )}
              </button>
            );
          })}

          {/* Dropdowns dinâmicos baseados nos grupos */}
          {groupedSections.map((section) => {
            const isActive = getIsGroupActive(section);
            const tourId = section.slug === 'planejamento' ? 'nav-planejar' : 
                          section.slug === 'configuracoes' ? 'nav-config' : undefined;
            
            return (
              <DropdownMenu key={section.slug}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    data-tour={tourId}
                    size="sm"
                    className={cn(
                      "relative flex items-center gap-1.5 px-3 py-2 h-auto text-sm font-medium",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <section.icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{section.title}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {section.items.map((item) => (
                    <DropdownMenuItem key={item.path} asChild className="cursor-pointer">
                      {renderDropdownItem(item)}
                    </DropdownMenuItem>
                  ))}
                  {section.slug === 'configuracoes' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleSignOut}
                        className="cursor-pointer"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sair
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="hidden lg:flex items-center gap-1">
          {/* Environment Badge - Admin only */}
          {isAdmin && (() => {
            const env = detectEnvironment();
            const isStaging = env === 'staging';
            return (
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                isStaging
                  ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
              )}>
                {isStaging ? 'Staging' : 'Produção'}
              </span>
            );
          })()}

          {/* Admin Session Badge */}
          {isAdmin && (
            <Badge variant="warning" className="gap-1 text-[10px] uppercase tracking-wider font-bold">
              <ShieldCheck className="h-3 w-3" />
              Admin
            </Badge>
          )}

          {/* Notification Bell */}
          <NotificationBell />

          {/* Lixeira - Admin only, quick access */}
          {isAdmin && (
            <Link
              to="/lixeira"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all min-h-[44px] min-w-[44px] touch-manipulation",
                location.pathname === '/lixeira'
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title="Lixeira"
              aria-label="Lixeira"
            >
              <Trash2 className="h-4 w-4" />
            </Link>
          )}

          {/* Admin Button */}
          {isAdmin && (
            <Link
              to={adminPath}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
                isAdminActive
                  ? "bg-amber-500/10 text-amber-600"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden lg:inline">Admin</span>
            </Link>
          )}
          
          {/* Impersonation Button */}
          <ImpersonationButton />
        </div>
      </div>
    </header>
  );
};
