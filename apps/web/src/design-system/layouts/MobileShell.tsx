import React from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ThemedLogo } from "@/components/ui/themed-logo";

interface MobileShellProps {
  children: React.ReactNode;
}

export const MobileShell: React.FC<MobileShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

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

      {/* Conteúdo: pt-14 para não ficar sob o header fixo; pb = altura do menu + safe-area para nada ficar atrás do menu */}
      <main
        className={cn(
          "flex-1 w-full overflow-x-hidden overflow-y-auto min-h-0 pt-14 md:pb-0"
        )}
        style={{
          paddingBottom: "max(5rem, calc(4rem + env(safe-area-inset-bottom)))",
        }}
      >
        <ErrorBoundary>
          <div
            key={location.pathname}
            className="animate-in fade-in duration-200 ease-out"
          >
            {children}
          </div>
        </ErrorBoundary>
      </main>

      <BottomNavigation />
    </div>
  );
}
