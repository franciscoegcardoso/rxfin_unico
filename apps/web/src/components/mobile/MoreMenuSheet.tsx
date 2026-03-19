import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LogOut,
  X,
  Loader2,
  Lock,
  Rocket,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileMenuSections } from '@/hooks/useNavMenuPages';
import { showComingSoonToast } from '@/components/subscription/ComingSoonToast';
import { openCibeliaChat } from '@/components/ai/RaioXChat';
import cibeliaAvatar from '@/assets/cibelia.png';

interface MoreMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NARROW_LABEL_MAX_WIDTH = 640;

export const MoreMenuSheet: React.FC<MoreMenuSheetProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { sections, isLoading } = useMobileMenuSections();
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < NARROW_LABEL_MAX_WIDTH
  );

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < NARROW_LABEL_MAX_WIDTH);
    window.addEventListener('resize', check);
    check();
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    if (open) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [open, onOpenChange]);

  const handleNavigate = (path: string, isLocked: boolean, isComingSoon: boolean, label: string, canAccessAsAdmin?: boolean) => {
    if (canAccessAsAdmin) {
      onOpenChange(false);
      navigate(path);
      return;
    }
    if (isLocked || isComingSoon) {
      showComingSoonToast({ featureName: label });
      return;
    }
    onOpenChange(false);
    navigate(path);
  };

  const handleSignOut = async () => {
    onOpenChange(false);
    await signOut();
    navigate('/login', { replace: true });
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-safe max-h-[85vh]">
        <DrawerHeader className="relative">
          <DrawerTitle className="text-center">Menu</DrawerTitle>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8"
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          {/* Fale com a Cibelia - top of menu */}
          <button
            onClick={() => {
              onOpenChange(false);
              // Small delay to let drawer close before opening sheet
              setTimeout(() => openCibeliaChat(), 300);
            }}
            className="flex items-center gap-3 w-full rounded-xl px-3 py-3 mb-4 text-sm font-medium transition-colors bg-[#0e7051]/10 hover:bg-[#0e7051]/20 text-[#0e7051] dark:text-emerald-400 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20"
          >
            <div className="h-9 w-9 rounded-full overflow-hidden shrink-0 border-2 border-[#0e7051]/30" style={{ backgroundColor: '#0e7051' }}>
              <img src={cibeliaAvatar} alt="Cibelia" className="h-full w-full object-cover" />
            </div>
            <span className="flex-1 text-left">Fale com a Cibelia!</span>
            <MessageCircle className="h-4 w-4 opacity-70" />
          </button>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {sections.map((section) => (
                <div key={section.slug} className="mb-4">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                    {section.title}
                  </p>
                    <div className="space-y-1">
                    {section.items.map((item) => {
                      const isVisuallyDisabled = item.isLocked || item.isComingSoon;
                      const canNavigate = item.canAccessAsAdmin || !isVisuallyDisabled;
                      
                      return (
                        <button
                          key={item.path}
                          onClick={() => handleNavigate(
                            item.path, 
                            item.isLocked ?? false, 
                            item.isComingSoon ?? false, 
                            item.label,
                            item.canAccessAsAdmin
                          )}
                          className={cn(
                            "relative flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            isVisuallyDisabled && !canNavigate
                              ? "opacity-40 cursor-pointer"
                              : isVisuallyDisabled && canNavigate
                                ? "opacity-60"
                                : isActive(item.path)
                                  ? "bg-primary/10 text-primary"
                                  : "text-foreground hover:bg-accent"
                          )}
                        >
                          <div className="relative">
                            <item.icon className="h-4 w-4" />
                            {isVisuallyDisabled && !canNavigate && (
                              <div className="absolute -top-1 -right-1 bg-muted rounded-full p-0.5">
                                {item.isComingSoon ? (
                                  <Rocket className="h-2 w-2 text-amber-500" />
                                ) : (
                                  <Lock className="h-2 w-2 text-muted-foreground" />
                                )}
                              </div>
                            )}
                          </div>
                          <span className="flex-1 text-left">
                            {isNarrow && item.shortLabel ? item.shortLabel : item.label}
                          </span>
                          {item.isComingSoon && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 border border-amber-500/30 font-medium">
                              Em breve
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Logout */}
          <div className="pt-3 border-t border-border">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
