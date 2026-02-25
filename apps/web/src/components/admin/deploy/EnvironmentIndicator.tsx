import { Globe, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { detectEnvironment, isStagingConfigured, getCurrentEnvironmentLabel } from '@/lib/environment';

export function EnvironmentIndicator() {
  const env = detectEnvironment();
  const stagingReady = isStagingConfigured();
  const label = getCurrentEnvironmentLabel();

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
      <Globe className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm font-medium">Ambiente Atual</p>
        <p className="text-xs text-muted-foreground">
          {env === 'production'
            ? 'Você está conectado ao banco de dados de produção.'
            : stagingReady
              ? 'Você está conectado ao banco de staging (teste).'
              : 'Staging não configurado — ainda usando produção.'}
        </p>
      </div>
      <Badge
        variant={env === 'production' ? 'destructive' : stagingReady ? 'default' : 'secondary'}
        className="text-xs"
      >
        {label}
      </Badge>
      {env === 'staging' && !stagingReady && (
        <AlertTriangle className="h-4 w-4 text-amber-500" />
      )}
    </div>
  );
}
