import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

interface DesktopShellProps {
  userName: string;
  userEmail: string;
}

/**
 * Desktop: barra superior horizontal (logo + menu original) + área principal.
 * Estrutura do anexo 2 — Início, Bens e Investimentos, Lançamentos, Planejamento, etc.
 */
export const DesktopShell: React.FC<DesktopShellProps> = () => {
  const location = useLocation();
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TopNavbar />
      <main className="flex-1 overflow-y-auto min-h-0 pt-14">
        <ErrorBoundary>
          <div
            key={location.pathname}
            className="animate-in fade-in duration-200 ease-out"
          >
            <Outlet />
          </div>
        </ErrorBoundary>
      </main>
    </div>
  );
};
