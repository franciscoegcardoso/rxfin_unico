import React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, List, TrendingUp, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    label: "Lançar",
    path: "/movimentacoes/extrato",
    icon: Plus,
  },
  {
    label: "Ver Extrato",
    path: "/movimentacoes",
    icon: List,
  },
  {
    label: "Investimentos",
    path: "/bens-investimentos",
    icon: TrendingUp,
  },
  {
    label: "Relatório",
    path: "/relatorio",
    icon: BarChart2,
  },
] as const;

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {ACTIONS.map(({ label, path, icon: Icon }) => (
        <button
          key={path}
          type="button"
          onClick={() => navigate(path)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 min-h-[72px]",
            "hover:bg-accent hover:border-primary transition-colors"
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary p-2">
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-sm text-muted-foreground">{label}</span>
        </button>
      ))}
    </div>
  );
};
