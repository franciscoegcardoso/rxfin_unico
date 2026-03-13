import React from 'react';
import { useAdminGate } from '@/hooks/useAdminGate';
import { AdminMfaEnrollment } from './AdminMfaEnrollment';
import { AdminSidebar } from './AdminSidebar';
import { Shield, Loader2, AlertTriangle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AdminPendingChangesProvider } from '@/contexts/AdminPendingChangesContext';
import { AdminPendingChangesBar } from '@/components/admin/AdminPendingChangesBar';
import { AdminSaveConfirmDialog } from '@/components/admin/AdminSaveConfirmDialog';
import { AdminNavigationGuard } from '@/components/admin/AdminNavigationGuard';
import { AdminInfraStatusBar } from '@/components/admin/AdminInfraStatusBar';

interface AdminSecureLayoutProps {
  children: React.ReactNode;
}

export const AdminSecureLayout: React.FC<AdminSecureLayoutProps> = ({ children }) => {
  const { isLoading, isAdmin, isAuthenticated, needsMfa, mfaEnrolled, error, login, logout } = useAdminGate();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verificando credenciais...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Acesso Restrito</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Você não possui permissões para acessar o painel administrativo.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/')}>
          Voltar ao início
        </Button>
      </div>
    );
  }

  if (error && !needsMfa) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive text-center">{error}</p>
        <Button variant="outline" onClick={() => login()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (needsMfa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <AdminMfaEnrollment isEnrolled={mfaEnrolled} onMfaComplete={() => login()} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AdminPendingChangesProvider>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Secure admin bar */}
        <div className="bg-card border-b border-border text-foreground px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-medium">Painel Admin</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground text-xs">Sessão segura (MFA verificado)</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-accent-foreground hover:bg-accent"
            onClick={logout}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair do admin
          </Button>
        </div>

        <AdminInfraStatusBar />
        <AdminPendingChangesBar />

        {/* Sidebar + Content */}
        <div className="flex flex-1 overflow-hidden">
          <AdminSidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>

        <AdminSaveConfirmDialog />
        <AdminNavigationGuard />
      </div>
    </AdminPendingChangesProvider>
  );
};
