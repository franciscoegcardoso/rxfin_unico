import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ icon: Icon, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col gap-3",
      "md:flex-row md:items-start md:justify-between md:gap-4",
      "pt-6 pb-4",
      "sm:pt-6 sm:pb-5",
      "lg:pt-6 lg:pb-6",
      className
    )}>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-primary md:h-5 md:w-5 flex-shrink-0" aria-hidden />
          <h1 className="text-lg font-semibold text-foreground sm:text-xl lg:text-2xl leading-tight break-words md:truncate">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1 ml-6 md:ml-7">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap md:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
