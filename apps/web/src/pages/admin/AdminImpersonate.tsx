import { useState, useRef, useCallback, useMemo } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import {
  Monitor, Tablet, Smartphone, Eye, EyeOff, RefreshCw,
  User, Crown, Shield, Sparkles, Ban, ExternalLink, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'rxfin_impersonated_role';

const VIEWPORTS = [
  { id: 'desktop', label: 'Desktop', icon: Monitor, width: '100%', maxWidth: '100%', height: '100%' },
  { id: 'tablet', label: 'Tablet', icon: Tablet, width: '768px', maxWidth: '768px', height: '1024px' },
  { id: 'mobile', label: 'Mobile', icon: Smartphone, width: '375px', maxWidth: '375px', height: '812px' },
] as const;

const ICON_MAP: Record<string, React.ElementType> = {
  sem_cadastro: Ban,
  free: User,
  basic: Sparkles,
  pro: Crown,
  premium: Crown,
  admin: Shield,
};

const COLOR_MAP: Record<string, string> = {
  sem_cadastro: 'border-destructive/40 text-destructive',
  free: 'border-muted-foreground/40 text-muted-foreground',
  basic: 'border-blue-500/40 text-blue-600 dark:text-blue-400',
  pro: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  premium: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  admin: 'border-primary/40 text-primary',
};

export default function AdminImpersonate() {
  const { data: plans, isLoading } = useSubscriptionPlans(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedRole, setSelectedRole] = useState<string | null>(() => {
    return sessionStorage.getItem(STORAGE_KEY);
  });
  const [navPath, setNavPath] = useState('/inicio');

  const roles = useMemo(() => {
    const planRoles = (plans || [])
      .filter(p => p.is_active)
      .map(p => ({
        value: p.slug,
        label: p.name,
        icon: ICON_MAP[p.slug] || User,
        color: COLOR_MAP[p.slug] || 'border-muted-foreground/40 text-muted-foreground',
      }));

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

  const applyRole = useCallback((role: string | null) => {
    setSelectedRole(role);
    if (role) {
      sessionStorage.setItem(STORAGE_KEY, role);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    // Reload iframe to apply
    iframeRef.current?.contentWindow?.location.reload();
  }, []);

  const reloadIframe = () => {
    iframeRef.current?.contentWindow?.location.reload();
  };

  const navigateIframe = (path: string) => {
    setNavPath(path);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.location.href = path;
    }
  };

  const openExternal = () => {
    window.open(navPath, '_blank');
  };

  const vp = VIEWPORTS.find(v => v.id === viewport)!;
  const currentRole = roles.find(r => r.value === selectedRole);

  return (
    <div className="space-y-4 h-full flex flex-col">
      <AdminPageHeader
        title="Impersonar"
        description="Visualize a aplicação como diferentes planos e dispositivos"
      />

      {/* Controls Bar */}
      <Card>
        <CardContent className="p-3 space-y-3">
          {/* Row 1: Viewport + Actions */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Viewport switcher */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {VIEWPORTS.map(v => (
                <Button
                  key={v.id}
                  variant={viewport === v.id ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('gap-1.5 h-8', viewport === v.id && 'shadow-sm')}
                  onClick={() => setViewport(v.id as any)}
                >
                  <v.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">{v.label}</span>
                </Button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Input
                value={navPath}
                onChange={e => setNavPath(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && navigateIframe(navPath)}
                className="h-8 text-xs font-mono"
                placeholder="/inicio"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={reloadIframe}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={openExternal}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Current role badge */}
            {selectedRole && (
              <Badge variant="outline" className={cn('gap-1.5', currentRole?.color)}>
                <Eye className="h-3 w-3" />
                {currentRole?.label || selectedRole}
              </Badge>
            )}
          </div>

          {/* Row 2: Plan selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium shrink-0">Visualizar como:</span>
            {isLoading ? (
              <div className="flex gap-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-20" />)}
              </div>
            ) : (
              <>
                {roles.map(role => {
                  const Icon = role.icon;
                  const active = selectedRole === role.value;
                  return (
                    <Button
                      key={role.value}
                      variant={active ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-8 gap-1.5 text-xs',
                        active && 'shadow-sm',
                        !active && role.color,
                      )}
                      onClick={() => applyRole(role.value)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {role.label}
                      {active && <Check className="h-3 w-3 ml-0.5" />}
                    </Button>
                  );
                })}
                {selectedRole && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
                    onClick={() => applyRole(null)}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    Encerrar
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview iframe */}
      <div className="flex-1 min-h-0 flex items-start justify-center bg-muted/30 rounded-lg border border-border p-4 overflow-auto">
        <div
          className={cn(
            'bg-background rounded-lg border border-border shadow-lg overflow-hidden transition-all duration-300',
            viewport !== 'desktop' && 'mx-auto',
          )}
          style={{
            width: vp.width,
            maxWidth: vp.maxWidth,
            height: viewport === 'desktop' ? 'calc(100vh - 320px)' : vp.height,
          }}
        >
          <iframe
            ref={iframeRef}
            src={navPath}
            className="w-full h-full border-0"
            title="Preview"
          />
        </div>
      </div>
    </div>
  );
}
