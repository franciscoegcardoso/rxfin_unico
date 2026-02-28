import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function RollbackPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: rollbacks, isLoading } = useQuery({
    queryKey: ['migration-rollbacks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('migration_rollbacks')
        .select('*')
        .eq('is_reversible', true)
        .is('rolled_back_at', null)
        .order('applied_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (rollbackId: string) => {
      // Marca como revertido (o SQL real precisa ser executado manualmente no SQL Editor)
      const { error } = await supabase
        .from('migration_rollbacks')
        .update({
          rolled_back_at: new Date().toISOString(),
          rolled_back_by: user?.id,
        })
        .eq('id', rollbackId);

      if (error) throw error;

      // Registra no histórico de deploys
      const rollback = rollbacks?.find(r => r.id === rollbackId);
      await supabase.from('deploy_history').insert({
        deploy_type: 'migration',
        environment: rollback?.environment || 'production',
        status: 'completed',
        description: `Rollback: ${rollback?.migration_name}`,
        deployed_by: user?.id,
        rollback_id: rollbackId,
        notes: rollback?.description,
      });
    },
    onSuccess: () => {
      toast.success('Rollback registrado com sucesso!', {
        description: 'Execute o SQL de rollback no SQL Editor do Supabase para concluir.',
      });
      queryClient.invalidateQueries({ queryKey: ['migration-rollbacks'] });
      queryClient.invalidateQueries({ queryKey: ['deploy-history'] });
      setSelectedId(null);
    },
    onError: (error) => {
      toast.error('Erro ao registrar rollback', { description: error.message });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Rollback de Migrations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !rollbacks?.length ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum rollback disponível. Todas as migrations estão estáveis.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                O rollback marca a migration como revertida e gera o SQL necessário. 
                Você deve executar o SQL manualmente no SQL Editor do Supabase.
              </p>
            </div>

            {rollbacks.map(rollback => (
              <div key={rollback.id} className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{rollback.migration_name}</p>
                    {rollback.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{rollback.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {rollback.environment === 'production' ? '🔴 Produção' : '🟡 Staging'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Aplicada em {format(new Date(rollback.applied_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-destructive hover:text-destructive"
                        disabled={rollbackMutation.isPending}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Reverter
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Rollback</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja reverter a migration <strong>{rollback.migration_name}</strong>?
                          <br /><br />
                          O SQL de rollback será exibido para que você execute manualmente no SQL Editor do Supabase.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="max-h-40 overflow-y-auto bg-muted rounded-md p-3">
                        <pre className="text-xs font-mono whitespace-pre-wrap">{rollback.rollback_sql}</pre>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => rollbackMutation.mutate(rollback.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Confirmar Rollback
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
