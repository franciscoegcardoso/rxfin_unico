import React from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { OnboardingProgressBanner } from "@/components/shared/OnboardingProgressBanner";
import { ConsentExpiryBanner } from "@/components/sync/ConsentExpiryBanner";
import { ThemedLogo } from "@/components/ui/themed-logo";
import { useBannerState } from "@/hooks/useBannerState";

interface MobileShellProps {
  children: React.ReactNode;
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

export const MobileShell: React.FC<MobileShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { bannerState, loading: bannerLoading } = useBannerState();
  const showBanner =
    !bannerLoading &&
    (bannerState.banner === "progress_raio_x" || bannerState.banner === "progress_control");
  const mainPt = bannerLoading ? "pt-[104px]" : showBanner ? "pt-[104px]" : "pt-14";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header fixo: logo RXFin + notificações (não rola com o conteúdo) */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 shrink-0 items-center justify-between bg-card border-b border-border px-4">
        <Link to="/inicio" className="flex items-center shrink-0" aria-label="RXFin - Início">
          <ThemedLogo className="h-8 w-8 object-contain" />
        </Link>
        <button
          type="button"
          onClick={() => navigate("/notificacoes")}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
        </button>
      </header>

      {showBanner && (
        <OnboardingProgressBanner
          placement="below-header"
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

      {/* Conteúdo: pt-14 ou pt para header+banner; pb = altura do menu + safe-area */}
      <main
        className={cn(
          "flex-1 w-full overflow-x-hidden overflow-y-auto min-h-0 md:pb-0",
          mainPt
        )}
        style={{
          paddingBottom: "max(5rem, calc(4rem + env(safe-area-inset-bottom)))",
        }}
      >
        <ErrorBoundary key={location.pathname} fallback={shellErrorFallback}>
          <div className="animate-in fade-in duration-200 ease-out">
            <ConsentExpiryBanner />
            <AppLayout>{children}</AppLayout>
          </div>
        </ErrorBoundary>
      </main>

      <BottomNavigation />
    </div>
  );
}
