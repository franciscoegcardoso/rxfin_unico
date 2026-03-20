import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMobileMenu } from '@/contexts/MobileMenuContext';
import { 
  Home, 
  Building2, 
  CalendarRange, 
  Menu,
  Plus,
  Lock,
  Rocket,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { QuickActionsSheet } from './QuickActionsSheet';
import { MoreMenuSheet } from './MoreMenuSheet';
import { useSubscriptionPermissions } from '@/hooks/useSubscriptionPermissions';
import { usePageAvailability } from '@/hooks/useNavMenuPages';
import { Badge } from '@/components/ui/badge';
import { showComingSoonToast } from '@/components/subscription/ComingSoonToast';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Início', path: '/inicio' },
  { icon: Building2, label: 'Patrimônio', path: '/bens-investimentos' },
  // FAB placeholder
  { icon: CalendarRange, label: 'Planejar', path: '/planejamento-mensal' },
  { icon: Menu, label: 'Mais', path: '' },
];

// Map routes to human-readable feature names
const ROUTE_FEATURE_NAMES: Record<string, string> = {
  '/planejamento-mensal': 'Planejamento Mensal',
  '/bens-investimentos': 'Patrimônio',
};

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [quickActionsOpen, setQuickActionsOpen] = React.useState(false);
  const { open: moreMenuOpen, setOpen: setMoreMenuOpen } = useMobileMenu();
  const { hasRoutePermission, isAdmin } = useSubscriptionPermissions();
  
  // Check availability for each path
  const inicioAvailability = usePageAvailability('/inicio');
  const planejamentoAvailability = usePageAvailability('/planejamento-mensal');
  const patrimonioAvailability = usePageAvailability('/bens-investimentos');

  const isActive = (path: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isLocked = (path: string) => {
    if (!path) return false;
    return !hasRoutePermission(path);
  };

  const isComingSoon = (path: string) => {
    if (path === '/inicio') return !inicioAvailability.isAvailable;
    if (path === '/planejamento-mensal') return !planejamentoAvailability.isAvailable;
if (path === '/bens-investimentos') return !patrimonioAvailability.isAvailable;
    return false;
  };

  const canAdminBypass = (path: string) => {
    if (path === '/inicio') return inicioAvailability.canAdminBypass;
    if (path === '/planejamento-mensal') return planejamentoAvailability.canAdminBypass;
if (path === '/bens-investimentos') return patrimonioAvailability.canAdminBypass;
    return false;
  };

  const handleNavClick = (item: NavItem) => {
    if (item.label === 'Mais') {
      setMoreMenuOpen(true);
    } else if (item.path) {
      const comingSoon = isComingSoon(item.path);
      const locked = isLocked(item.path);
      const adminBypass = canAdminBypass(item.path);
      
      // Admin can bypass coming soon restriction
      if (adminBypass) {
        navigate(item.path);
        return;
      }
      
      if (comingSoon || locked) {
        const featureName = ROUTE_FEATURE_NAMES[item.path] || item.label;
        showComingSoonToast({ featureName });
      } else {
        navigate(item.path);
      }
    }
  };

  const renderNavButton = (item: NavItem) => {
    const active = isActive(item.path);
    const locked = isLocked(item.path);
    const comingSoon = isComingSoon(item.path);
    const adminBypass = canAdminBypass(item.path);
    const isVisuallyDisabled = locked || comingSoon;
    const canNavigate = adminBypass || !isVisuallyDisabled;

    return (
      <button
        key={item.label}
        onClick={() => handleNavClick(item)}
        className={cn(
          "relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
          isVisuallyDisabled && !canNavigate
            ? "text-muted-foreground/40 cursor-pointer" 
            : isVisuallyDisabled && canNavigate
              ? "text-muted-foreground/60"
              : active 
                ? "text-primary" 
                : "text-muted-foreground"
        )}
      >
        {/* Active indicator dot */}
        {active && !isVisuallyDisabled && (
          <span className="absolute top-1 w-1 h-1 rounded-full bg-primary" />
        )}
        <div className="relative mt-0.5">
          <item.icon className={cn(
            "h-5 w-5", 
            active && !isVisuallyDisabled && "fill-primary/20",
            isVisuallyDisabled && "opacity-50"
          )} />
          {isVisuallyDisabled && (
            <div className="absolute -top-1 -right-1 bg-muted rounded-full p-0.5">
              {comingSoon ? (
                <Rocket className="h-2.5 w-2.5 text-amber-500" />
              ) : (
                <Lock className="h-2.5 w-2.5 text-muted-foreground" />
              )}
            </div>
          )}
        </div>
        <span className={cn("text-[10px] font-medium", isVisuallyDisabled && "opacity-50")}>{item.label}</span>
      </button>
    );
  };

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border safe-area-pb">
        <div className="flex items-center h-16 px-2">
          {/* First two items */}
          {navItems.slice(0, 2).map((item) => renderNavButton(item))}

          {/* Central FAB - inline with other items */}
          <div className="flex-1 flex items-center justify-center">
            <motion.button
              onClick={() => {
                // Admin can access quick actions, others see coming soon
                if (isAdmin) {
                  setQuickActionsOpen(true);
                } else {
                  showComingSoonToast({ featureName: 'Ações Rápidas' });
                }
              }}
              className="relative flex flex-col items-center justify-center gap-0.5"
              whileTap={{ scale: 0.95 }}
            >
              <div className={cn(
                "h-12 w-12 rounded-full shadow-lg flex items-center justify-center",
                isAdmin 
                  ? "bg-primary" 
                  : "bg-muted opacity-50"
              )}>
                <Plus className={cn(
                  "h-6 w-6",
                  isAdmin ? "text-primary-foreground" : "text-muted-foreground"
                )} />
              </div>
              {!isAdmin && (
                <div className="absolute top-0 right-0 bg-muted rounded-full p-0.5">
                  <Rocket className="h-2.5 w-2.5 text-amber-500" />
                </div>
              )}
            </motion.button>
          </div>

          {/* Last two items */}
          {navItems.slice(2).map((item) => renderNavButton(item))}
        </div>
      </nav>

      <QuickActionsSheet 
        open={quickActionsOpen} 
        onOpenChange={setQuickActionsOpen} 
      />

      <MoreMenuSheet 
        open={moreMenuOpen} 
        onOpenChange={setMoreMenuOpen} 
      />
    </>
  );
};
