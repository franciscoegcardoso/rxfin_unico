import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { AppSidebar } from "@/components/layout/AppSidebar";

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
 * DesktopShell — shell das rotas autenticadas no desktop (>= md).
 * Renderiza AppSidebar à esquerda + Outlet à direita em flex-row.
 * insideShell=true é fornecido pelo AppShell pai.
 */
export const DesktopShell: React.FC<DesktopShellProps> = () => {
  const location = useLocation();
  return (
    <div className="flex flex-row flex-1 w-full h-full overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <ErrorBoundary key={location.pathname} fallback={shellErrorFallback}>
          <div className="animate-in fade-in duration-200 ease-out w-full h-full overflow-y-auto">
            <Outlet />
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
};
