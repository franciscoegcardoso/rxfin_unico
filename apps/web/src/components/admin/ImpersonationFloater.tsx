import React, { useContext } from 'react';
import { ImpersonationContext } from '@/contexts/ImpersonationContext';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, User, Crown, Shield, Check, Sparkles, Ban, Loader2 } from 'lucide-react';

// Icon mapping by slug
const ICON_MAP: Record<string, React.ElementType> = {
  sem_cadastro: Ban,
  free: User,
  basic: Sparkles,
  pro: Crown,
  premium: Crown,
  admin: Shield,
};

// Color mapping by slug
const COLOR_MAP: Record<string, string> = {
  sem_cadastro: 'bg-red-500/20 text-red-600',
  free: 'bg-muted text-muted-foreground',
  basic: 'bg-blue-500/20 text-blue-600',
  pro: 'bg-emerald-500/20 text-emerald-600',
  premium: 'bg-amber-500/20 text-amber-600',
  admin: 'bg-primary/20 text-primary',
};

// Mobile floater - only shown on mobile devices
export const ImpersonationFloater: React.FC = () => {
  // Use context directly to avoid throwing error if provider is missing
  const context = useContext(ImpersonationContext);
  const { data: plans, isLoading } = useSubscriptionPlans(true);
  
  // Extract values from context (with safe defaults for when context is null)
  const impersonatedRole = context?.impersonatedRole ?? null;
  const isImpersonating = context?.isImpersonating ?? false;
  const setImpersonatedRole = context?.setImpersonatedRole ?? (() => {});
  const clearImpersonation = context?.clearImpersonation ?? (() => {});
  const canImpersonate = context?.canImpersonate ?? false;

  // Build roles from database plans + admin option - MUST be before any conditional returns
  const roles = React.useMemo(() => {
    const planRoles = (plans || [])
      .filter(plan => plan.is_active)
      .map(plan => ({
        value: plan.slug,
        label: plan.name,
        icon: ICON_MAP[plan.slug] || User,
        color: COLOR_MAP[plan.slug] || 'bg-muted text-muted-foreground',
      }));

    // Always add admin at the end if not already present
    if (!planRoles.some(r => r.value === 'admin')) {
      planRoles.push({
        value: 'admin',
        label: 'Admin',
        icon: Shield,
        color: COLOR_MAP.admin,
      });
    }

    return planRoles;
  }, [plans]);

  // Conditional returns AFTER all hooks
  if (!context || !canImpersonate) return null;

  const currentRole = roles.find(r => r.value === impersonatedRole);

  return (
    <div className="fixed bottom-20 right-4 z-50 md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={isImpersonating ? 'default' : 'outline'}
            size="sm"
            className={`shadow-lg gap-2 ${isImpersonating ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
          >
            {isImpersonating ? (
              <>
                <Eye className="h-4 w-4" />
                <Badge variant="secondary" className={currentRole?.color}>
                  {currentRole?.label || impersonatedRole}
                </Badge>
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" />
                <span>Testar</span>
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="flex items-center gap-2 text-xs">
            <Eye className="h-3.5 w-3.5" />
            Visualizar como...
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            roles.map((role) => {
              const Icon = role.icon;
              const isActive = impersonatedRole === role.value;
              
              return (
                <DropdownMenuItem
                  key={role.value}
                  onClick={() => setImpersonatedRole(role.value)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${role.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm">{role.label}</span>
                  </div>
                  {isActive && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              );
            })
          )}
          
          {isImpersonating && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={clearImpersonation}
                className="text-destructive cursor-pointer"
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Encerrar Visualização
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
