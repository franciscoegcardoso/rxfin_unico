import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAccountPendingChanges } from '@/contexts/AccountPendingChangesContext';
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
import { Button } from '@/components/ui/button';
import { AlertTriangle, Save, Trash2, X } from 'lucide-react';

export function AccountNavigationGuard() {
  const { hasChanges, saveAll, clearAll, isSaving } = useAccountPendingChanges();
  const [showDialog, setShowDialog] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);

  // Intercept link clicks
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (anchor?.href) {
        const url = new URL(anchor.href);
        if (url.origin === window.location.origin && url.pathname !== location.pathname) {
          e.preventDefault();
          e.stopPropagation();
          setPendingPath(url.pathname + url.search);
          setShowDialog(true);
        }
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [hasChanges, location.pathname]);

  // popstate
  useEffect(() => {
    if (!hasChanges) return;
    const handler = () => {
      window.history.pushState(null, '', location.pathname + location.search);
      setShowDialog(true);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [hasChanges, location.pathname, location.search]);

  const handleSaveAndLeave = useCallback(async () => {
    try {
      await saveAll();
      setShowDialog(false);
      if (pendingPath) {
        navigate(pendingPath);
        setPendingPath(null);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    }
  }, [saveAll, pendingPath, navigate]);

  const handleDiscardAndLeave = useCallback(() => {
    clearAll();
    setShowDialog(false);
    if (pendingPath) {
      navigate(pendingPath);
      setPendingPath(null);
    }
  }, [clearAll, pendingPath, navigate]);

  const handleCancel = useCallback(() => {
    setShowDialog(false);
    setPendingPath(null);
  }, []);

  if (!showDialog) return null;

  return (
    <AlertDialog open={showDialog} onOpenChange={(open) => !open && handleCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left">
            Você tem alterações pendentes que não foram salvas. O que deseja fazer?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={handleCancel} className="gap-2" disabled={isSaving}>
            <X className="h-4 w-4" />
            Continuar editando
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={handleDiscardAndLeave}
            className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
            disabled={isSaving}
          >
            <Trash2 className="h-4 w-4" />
            Sair sem salvar
          </Button>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleSaveAndLeave(); }}
            className="gap-2 bg-primary"
            disabled={isSaving}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar e sair'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
