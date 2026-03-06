import React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Use narrower max-width for settings/form pages */
  narrow?: boolean;
  /** Use full width with no max constraint */
  fullWidth?: boolean;
}

/**
 * Wrapper padrão de conteúdo de página (desktop). Padrão: largura total.
 * Use narrow para formulários/leitura. Ver PLANO_PADRONIZACAO_LAYOUT_DESKTOP.md.
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
  narrow = false,
  fullWidth = true,
}) => {
  return (
    <div 
      className={cn(
        "w-full max-w-full min-w-0 mx-auto space-y-8",
        narrow 
          ? "md:max-w-3xl" 
          : fullWidth 
            ? "" 
            : "xl:max-w-[95%] 2xl:max-w-[1800px]",
        className
      )}
    >
      {children}
    </div>
  );
};
