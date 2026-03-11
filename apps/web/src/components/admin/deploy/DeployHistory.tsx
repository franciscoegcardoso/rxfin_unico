import { useQuery } from '@tanstack/react-query';
import { Clock, CheckCircle2, XCircle, RotateCcw, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG = {
  pending: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
  in_progress: { label: 'Em Progresso', variant: 'default' as const, icon: Loader2 },
  completed: { label: 'Concluído', variant: 'default' as const, icon: CheckCircle2 },
  failed: { label: 'Falhou', variant: 'destructive' as const, icon: XCircle },
  rolled_back: { label: 'Revertido', variant: 'outline' as const, icon: RotateCcw },
};

const TYPE_LABELS: Record<string, string> = {
  frontend: 'Frontend',
  migration: 'Migration',
  edge_function: 'Edge Function',
  full: 'Deploy Completo',
};

const VERCEL_STATE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  READY: { label: 'Concluído', variant: 'default', icon: CheckCircle2 },
  BUILDING: { label: 'Em build', variant: 'secondary', icon: Loader2 },
  QUEUED: { label: 'Na fila', variant: 'secondary', icon: Clock },
  INITIALIZING: { label: 'Iniciando', variant: 'secondary', icon: Loader2 },
  ERROR: { label: 'Falhou', variant: 'destructive', icon: XCircle },
  CANCELED: { label: 'Cancelado', variant: 'outline', icon: XCircle },
  DELETED: { label: 'Removido', variant: 'outline', icon: XCircle },
};

interface VercelDeployItem {
  id: string;
  name: string;
  url: string | null;
  state: string;
  created: number;
  branch: string | null;
  commitMessage: string | null;
  target: string | null;
}

export function DeployHistory() {
  const {
    data: vercelData,
    isLoading: vercelLoading,
    refetch: refetchVercel,
    isRefetching: vercelRefetching,
  } = useQuery({
    queryKey: ['vercel-deployments'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<{
        deployments?: VercelDeployItem[];
        error?: string;
      }>('vercel-deployments');
      if (error) throw error;
      return data ?? { deployments: [], error: undefined };
    },
  });

  const { data: dbDeploys } = useQuery({
    queryKey: ['deploy-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deploy_history')
        .select('*')
        .order('deployed_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const deployments = vercelData?.deployments ?? [];
  const vercelError = vercelData?.error;
  const isLoading = vercelLoading;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Histórico de Deploys (Vercel)</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetchVercel()}
          disabled={vercelRefetching || isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${vercelRefetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : vercelError ? (
          <div className="space-y-2 py-4">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {vercelError === 'VERCEL_TOKEN not configured'
                ? 'Configure VERCEL_TOKEN nas variáveis da Edge Function para exibir os deploys da Vercel.'
                : vercelError}
            </p>
            {dbDeploys?.length ? (
              <p className="text-xs text-muted-foreground pt-2">Exibindo apenas registros manuais abaixo.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum deploy para exibir.</p>
            )}
          </div>
        ) : !deployments.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum deploy encontrado no projeto Vercel.
          </p>
        ) : (
          <div className="space-y-3">
            {deployments.map((deploy) => {
              const stateConfig = VERCEL_STATE[deploy.state] ?? {
                label: deploy.state,
                variant: 'secondary' as const,
                icon: Clock,
              };
              const Icon = stateConfig.icon;
              return (
                <div
                  key={deploy.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <Icon
                    className={`h-4 w-4 mt-0.5 shrink-0 ${
                      deploy.state === 'READY' ? 'text-emerald-500' :
                      deploy.state === 'ERROR' ? 'text-destructive' :
                      'text-muted-foreground'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">
                        {deploy.commitMessage || deploy.name || deploy.id}
                      </p>
                      <Badge variant={stateConfig.variant} className="text-[10px] shrink-0">
                        {stateConfig.label}
                      </Badge>
                      {deploy.url && (
                        <a
                          href={deploy.url.startsWith('http') ? deploy.url : `https://${deploy.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary shrink-0"
                          title="Abrir deploy"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {deploy.branch && (
                        <>
                          <span className="text-xs text-muted-foreground">{deploy.branch}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                        </>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(deploy.created), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {deploy.target && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {deploy.target === 'production' ? '🔴 Produção' : '🟡 Preview'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {dbDeploys && dbDeploys.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Registros manuais</p>
            <div className="space-y-2">
              {dbDeploys.map((deploy) => {
                const statusConfig = STATUS_CONFIG[deploy.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                const Icon = statusConfig.icon;
                return (
                  <div key={deploy.id} className="flex items-start gap-3 p-2 rounded-lg border bg-muted/20">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{deploy.description || TYPE_LABELS[deploy.deploy_type] || deploy.deploy_type}</p>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(deploy.deployed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
