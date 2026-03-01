import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const v = {
    default: "border-transparent bg-primary/10 text-primary",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    outline: "text-foreground border-border",
  };
  return (
    <div
      className={cn("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium", v[variant], className)}
      {...props}
    />
  );
}

export { Badge };
