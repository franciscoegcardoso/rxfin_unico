import { useQuery } from '@tanstack/react-query';
import { Clock, CheckCircle2, XCircle, RotateCcw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export function DeployHistory() {
  const { data: deploys, isLoading } = useQuery({
    queryKey: ['deploy-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deploy_history')
        .select('*')
        .order('deployed_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Histórico de Deploys</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !deploys?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum deploy registrado ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {deploys.map(deploy => {
              const statusConfig = STATUS_CONFIG[deploy.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              const Icon = statusConfig.icon;
              return (
                <div key={deploy.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                  <Icon className={`h-4 w-4 mt-0.5 ${
                    deploy.status === 'completed' ? 'text-emerald-500' :
                    deploy.status === 'failed' ? 'text-destructive' :
                    'text-muted-foreground'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {deploy.description || TYPE_LABELS[deploy.deploy_type] || deploy.deploy_type}
                      </p>
                      <Badge variant={statusConfig.variant} className="text-[10px] shrink-0">
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {TYPE_LABELS[deploy.deploy_type] || deploy.deploy_type}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {deploy.environment === 'production' ? '🔴 Produção' : '🟡 Staging'}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(deploy.deployed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {deploy.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{deploy.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
