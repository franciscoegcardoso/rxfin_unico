import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPageTitle } from "./nav-config";
import { BottomNavigation } from "@/components/BottomNavigation";

interface MobileShellProps {
  children: React.ReactNode;
}

export const MobileShell: React.FC<MobileShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const title = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header contextual: título da rota + Bell */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between bg-card border-b border-border px-4">
        <h1 className="text-lg font-semibold text-foreground truncate">
          {title}
        </h1>
        <button
          type="button"
          onClick={() => navigate("/notificacoes")}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
        </button>
      </header>

      {/* Conteúdo: pb-20 para não sobrepor a bottom nav */}
      <main
        className={cn(
          "flex-1 w-full overflow-x-hidden overflow-y-auto min-h-0 pb-20 md:pb-0"
        )}
        style={{ paddingBottom: "max(5rem, env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>

      <BottomNavigation />
    </div>
  );
}
