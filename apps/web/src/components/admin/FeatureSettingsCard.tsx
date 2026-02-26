import { useState, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAdminDeferredMutations } from '@/hooks/useAdminDeferredMutations';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export function FeatureSettingsCard() {
  const { settings, isLoading } = useAppSettings();
  const { deferUpdateSettings } = useAdminDeferredMutations();
  
  const [formState, setFormState] = useState({
    shared_account_enabled: false,
    notifications_enabled: false,
  });

  useEffect(() => {
    if (settings) {
      setFormState({
        shared_account_enabled: settings.shared_account_enabled,
        notifications_enabled: settings.notifications_enabled,
      });
    }
  }, [settings]);

  const handleToggle = (key: 'shared_account_enabled' | 'notifications_enabled', checked: boolean) => {
    setFormState(prev => ({ ...prev, [key]: checked }));
    const label = key === 'shared_account_enabled' ? 'Conta Compartilhada' : 'Notificações';
    deferUpdateSettings(
      { [key]: checked },
      `${checked ? 'Ativar' : 'Desativar'} ${label}`
    );
    toast.info('Alteração adicionada para revisão');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5" />
            Funcionalidades do Usuário
          </CardTitle>
          <CardDescription className="mt-1.5">
            Controle quais seções estão disponíveis para os usuários
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="space-y-0.5 flex-1 min-w-0 pr-3">
            <Label className="text-sm font-medium">Conta Compartilhada</Label>
            <p className="text-xs text-muted-foreground leading-tight">
              Permite que os usuários alternem entre conta individual e compartilhada
            </p>
          </div>
          <Switch
            checked={formState.shared_account_enabled}
            onCheckedChange={(checked) => handleToggle('shared_account_enabled', checked)}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="space-y-0.5 flex-1 min-w-0 pr-3">
            <Label className="text-sm font-medium">Notificações</Label>
            <p className="text-xs text-muted-foreground leading-tight">
              Habilita a seção de notificações nas preferências do usuário
            </p>
          </div>
          <Switch
            checked={formState.notifications_enabled}
            onCheckedChange={(checked) => handleToggle('notifications_enabled', checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
