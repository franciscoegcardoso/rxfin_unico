import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InvestmentCardProps {
  name: string;
  /** Linha secundária (ticker ação, subtype CDB, etc.) */
  detailLine?: string;
  ticker?: string;
  logoUrl?: string | null;
  currentValue: number;
  returnPercent: number;
  returnValue: number;
  category: string;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(value);

export const InvestmentCard: React.FC<InvestmentCardProps> = ({
  name,
  detailLine,
  ticker,
  logoUrl,
  currentValue,
  returnPercent,
  returnValue,
  category,
}) => {
  const isPositive = returnPercent >= 0;
  const sub = detailLine ?? ticker;
  const initial = name?.trim()?.charAt(0)?.toUpperCase() ?? '?';
  const [imgOk, setImgOk] = React.useState(!!logoUrl);
  React.useEffect(() => {
    setImgOk(!!logoUrl);
  }, [logoUrl]);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        {logoUrl && imgOk ? (
          <img
            src={logoUrl}
            alt=""
            className="w-9 h-9 rounded-full object-contain bg-white shrink-0 border border-border/50"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">{name}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <span className="shrink-0 text-xs rounded-full bg-primary/10 text-primary px-2 py-1">{category}</span>
        </div>
      </div>
      <p className="font-sans font-semibold tabular-nums tracking-tight text-foreground text-lg mt-2">{formatBRL(currentValue)}</p>
      <div className="flex items-center gap-1.5 mt-1.5">
        {isPositive ? <TrendingUp className="h-4 w-4 shrink-0 text-income" /> : <TrendingDown className="h-4 w-4 shrink-0 text-expense" />}
        <span className={cn("text-sm font-medium tabular-nums", isPositive ? "text-income" : "text-expense")}>
          {isPositive ? "+" : ""}{returnPercent.toFixed(2)}% ({isPositive ? "+" : ""}{formatBRL(returnValue)})
        </span>
      </div>
    </div>
  );
};
