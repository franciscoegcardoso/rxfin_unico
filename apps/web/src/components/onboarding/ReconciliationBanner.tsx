import React from 'react';
import { CheckCircle2, RefreshCw, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReconciliationItem {
  label: string;
  detail?: string;
  icon?: React.ReactNode;
}

interface ReconciliationBannerProps {
  title: string;
  description: string;
  items: ReconciliationItem[];
  onUseExisting: () => void;
  onReconfigure?: () => void;
  useExistingLabel?: string;
  reconfigureLabel?: string;
  className?: string;
}

export const ReconciliationBanner: React.FC<ReconciliationBannerProps> = ({
  title,
  description,
  items,
  onUseExisting,
  onReconfigure,
  useExistingLabel = 'Usar dados existentes',
  reconfigureLabel = 'Refazer esta etapa',
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-primary/20 bg-primary/5 p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>

      {/* Items encontrados */}
      <div className="space-y-2 mb-5">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-background border border-border"
          >
            {item.icon ?? (
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {item.label}
              </p>
              {item.detail && (
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              )}
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </div>
        ))}
      </div>

      {/* Ações */}
      <div className="flex flex-col gap-2">
        <Button variant="hero" className="w-full" onClick={onUseExisting}>
          {useExistingLabel}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
        {onReconfigure && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={onReconfigure}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            {reconfigureLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
