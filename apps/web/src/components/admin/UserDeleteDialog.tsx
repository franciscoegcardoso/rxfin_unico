import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2, Database, ShieldAlert } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface UserDeleteDialogProps {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  isProtected: boolean;
  isAdmin: boolean;
  onSuccess?: () => void;
}

interface DeletionResult {
  success: boolean;
  deleted_user_id: string;
  deleted_email: string;
  data_preserved_tables: Record<string, number>;
  total_records_preserved: number;
}

export function UserDeleteDialog({
  userId,
  userName,
  userEmail,
  isProtected,
  isAdmin,
  onSuccess,
}: UserDeleteDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [result, setResult] = useState<DeletionResult | null>(null);

  const canDelete = !isProtected && user?.id !== userId;
  const emailMatches = confirmEmail.toLowerCase() === (userEmail?.toLowerCase() || '');

  const handleDelete = async () => {
    if (!user?.id || !emailMatches) return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.rpc('admin_delete_user', {
        target_user_id: userId,
        admin_user_id: user.id,
      });

      if (error) throw error;

      const deletionResult = data as unknown as DeletionResult;
      setResult(deletionResult);
      
      toast.success('Usuário excluído com sucesso', {
        description: `${deletionResult.total_records_preserved} registros preservados no sistema.`,
      });

      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onSuccess?.();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir usuário', {
        description: error.message || 'Tente novamente.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setConfirmEmail('');
      setResult(null);
    }
  };

  if (!canDelete) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        disabled
        title={isProtected ? 'Admin protegido' : 'Não pode excluir a si mesmo'}
      >
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          title="Excluir usuário"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        {!result ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Excluir Usuário
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    Você está prestes a excluir o usuário:
                  </p>
                  
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <p className="font-medium">{userName || 'Sem nome'}</p>
                    <p className="text-sm text-muted-foreground">{userEmail}</p>
                    <p className="text-xs font-mono text-muted-foreground">{userId}</p>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <div className="flex gap-2">
                      <Database className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        <p className="font-medium">Governança de Dados</p>
                        <p className="mt-1 text-xs">
                          Os dados do usuário serão <strong>preservados</strong> para fins de auditoria e integridade do sistema. 
                          O perfil será anonimizado (soft delete) e o usuário perderá acesso ao sistema.
                        </p>
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-600">
                        Este usuário é administrador. Os privilégios serão removidos.
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="confirm-email" className="text-foreground">
                      Digite o email para confirmar:
                    </Label>
                    <Input
                      id="confirm-email"
                      placeholder={userEmail || 'email@exemplo.com'}
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting || !emailMatches}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Confirmar Exclusão
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-green-600">
                ✓ Usuário Excluído
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    O usuário <strong>{result.deleted_email}</strong> foi excluído com sucesso.
                  </p>

                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium">Registros Preservados:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(result.data_preserved_tables).map(([table, count]) => (
                        <Badge key={table} variant="secondary" className="text-xs">
                          {table}: {count}
                        </Badge>
                      ))}
                      {Object.keys(result.data_preserved_tables).length === 0 && (
                        <span className="text-xs text-muted-foreground">
                          Nenhum registro encontrado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Total: {result.total_records_preserved} registros
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => handleOpenChange(false)}>
                Fechar
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
