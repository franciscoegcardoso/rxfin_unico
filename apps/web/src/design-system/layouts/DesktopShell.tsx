import React from "react";
import { Outlet } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { OnboardingProgressBanner } from "@/components/shared/OnboardingProgressBanner";
import { SecureConnectionBadge } from "@/components/shared/SecureConnectionBadge";
import { ConsentExpiryBanner } from "@/components/sync/ConsentExpiryBanner";
import { useBannerState } from "@/hooks/useBannerState";

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
  const { bannerState, loading: bannerLoading } = useBannerState();
  const showProgress =
    !bannerLoading &&
    (bannerState.banner === "progress_raio_x" || bannerState.banner === "progress_control");

  return (
    <div className="flex flex-row flex-1 w-full h-full overflow-hidden">
      <AppSidebar forceCollapsed={forceCollapsed} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {showProgress && (
          <OnboardingProgressBanner
            placement="inline"
            ctaRoute={
              bannerState.cta_route ??
              (bannerState.banner === "progress_control" ? "/onboarding-control" : "/onboarding")
            }
            ctaLabel={
              bannerState.cta_label ??
              (bannerState.banner === "progress_control"
                ? "Continuar configuração →"
                : "Continuar meu Raio-X →")
            }
            phase={bannerState.phase}
            variant={bannerState.banner === "progress_control" ? "control" : "raio_x"}
          />
        )}
        <div className="flex-1 min-w-0 overflow-y-auto flex flex-col">
          <ConsentExpiryBanner />
          <AppLayout>
            <Outlet />
          </AppLayout>
        </div>
        <footer className="w-full border-t py-2 px-6 flex justify-center shrink-0">
          <SecureConnectionBadge />
        </footer>
      </div>
    </div>
  );
};
