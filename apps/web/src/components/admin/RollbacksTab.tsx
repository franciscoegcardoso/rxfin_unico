import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Loader2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminAudit } from '@/hooks/useAdminAudit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RollbackRow {
  id: string;
  migration_name: string;
  description: string | null;
  applied_at: string | null;
  is_reversible: boolean;
  rolled_back_at: string | null;
  environment: string | null;
}

export function RollbacksTab() {
  const queryClient = useQueryClient();
  const { logAction } = useAdminAudit();
  const [confirmTarget, setConfirmTarget] = useState<RollbackRow | null>(null);
  const [isReverting, setIsReverting] = useState(false);

  const { data: rollbacks = [], isLoading } = useQuery({
    queryKey: ['admin-rollbacks'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('migration_rollbacks' as any)
        .select('id, migration_name, description, applied_at, is_reversible, rolled_back_at, environment')
        .order('applied_at', { ascending: false }) as any);

      if (error) throw error;
      return (data || []) as RollbackRow[];
    },
  });

  const handleRevert = async () => {
    if (!confirmTarget) return;
    setIsReverting(true);

    try {
      const { data, error } = await supabase.rpc('admin_rollback_migration' as any, {
        _migration_name: confirmTarget.migration_name,
      });

      if (error) throw error;

      const result = data as any;
      if (result && !result.success) {
        throw new Error(result.error || 'Erro ao reverter migration');
      }

      toast.success(`Migration "${confirmTarget.migration_name}" revertida com sucesso`);
      logAction('ROLLBACK_MIGRATION', 'migration_rollbacks', confirmTarget.id, {
        migration_name: confirmTarget.migration_name,
      }, 'critical');

      queryClient.invalidateQueries({ queryKey: ['admin-rollbacks'] });
    } catch (err: any) {
      console.error('Rollback error:', err);
      toast.error(err.message || 'Erro ao reverter migration');
    } finally {
      setIsReverting(false);
      setConfirmTarget(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Rollbacks de Migrations</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie reversões de migrations aplicadas ao banco de dados.
        </p>
      </div>

      {rollbacks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum rollback registrado.
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Migration</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Aplicada em</TableHead>
                <TableHead>Reversível</TableHead>
                <TableHead>Revertida em</TableHead>
                <TableHead className="w-[120px]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rollbacks.map((row) => {
                const isReverted = !!row.rolled_back_at;
                const canRevert = row.is_reversible && !isReverted;

                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      {row.migration_name}
                    </TableCell>
                    <TableCell className="text-sm max-w-[300px]">
                      {row.description || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(row.applied_at)}
                    </TableCell>
                    <TableCell>
                      {row.is_reversible ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                          Sim
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Não
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {isReverted ? (
                        <span className="flex items-center gap-1 text-amber-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {formatDate(row.rolled_back_at)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          Ativa
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canRevert && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setConfirmTarget(row)}
                          className="gap-1.5"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reverter
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar rollback
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a reverter a migration:{' '}
                <strong className="font-mono text-foreground">{confirmTarget?.migration_name}</strong>
              </p>
              {confirmTarget?.description && (
                <p className="text-sm">{confirmTarget.description}</p>
              )}
              <p className="text-destructive font-medium">
                ⚠️ Esta ação pode afetar o funcionamento do sistema. Certifique-se de que entende as consequências.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReverting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevert}
              disabled={isReverting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {isReverting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Revertendo...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Sim, Reverter
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
