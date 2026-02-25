import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminPendingChanges } from '@/contexts/AdminPendingChangesContext';
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

export function AdminNavigationGuard() {
  const { 
    hasChanges, 
    pendingChanges,
    saveAllChanges, 
    clearChanges,
    isSaving 
  } = useAdminPendingChanges();

  const [showDialog, setShowDialog] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle browser back/forward and tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Intercept link clicks to block navigation
  useEffect(() => {
    if (!hasChanges) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor && anchor.href) {
        const url = new URL(anchor.href);
        // Only intercept internal navigation
        if (url.origin === window.location.origin && url.pathname !== location.pathname) {
          e.preventDefault();
          e.stopPropagation();
          setPendingPath(url.pathname + url.search);
          setShowDialog(true);
        }
      }
    };

    // Use capture phase to intercept before React Router handles it
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [hasChanges, location.pathname]);

  // Handle popstate (browser back/forward)
  useEffect(() => {
    if (!hasChanges) return;

    const handlePopState = (e: PopStateEvent) => {
      // Push current state back to prevent navigation
      window.history.pushState(null, '', location.pathname + location.search);
      setShowDialog(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasChanges, location.pathname, location.search]);

  const handleSaveAndLeave = useCallback(async () => {
    try {
      await saveAllChanges();
      setShowDialog(false);
      if (pendingPath) {
        navigate(pendingPath);
        setPendingPath(null);
      }
    } catch (error) {
      console.error('Failed to save changes:', error);
    }
  }, [saveAllChanges, pendingPath, navigate]);

  const handleDiscardAndLeave = useCallback(() => {
    clearChanges();
    setShowDialog(false);
    if (pendingPath) {
      navigate(pendingPath);
      setPendingPath(null);
    }
  }, [clearChanges, pendingPath, navigate]);

  const handleCancel = useCallback(() => {
    setShowDialog(false);
    setPendingPath(null);
  }, []);

  if (!showDialog) {
    return null;
  }

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
            Você tem <strong>{pendingChanges.length}</strong> {pendingChanges.length === 1 ? 'alteração pendente' : 'alterações pendentes'} que não foram salvas.
            O que deseja fazer?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            onClick={handleCancel}
            className="gap-2"
            disabled={isSaving}
          >
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
            onClick={(e) => {
              e.preventDefault();
              handleSaveAndLeave();
            }}
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
