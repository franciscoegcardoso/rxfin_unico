import { useState, useEffect } from 'react';
import { Construction, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Skeleton } from '@/components/ui/skeleton';

export function AppSettingsCard() {
  const { settings, isLoading, updateSetting, isUpdating } = useAppSettings();
  const [fallbackRoute, setFallbackRoute] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings?.coming_soon_fallback_route) {
      setFallbackRoute(settings.coming_soon_fallback_route);
    }
  }, [settings]);

  useEffect(() => {
    setHasChanges(fallbackRoute !== settings?.coming_soon_fallback_route);
  }, [fallbackRoute, settings]);

  const handleSave = () => {
    updateSetting({
      key: 'coming_soon_fallback_route',
      value: fallbackRoute,
    });
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
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Construction className="h-5 w-5" />
          Página "Em Construção"
        </CardTitle>
        <CardDescription>
          Configure o comportamento da página exibida para funcionalidades não disponíveis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fallback-route">Rota de Fallback dos Botões</Label>
          <div className="flex gap-2">
            <Input
              id="fallback-route"
              value={fallbackRoute}
              onChange={(e) => setFallbackRoute(e.target.value)}
              placeholder="/simuladores"
              className="flex-1 max-w-md"
            />
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || isUpdating}
              size="sm"
            >
              <Save className="h-4 w-4 mr-1" />
              Salvar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Define para onde os botões "Voltar" e "Ir para Início" redirecionam na página de funcionalidades bloqueadas
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
