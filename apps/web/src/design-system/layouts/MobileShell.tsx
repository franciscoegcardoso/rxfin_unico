import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, getPageTitle, isNavActive } from "./nav-config";

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
          "flex-1 w-full overflow-x-hidden overflow-y-auto min-h-0 pb-20"
        )}
        style={{ paddingBottom: "max(5rem, env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 bg-card border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(location.pathname, item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 min-w-0 transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn("h-5 w-5 shrink-0", active && "text-primary")}
                aria-hidden
              />
              {active && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                  aria-hidden
                />
              )}
              <span className="text-[10px] font-medium truncate max-w-full px-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
