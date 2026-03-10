import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ShellContext } from "@/design-system/layouts/ShellContext";

interface DesktopShellProps {
  userName: string;
  userEmail: string;
}

const shellErrorFallback = (retry: () => void) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
    <div className="w-12 h-12 rounded-full bg-[hsl(var(--color-expense)/0.1)] flex items-center justify-center">
      <span className="text-[hsl(var(--color-expense))] text-xl font-bold">!</span>
    </div>
    <p className="text-[15px] font-semibold text-[hsl(var(--color-text-primary))]">Algo deu errado</p>
    <p className="text-[13px] text-[hsl(var(--color-text-secondary))] text-center max-w-[280px]">
      Recarregue a página para tentar novamente.
    </p>
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        onClick={retry}
        className="text-[13px] font-medium text-[hsl(var(--color-brand-700))] hover:underline"
      >
        Tentar novamente
      </button>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="text-[13px] font-medium text-[hsl(var(--color-brand-700))] hover:underline"
      >
        Recarregar
      </button>
    </div>
  </div>
);

/**
 * DesktopShell — wrapper de rotas autenticadas no desktop.
 * Não renderiza navbar/sidebar própria: o AppLayout (pai) já inclui AppSidebar.
 * Apenas fornece ShellContext (insideShell=true) e ErrorBoundary para o Outlet.
 */
export const DesktopShell: React.FC<DesktopShellProps> = () => {
  const location = useLocation();
  return (
    <ShellContext.Provider value={{ insideShell: true }}>
      <ErrorBoundary key={location.pathname} fallback={shellErrorFallback}>
        <div className="animate-in fade-in duration-200 ease-out w-full max-w-full min-w-0">
          <Outlet />
        </div>
      </ErrorBoundary>
    </ShellContext.Provider>
  );
};
