import React from 'react';
import { Zap, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FinanceMode } from '@/hooks/useFinanceMode';

interface FinanceModeToggleProps {
  mode: FinanceMode;
  onChangeMode: (mode: FinanceMode) => void;
}

export const FinanceModeToggle: React.FC<FinanceModeToggleProps> = ({
  mode,
  onChangeMode,
}) => {
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/60 border">
      <button
        onClick={() => onChangeMode('openfinance')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
          mode === 'openfinance'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        <Zap className="h-3 w-3" />
        Automático
      </button>
      <button
        onClick={() => onChangeMode('manual')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
          mode === 'manual'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        <FileUp className="h-3 w-3" />
        Manual
      </button>
    </div>
  );
};
