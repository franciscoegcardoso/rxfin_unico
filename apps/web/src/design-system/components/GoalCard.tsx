import React from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export type GoalStatus = "on_track" | "attention" | "overdue" | "future";

export interface GoalCardProps {
  title: string;
  currentValue: number;
  targetValue: number;
  deadline: string;
  category: string;
  /** If not provided, can be derived from deadlineIso */
  status?: GoalStatus;
  /** ISO date string for automatic status (on_track / attention &lt; 30 days / overdue) */
  deadlineIso?: string;
  onDepositClick?: () => void;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);

function deriveStatus(deadlineIso: string | undefined): GoalStatus | undefined {
  if (!deadlineIso) return undefined;
  const deadline = new Date(deadlineIso);
  const now = new Date();
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= 30) return "attention";
  return "on_track";
}

export const GoalCard: React.FC<GoalCardProps> = ({
  title,
  currentValue,
  targetValue,
  deadline,
  category,
  status: statusProp,
  deadlineIso,
  onDepositClick,
}) => {
  const status = statusProp ?? deriveStatus(deadlineIso) ?? "on_track";
  const pct =
    targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;

  const statusColor =
    status === "on_track"
      ? "text-income"
      : status === "attention"
        ? "text-warning"
        : status === "overdue"
          ? "text-expense"
          : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-foreground truncate">{title}</p>
        <span className="shrink-0 text-xs rounded-full bg-primary/10 text-primary px-2 py-1">
          {category}
        </span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2 mt-2">
        <span className="font-sans font-semibold tabular-nums tracking-tight text-income">
          {formatBRL(currentValue)}
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatBRL(targetValue)}
        </span>
      </div>
      <div
        className={cn(
          "flex items-center gap-1.5 mt-1.5 text-xs",
          statusColor
        )}
      >
        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{deadline || "Sem prazo"}</span>
      </div>
      <button
        type="button"
        onClick={onDepositClick ?? (() => {})}
        className="mt-3 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-3 py-1 text-sm font-medium transition-colors"
      >
        Depósito rápido
      </button>
    </div>
  );
};
