import { LucideIcon, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  icon?: LucideIcon | React.ReactNode;
  title: string;
  subtitle?: string;
  /** Alias para subtitle; usado por páginas de simuladores (ex.: Renegociação de Dívidas). */
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  /** Mostra botão Voltar (default: true). Use false em páginas raiz como /inicio. */
  showBackButton?: boolean;
  /** Se definido, o botão Voltar navega para este path em vez de history -1 ou /inicio. */
  backTo?: string;
  /** Rótulo do destino do Voltar (ex.: "Simuladores") para acessibilidade. */
  backLabel?: string;
}

export function PageHeader({
  icon: iconProp,
  title,
  subtitle,
  description,
  actions,
  className,
  showBackButton = true,
  backTo,
  backLabel,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const subtitleText = subtitle ?? description;

  const handleBack = () => {
    if (backTo != null && backTo !== "") {
      navigate(backTo);
    } else if (typeof window !== "undefined" && (window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
    } else {
      navigate("/inicio");
    }
  };

  const isIconComponent = typeof iconProp === "function";

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
          {showBackButton && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 -ml-2"
              onClick={handleBack}
              aria-label={backLabel ? `Voltar para ${backLabel}` : "Voltar"}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Button>
          )}
          {iconProp != null && (
            isIconComponent ? (
              (() => {
                const Icon = iconProp as LucideIcon;
                return <Icon className="h-4 w-4 text-primary md:h-5 md:w-5 flex-shrink-0" aria-hidden />;
              })()
            ) : (
              <div className="h-4 w-4 text-primary md:h-5 md:w-5 flex-shrink-0 [&>svg]:h-4 [&>svg]:w-4 md:[&>svg]:h-5 md:[&>svg]:w-5" aria-hidden>
                {iconProp}
              </div>
            )
          )}
          <h1 className="text-lg font-semibold text-foreground sm:text-xl lg:text-2xl leading-tight break-words md:truncate">
            {title}
          </h1>
        </div>
        {subtitleText && (
          <p className="text-xs text-muted-foreground mt-1 ml-6 md:ml-7">
            {subtitleText}
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
