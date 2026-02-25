import React from 'react';
import { cn } from '@/lib/utils';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Standardized empty state following RXFin Design System.
 * Used when lists, grids, or sections have no data to display.
 * 
 * Reference pattern:
 * - Centered layout with icon in muted background
 * - Clear message: "Você ainda não cadastrou nenhum [item]"
 * - CTA button as link: "Adicionar primeiro [item]"
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div className={cn("py-12 flex flex-col items-center justify-center text-center", className)}>
      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
        {icon || <Package className="h-6 w-6 text-muted-foreground" />}
      </div>
      {title && (
        <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      )}
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button
          variant="link"
          onClick={onAction}
          className="mt-2 text-primary"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
