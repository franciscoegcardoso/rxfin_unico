import React from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePageTracking } from "@/hooks/usePageTracking";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { MobileMenuProvider } from "@/contexts/MobileMenuContext";
import { ShellContext } from "./ShellContext";
import { MobileShell } from "./MobileShell";
import { DesktopShell } from "./DesktopShell";
import { AccountNavigationGuard } from "@/components/account/AccountNavigationGuard";

const SHELL_KEY = 'rxfin-shell';

/**
 * App shell: rotas autenticadas.
 * Três breakpoints: mobile (<768), tablet (768–1023), desktop (>=1024).
 * Key estável evita desmonte do Outlet ao mudar breakpoint.
 */
export const AppShell: React.FC = () => {
  const { user } = useAuth();
  usePageTracking();
  const breakpoint = useBreakpoint();
  const userName =
    (user?.user_metadata?.full_name as string) ||
    user?.email?.split("@")[0] ||
    "Usuário";
  const userEmail = user?.email || "";

  if (breakpoint === 'mobile') {
    return (
      <ShellContext.Provider value={{ insideShell: true }}>
        <AccountNavigationGuard />
        <MobileMenuProvider>
          <div key={SHELL_KEY} className="min-h-screen">
            <MobileShell>
              <Outlet />
            </MobileShell>
          </div>
        </MobileMenuProvider>
      </ShellContext.Provider>
    );
  }

  if (breakpoint === 'tablet') {
    return (
      <ShellContext.Provider value={{ insideShell: true }}>
        <AccountNavigationGuard />
        <MobileMenuProvider>
          <div key={SHELL_KEY} className="flex h-screen overflow-hidden bg-background">
            <DesktopShell userName={userName} userEmail={userEmail} forceCollapsed />
          </div>
        </MobileMenuProvider>
      </ShellContext.Provider>
    );
  }

  return (
    <ShellContext.Provider value={{ insideShell: true }}>
      <AccountNavigationGuard />
      <MobileMenuProvider>
        <div key={SHELL_KEY} className="flex h-screen overflow-hidden bg-background">
          <DesktopShell userName={userName} userEmail={userEmail} />
        </div>
      </MobileMenuProvider>
    </ShellContext.Provider>
  );
};
