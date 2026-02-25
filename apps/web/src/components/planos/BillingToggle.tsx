import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { BillingPeriod } from './PlanCard';

interface BillingToggleProps {
  value: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
}

export const BillingToggle: React.FC<BillingToggleProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center justify-center gap-1">
      <div className="inline-flex items-center rounded-full border border-income/30 bg-income/5 p-1">
        <button
          type="button"
          onClick={() => onChange('monthly')}
          className={cn(
            "relative rounded-full px-5 py-2 text-sm font-medium transition-all duration-200",
            value === 'monthly'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => onChange('yearly')}
          className={cn(
            "relative rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 flex items-center gap-2",
            value === 'yearly'
              ? "bg-income text-white shadow-md"
              : "text-income hover:bg-income/10"
          )}
        >
          Anual
          <Badge className="bg-white/20 text-white border-white/30 dark:bg-white/10 dark:text-white dark:border-white/20 text-[10px] px-1.5 py-0">
            Melhor oferta
          </Badge>
        </button>
      </div>
    </div>
  );
};
