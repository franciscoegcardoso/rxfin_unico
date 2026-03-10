import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

interface DesktopShellProps {
  userName: string;
  userEmail: string;
}

/** Fallback compartilhado: "Algo deu errado" + Tentar novamente + Recarregar (remonta filhos no retry). */
const shellErrorFallback = (retry: () => void) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
    <div className="w-12 h-12 rounded-full bg-[hsl(var(--color-expense)/0.1)] flex items-center justify-center">
      <span className="text-[hsl(var(--color-expense))] text-xl font-bold">!</span>
    </div>
    <p className="text-[15px] font-semibold text-[hsl(var(--color-text-primary))]">Algo deu errado</p>
    <p className="text-[13px] text-[hsl(var(--color-text-secondary))] text-center max-w-[280px]">Recarregue a página para tentar novamente.</p>
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button type="button" onClick={retry} className="text-[13px] font-medium text-[hsl(var(--color-brand-700))] hover:underline">Tentar novamente</button>
      <button type="button" onClick={() => window.location.reload()} className="text-[13px] font-medium text-[hsl(var(--color-brand-700))] hover:underline">Recarregar</button>
    </div>
  </div>
);

/**
 * Desktop: barra superior horizontal (logo + menu original) + área principal.
 * Estrutura do anexo 2 — Início, Bens e Investimentos, Lançamentos, Planejamento, etc.
 */
export const DesktopShell: React.FC<DesktopShellProps> = () => {
  const location = useLocation();
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background w-full max-w-full">
      <TopNavbar />
      <main className="flex-1 overflow-y-auto min-h-0 min-w-0 w-full max-w-full pt-14">
        <ErrorBoundary fallback={shellErrorFallback}>
          <div
            key={location.pathname}
            className="animate-in fade-in duration-200 ease-out w-full max-w-full min-w-0"
          >
            <Outlet />
          </div>
        </ErrorBoundary>
      </main>
    </div>
  );
};
