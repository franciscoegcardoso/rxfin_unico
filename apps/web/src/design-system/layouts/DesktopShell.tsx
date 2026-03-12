import React from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SecureConnectionBadge } from "@/components/shared/SecureConnectionBadge";

interface DesktopShellProps {
  userName: string;
  userEmail: string;
}

/**
 * DesktopShell — shell das rotas autenticadas no desktop (>= md).
 * Renderiza AppSidebar à esquerda + Outlet à direita em flex-row.
 * Sem key no Outlet para não remontar layouts nested (abas de planejamento, bens, financeiro).
 */
export const DesktopShell: React.FC<DesktopShellProps> = () => {
  return (
    <div className="flex flex-row flex-1 w-full h-full overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </div>
        <footer className="w-full border-t py-2 px-6 flex justify-center shrink-0">
          <SecureConnectionBadge />
        </footer>
      </div>
    </div>
  );
};
