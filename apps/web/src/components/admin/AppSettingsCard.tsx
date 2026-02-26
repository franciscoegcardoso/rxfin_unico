import { useState, useEffect } from 'react';
import { Construction } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAdminDeferredMutations } from '@/hooks/useAdminDeferredMutations';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export function AppSettingsCard() {
  const { settings, isLoading } = useAppSettings();
  const { deferUpdateSettings } = useAdminDeferredMutations();
  const [fallbackRoute, setFallbackRoute] = useState('');

  useEffect(() => {
    if (settings?.coming_soon_fallback_route) {
      setFallbackRoute(settings.coming_soon_fallback_route);
    }
  }, [settings]);

  const handleBlur = () => {
    if (fallbackRoute !== settings?.coming_soon_fallback_route) {
      deferUpdateSettings(
        { coming_soon_fallback_route: fallbackRoute },
        `Alterar rota de fallback para "${fallbackRoute}"`
      );
      toast.info('Alteração adicionada para revisão');
    }
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
          <Input
            id="fallback-route"
            value={fallbackRoute}
            onChange={(e) => setFallbackRoute(e.target.value)}
            onBlur={handleBlur}
            placeholder="/simuladores"
            className="flex-1 max-w-md"
          />
          <p className="text-xs text-muted-foreground">
            Define para onde os botões "Voltar" e "Ir para Início" redirecionam na página de funcionalidades bloqueadas
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
