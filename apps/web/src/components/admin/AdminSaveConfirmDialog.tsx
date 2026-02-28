import { useAdminPendingChanges, PendingChange } from '@/contexts/AdminPendingChangesContext';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Pencil, Trash2, ToggleLeft, FileText, Crown, FolderOpen, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_ICONS = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  toggle: ToggleLeft,
};

const TYPE_COLORS = {
  create: 'bg-green-500/10 text-green-600 border-green-200',
  update: 'bg-blue-500/10 text-blue-600 border-blue-200',
  delete: 'bg-red-500/10 text-red-600 border-red-200',
  toggle: 'bg-amber-500/10 text-amber-600 border-amber-200',
};

const TYPE_LABELS = {
  create: 'Criar',
  update: 'Atualizar',
  delete: 'Excluir',
  toggle: 'Alterar',
};

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  Página: FileText,
  Plano: Crown,
  Grupo: FolderOpen,
};

function ChangeItem({ change }: { change: PendingChange }) {
  const TypeIcon = TYPE_ICONS[change.type];
  const CategoryIcon = CATEGORY_ICONS[change.category] || FileText;
  
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
        TYPE_COLORS[change.type]
      )}>
        <TypeIcon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs gap-1">
            <CategoryIcon className="h-3 w-3" />
            {change.category}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {TYPE_LABELS[change.type]}
          </Badge>
        </div>
        <p className="text-sm text-foreground">{change.description}</p>
      </div>
    </div>
  );
}

export function AdminSaveConfirmDialog() {
  const { 
    pendingChanges, 
    isConfirmDialogOpen, 
    closeConfirmDialog, 
    saveAllChanges,
    isSaving 
  } = useAdminPendingChanges();

  const deleteCount = pendingChanges.filter(c => c.type === 'delete').length;

  return (
    <AlertDialog open={isConfirmDialogOpen} onOpenChange={closeConfirmDialog}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            Confirmar alterações
            <Badge variant="secondary">{pendingChanges.length}</Badge>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Revise as alterações abaixo antes de salvar. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {deleteCount > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">
              {deleteCount} {deleteCount === 1 ? 'item será excluído' : 'itens serão excluídos'} permanentemente.
            </p>
          </div>
        )}

        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-2">
            {pendingChanges.map(change => (
              <ChangeItem key={change.id} change={change} />
            ))}
          </div>
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              saveAllChanges();
            }}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Confirmar e Salvar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
