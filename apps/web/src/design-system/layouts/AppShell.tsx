import React from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePageTracking } from "@/hooks/usePageTracking";
import { MobileMenuProvider } from "@/contexts/MobileMenuContext";
import { ShellContext } from "./ShellContext";
import { MobileShell } from "./MobileShell";
import { DesktopShell } from "./DesktopShell";
import { useIsMobile } from "@/hooks/use-mobile";
import { AccountNavigationGuard } from "@/components/account/AccountNavigationGuard";

/**
 * App shell: rotas autenticadas.
 * Renderização condicional (useIsMobile) garante um único <Outlet /> montado por vez.
 * Sem key no Outlet para não remontar layouts nested ao trocar de aba.
 * < md: MobileShell (bottom nav), >= md: DesktopShell (sidebar).
 */
export const AppShell: React.FC = () => {
  const { user } = useAuth();
  usePageTracking();
  const isMobile = useIsMobile();
  const userName =
    (user?.user_metadata?.full_name as string) ||
    user?.email?.split("@")[0] ||
    "Usuário";
  const userEmail = user?.email || "";

  return (
    <ShellContext.Provider value={{ insideShell: true }}>
      <AccountNavigationGuard />
      <MobileMenuProvider>
        <ScrollRestoration />
        {isMobile ? (
          <main id="main-content" className="min-h-screen">
            <MobileShell>
              <Outlet />
            </MobileShell>
          </main>
        ) : (
          <div className="flex h-screen overflow-hidden bg-background">
            <DesktopShell userName={userName} userEmail={userEmail} />
          </div>
        )}
      </MobileMenuProvider>
    </ShellContext.Provider>
  );
};
