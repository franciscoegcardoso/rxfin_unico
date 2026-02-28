import { useState, useEffect } from 'react';
import { LogIn, Sparkles, ArrowRight, SkipForward, Users, Layers } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAdminDeferredMutations } from '@/hooks/useAdminDeferredMutations';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export function AuthFlowSettingsCard() {
  const { settings, isLoading } = useAppSettings();
  const { deferUpdateSettings } = useAdminDeferredMutations();
  
  const [formState, setFormState] = useState({
    onboarding_enabled: true,
    onboarding_type: 'simple' as 'simple' | 'complete',
    returning_user_route: '/simuladores',
    onboarding_skip_route: '/simuladores',
  });
  
  const firstLoginRoute = formState.onboarding_type === 'simple' 
    ? '/onboarding2' 
    : '/onboarding';

  useEffect(() => {
    if (settings) {
      setFormState({
        onboarding_enabled: settings.onboarding_enabled,
        onboarding_type: settings.onboarding_type,
        returning_user_route: settings.returning_user_route,
        onboarding_skip_route: settings.onboarding_skip_route,
      });
    }
  }, [settings]);

  const deferChange = (updates: Record<string, any>, description: string) => {
    deferUpdateSettings(updates, description);
    toast.info('Alteração adicionada para revisão');
  };

  const handleToggleOnboarding = (checked: boolean) => {
    setFormState(prev => ({ ...prev, onboarding_enabled: checked }));
    const newFirstLogin = formState.onboarding_type === 'simple' ? '/onboarding2' : '/onboarding';
    deferChange(
      { onboarding_enabled: checked, first_login_route: newFirstLogin },
      `${checked ? 'Ativar' : 'Desativar'} onboarding`
    );
  };

  const handleTypeChange = (value: 'simple' | 'complete') => {
    setFormState(prev => ({ ...prev, onboarding_type: value }));
    const newFirstLogin = value === 'simple' ? '/onboarding2' : '/onboarding';
    deferChange(
      { onboarding_type: value, first_login_route: newFirstLogin },
      `Alterar tipo de onboarding para "${value}"`
    );
  };

  const handleRouteBlur = (key: string, value: string) => {
    if (settings && value !== (settings as any)[key]) {
      deferChange({ [key]: value }, `Alterar rota "${key}" para "${value}"`);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-80 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LogIn className="h-5 w-5" />
            Fluxo de Autenticação
          </CardTitle>
          <CardDescription className="mt-1.5">
            Configure o onboarding e as rotas de redirecionamento após login/signup
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Onboarding Toggle Section */}
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Onboarding para Novos Usuários</h4>
                  <Badge variant={formState.onboarding_enabled ? "default" : "secondary"}>
                    {formState.onboarding_enabled ? "Ativo" : "Desativado"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Quando ativado, novos usuários passam por um fluxo guiado no primeiro acesso
                </p>
              </div>
            </div>
            <Switch
              checked={formState.onboarding_enabled}
              onCheckedChange={handleToggleOnboarding}
            />
          </div>

          {formState.onboarding_enabled && (
            <>
              <Separator />
              
              {/* Onboarding Type Selection */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Tipo de Onboarding
                </Label>
                <RadioGroup
                  value={formState.onboarding_type}
                  onValueChange={handleTypeChange}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <div className="flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="simple" id="simple" className="mt-0.5" />
                    <div className="space-y-1">
                      <Label htmlFor="simple" className="font-medium cursor-pointer">
                        Simplificado
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Uma única página para confirmar dados básicos (nome, email, data de nascimento, telefone)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="complete" id="complete" className="mt-0.5" />
                    <div className="space-y-1">
                      <Label htmlFor="complete" className="font-medium cursor-pointer">
                        Completo
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Fluxo guiado com múltiplas etapas (veículos, rendas, despesas, sonhos)
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5" />
                    Rota do Primeiro Login
                  </Label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted text-sm">
                    <code>{firstLoginRoute}</code>
                    <Badge variant="outline" className="text-xs">Automático</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Definido automaticamente pelo tipo de onboarding
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skip-route" className="flex items-center gap-1.5">
                    <SkipForward className="h-3.5 w-3.5" />
                    Rota ao Pular Onboarding
                  </Label>
                  <Input
                    id="skip-route"
                    value={formState.onboarding_skip_route}
                    onChange={(e) => 
                      setFormState(prev => ({ ...prev, onboarding_skip_route: e.target.value }))
                    }
                    onBlur={() => handleRouteBlur('onboarding_skip_route', formState.onboarding_skip_route)}
                    placeholder="/simuladores"
                  />
                  <p className="text-xs text-muted-foreground">
                    Para onde vai se o usuário optar por pular
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Returning Users Section */}
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">Usuários Recorrentes</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configuração para usuários que já completaram o onboarding ou estão retornando
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="returning-route" className="flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" />
              Rota Padrão Após Login
            </Label>
            <Input
              id="returning-route"
              value={formState.returning_user_route}
              onChange={(e) => 
                setFormState(prev => ({ ...prev, returning_user_route: e.target.value }))
              }
              onBlur={() => handleRouteBlur('returning_user_route', formState.returning_user_route)}
              placeholder="/simuladores"
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">
              Para onde usuários são redirecionados em logins subsequentes
            </p>
          </div>
        </div>

        {/* Flow Preview */}
        <div className="rounded-lg bg-muted/30 p-4">
          <h4 className="text-sm font-medium mb-3">Prévia do Fluxo</h4>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="shrink-0">Novo Usuário</Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Signup →</span>
              <code className="px-1.5 py-0.5 rounded bg-muted text-xs">
                {formState.onboarding_enabled ? firstLoginRoute : formState.returning_user_route}
              </code>
            </div>
            {formState.onboarding_enabled && (
              <div className="flex items-center gap-2 pl-6">
                <span className="text-muted-foreground text-xs">Se pular →</span>
                <code className="px-1.5 py-0.5 rounded bg-muted text-xs">
                  {formState.onboarding_skip_route}
                </code>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="shrink-0">Usuário Recorrente</Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Login →</span>
              <code className="px-1.5 py-0.5 rounded bg-muted text-xs">
                {formState.returning_user_route}
              </code>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
