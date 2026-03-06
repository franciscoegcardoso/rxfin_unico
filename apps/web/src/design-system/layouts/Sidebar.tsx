import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavActive } from "./nav-config";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STORAGE_KEY = "rxfin-sidebar-collapsed";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  userName: string;
  userEmail: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  userName,
  userEmail,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const initials = userName
    .split(" ")
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "flex flex-col shrink-0 bg-card border-r border-border h-screen overflow-hidden transition-all duration-200 ease-in-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-border px-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/inicio")}
            className="flex items-center gap-2 min-w-0 overflow-hidden text-primary font-syne font-bold tracking-tight hover:opacity-90 transition-opacity"
          >
            <span
              className={cn(
                "truncate transition-all duration-200",
                collapsed ? "text-base shrink-0" : "text-xl"
              )}
            >
              {collapsed ? "RX" : "RXFin"}
            </span>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-0.5 p-2 overflow-y-auto min-h-0">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(location.pathname, item.path);
            const Icon = item.icon;
            const btn = (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out",
                  active
                    ? "bg-accent text-accent-foreground border-l-2 border-l-primary"
                    : "text-muted-foreground border-l-2 border-l-transparent hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <span className="truncate text-left">{item.label}</span>
                )}
              </button>
            );
            return collapsed ? (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              btn
            );
          })}
        </nav>

        {/* Footer: Avatar + nome + toggle */}
        <div
          className={cn(
            "flex items-center gap-2 border-t border-border p-2 shrink-0",
            collapsed ? "flex-col justify-center py-3 gap-2" : "px-3 py-2"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 min-w-0",
              collapsed && "flex-col"
            )}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                {initials || "?"}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="truncate min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {userName || "Usuário"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userEmail || ""}
                </p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onToggle}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
};

export function getSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSidebarCollapsed(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // ignore
  }
}
