import React, { useState } from "react";
import { Eye, EyeOff, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BalanceCardProps {
  balance: number;
  variationPercent: number;
  variationValue: number;
  period: string;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  variationPercent,
  variationValue,
  period,
}) => {
  const [hidden, setHidden] = useState(false);
  const isPositive = variationPercent >= 0;

  const displayBalance = hidden ? "••••••" : balance;
  const displayValue =
    typeof displayBalance === "number"
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(displayBalance)
      : displayBalance;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{period}</p>
          <p
            className={cn(
              "font-numeric font-bold tracking-[-0.02em] leading-none tabular-nums text-foreground text-[40px] md:text-[48px] truncate",
              hidden && "select-none"
            )}
          >
            {displayValue}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 shrink-0 text-income" />
            ) : (
              <TrendingDown className="h-4 w-4 shrink-0 text-expense" />
            )}
            <span
              className={cn(
                "text-sm font-numeric font-semibold tabular-nums tracking-[-0.02em]",
                isPositive ? "text-income" : "text-expense"
              )}
            >
              {hidden
                ? "•••"
                : `${isPositive ? "+" : ""}${variationPercent.toFixed(1)}%`}
              {!hidden && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({variationValue >= 0 ? "+" : ""}
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(variationValue)}{" "}
                  vs mês anterior)
                </span>
              )}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setHidden((h) => !h)}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          aria-label={hidden ? "Mostrar valor" : "Ocultar valor"}
        >
          {hidden ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
};
