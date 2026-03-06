import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";
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
import logoRxfin from "@/assets/logo-rxfin-icon.png";
import logoRxfinWhite from "@/assets/logo-rxfin-white.png";

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
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? logoRxfinWhite : logoRxfin;
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
          "flex flex-col shrink-0 bg-sidebar border-r border-sidebar-border h-screen overflow-hidden transition-all duration-200 ease-in-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* SidebarHeader — enterprise */}
        <div className="border-b border-sidebar-border px-4 py-3 min-h-[60px] shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/inicio")}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 shrink-0"
            >
              <img
                src={logoSrc}
                alt="RXFin"
                className="h-6 w-6 object-contain"
              />
            </button>
            {!collapsed && (
              <span className="font-semibold text-sidebar-foreground text-[15px] tracking-tight">
                RXFin.
              </span>
            )}
          </div>
        </div>

        {/* Nav items — SidebarMenuButton style */}
        <nav className="flex-1 flex flex-col gap-0.5 p-2 overflow-y-auto min-h-0">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(location.pathname, item.path);
            const Icon = item.icon;
            const btn = (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                data-active={active}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-[450] transition-colors duration-150",
                  "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground data-[active=true]:font-semibold",
                  "data-[active=true]:border-l-2 data-[active=true]:border-white/70 data-[active=true]:pl-[10px]"
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

        {/* SidebarFooter — perfil */}
        <div
          className={cn(
            "border-t border-sidebar-border p-3 shrink-0",
            collapsed ? "flex flex-col items-center justify-center" : ""
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors cursor-pointer",
              collapsed ? "justify-center" : ""
            )}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs bg-sidebar-accent text-sidebar-foreground">
                {initials || "?"}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="truncate min-w-0">
                <p className="text-[12px] font-semibold text-sidebar-foreground truncate">
                  {userName || "Usuário"}
                </p>
                <p className="text-[11px] text-sidebar-foreground/60 truncate">
                  {userEmail || ""}
                </p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 ml-auto"
                onClick={onToggle}
                aria-label="Recolher menu"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 mt-1"
              onClick={onToggle}
              aria-label="Expandir menu"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
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
