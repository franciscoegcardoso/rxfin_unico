import { useState, useEffect } from 'react';
import { Settings2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Skeleton } from '@/components/ui/skeleton';

export function FeatureSettingsCard() {
  const { settings, isLoading, updateMultipleSettings, isUpdating } = useAppSettings();
  
  const [formState, setFormState] = useState({
    shared_account_enabled: false,
    notifications_enabled: false,
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormState({
        shared_account_enabled: settings.shared_account_enabled,
        notifications_enabled: settings.notifications_enabled,
      });
    }
  }, [settings]);

  useEffect(() => {
    if (settings) {
      const changed =
        formState.shared_account_enabled !== settings.shared_account_enabled ||
        formState.notifications_enabled !== settings.notifications_enabled;
      setHasChanges(changed);
    }
  }, [formState, settings]);

  const handleSave = () => {
    updateMultipleSettings(formState);
    setHasChanges(false);
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings2 className="h-5 w-5" />
              Funcionalidades do Usuário
            </CardTitle>
            <CardDescription className="mt-1.5">
              Controle quais seções estão disponíveis para os usuários
            </CardDescription>
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isUpdating}
            size="sm"
          >
            <Save className="h-4 w-4 mr-1.5" />
            Salvar
          </Button>
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
            onCheckedChange={(checked) =>
              setFormState(prev => ({ ...prev, shared_account_enabled: checked }))
            }
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
            onCheckedChange={(checked) =>
              setFormState(prev => ({ ...prev, notifications_enabled: checked }))
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
