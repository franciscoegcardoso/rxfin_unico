import React from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SecurityTooltipProps {
  className?: string;
}

export const SecurityTooltip: React.FC<SecurityTooltipProps> = ({ className = '' }) => {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors ${className}`}
            aria-label="Informação de segurança"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
          Seus dados financeiros são criptografados na origem e no armazenamento. Sua privacidade é tratada como prioridade técnica.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
