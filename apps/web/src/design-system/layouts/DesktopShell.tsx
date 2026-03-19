import React from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { OnboardingProgressBanner } from "@/components/shared/OnboardingProgressBanner";
import { SecureConnectionBadge } from "@/components/shared/SecureConnectionBadge";

interface DesktopShellProps {
  userName: string;
  userEmail: string;
  /** Quando true (tablet): sidebar sempre colapsada, sem botão de toggle. */
  forceCollapsed?: boolean;
}

/**
 * DesktopShell — shell das rotas autenticadas no desktop (>= md) e tablet.
 * Renderiza AppSidebar à esquerda + Outlet à direita em flex-row.
 */
export const DesktopShell: React.FC<DesktopShellProps> = ({ forceCollapsed }) => {
  return (
    <div className="flex flex-row flex-1 w-full h-full overflow-hidden">
      <AppSidebar forceCollapsed={forceCollapsed} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Banner sticky no topo da área de conteúdo no desktop */}
        <OnboardingProgressBanner placement="inline" />
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
