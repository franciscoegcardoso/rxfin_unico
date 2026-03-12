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

  const normalizePath = (path: string) => path.replace(/\/+$/, '') || '/';
  const isMinhaConta = normalizePath(location.pathname) === '/minha-conta';
  const isOnSimulatorPage = location.pathname.startsWith('/simuladores');
  const isOnPlanejamentoPage = location.pathname.startsWith('/planejamento');

  // Rotas para as quais nunca bloqueamos (configurações) — evita usuário preso ao sair de simuladores/etc.
  const SETTINGS_PATH_PREFIXES = ['/minha-conta', '/parametros', '/instituicoes-financeiras', '/configuracoes-fiscais', '/financeiro', '/configuracoes-hub'];
  const isTargetSettings = (targetPath: string) =>
    SETTINGS_PATH_PREFIXES.some((p) => targetPath === p || targetPath.startsWith(p + '/'));

  // Intercept link clicks apenas quando há alterações E não estamos em Minha Conta.
  // Nunca ativamos o guard em páginas de simulador ou planejamento: permite trocar abas e sair sem travar.
  useEffect(() => {
    if (!hasChanges || isMinhaConta || isOnSimulatorPage || isOnPlanejamentoPage) return;
    const handler = (e: MouseEvent) => {
      const currentPathFromWindow = normalizePath(window.location.pathname);
      if (currentPathFromWindow === '/minha-conta' || currentPathFromWindow.startsWith('/simuladores') || currentPathFromWindow.startsWith('/planejamento')) return;
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor?.href) return;
      const url = new URL(anchor.href);
      const sameOrigin = url.origin === window.location.origin;
      const currentPath = normalizePath(location.pathname);
      const targetPath = normalizePath(url.pathname);
      if (currentPath === '/minha-conta' || isTargetSettings(targetPath)) return;
      if (sameOrigin && targetPath !== currentPath) {
        e.preventDefault();
        e.stopPropagation();
        setPendingPath(url.pathname + url.search);
        setShowDialog(true);
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [hasChanges, isMinhaConta, isOnSimulatorPage, isOnPlanejamentoPage, location.pathname]);

  // popstate (voltar/avançar) — não bloqueia em Minha Conta, simulador ou planejamento
  useEffect(() => {
    if (!hasChanges || isMinhaConta || isOnSimulatorPage || isOnPlanejamentoPage) return;
    const handler = () => {
      window.history.pushState(null, '', location.pathname + location.search);
      setShowDialog(true);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [hasChanges, isMinhaConta, isOnSimulatorPage, isOnPlanejamentoPage, location.pathname, location.search]);

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
