import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";

interface DesktopShellProps {
  userName: string;
  userEmail: string;
}

/**
 * DesktopShell — shell das rotas autenticadas no desktop (>= md).
 * Renderiza AppSidebar à esquerda + Outlet à direita em flex-row.
 * key={location.pathname} garante que o conteúdo seja remontado ao mudar de rota,
 * corrigindo travamento de navegação em páginas dentro de grupos (planejamento, controles, simuladores).
 */
export const DesktopShell: React.FC<DesktopShellProps> = () => {
  const location = useLocation();
  return (
    <div className="flex flex-row flex-1 w-full h-full overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-y-auto">
          <Outlet key={location.pathname} />
        </div>
      </div>
    </div>
  );
};
