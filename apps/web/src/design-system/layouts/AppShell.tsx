import React from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MobileMenuProvider } from "@/contexts/MobileMenuContext";
import { ShellContext } from "./ShellContext";
import { MobileShell } from "./MobileShell";
import { DesktopShell } from "./DesktopShell";

/**
 * App shell: rotas autenticadas.
 * < md: MobileShell (bottom nav), >= md: DesktopShell (sidebar).
 * Rotas públicas ficam fora deste wrapper.
 */
export const AppShell: React.FC = () => {
  const { user } = useAuth();
  const userName =
    (user?.user_metadata?.full_name as string) ||
    user?.email?.split("@")[0] ||
    "Usuário";
  const userEmail = user?.email || "";

  return (
    <ShellContext.Provider value={{ insideShell: true }}>
      <MobileMenuProvider>
        {/* Mobile: visível apenas < md */}
        <div className="md:hidden min-h-screen">
          <MobileShell>
            <Outlet />
          </MobileShell>
        </div>
        {/* Desktop: visível apenas >= md */}
        <div className="hidden md:flex h-screen overflow-hidden bg-background">
          <DesktopShell userName={userName} userEmail={userEmail} />
        </div>
      </MobileMenuProvider>
    </ShellContext.Provider>
  );
};
