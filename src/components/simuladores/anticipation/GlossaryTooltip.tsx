import React from 'react';
import { HelpCircle, Lightbulb, AlertTriangle, Info, CheckCircle, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GLOSSARY, NoteType } from './types';
import { cn } from '@/lib/utils';

interface GlossaryTooltipProps {
  term: keyof typeof GLOSSARY;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Tooltip educativo que exibe definição de termos financeiros
 * Usado para democratizar o conhecimento técnico
 */
export const GlossaryTooltip: React.FC<GlossaryTooltipProps> = ({ 
  term, 
  children,
  className 
}) => {
  const glossaryEntry = GLOSSARY[term];
  
  if (!glossaryEntry) {
    console.warn(`Termo "${term}" não encontrado no glossário`);
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "inline-flex items-center gap-1 cursor-help border-b border-dashed border-primary/50 hover:border-primary hover:text-primary transition-colors font-medium",
            className
          )}>
            {children || glossaryEntry.term}
            <HelpCircle className="w-3.5 h-3.5 text-primary/60" />
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs p-4 bg-popover border-border shadow-xl rounded-xl"
        >
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">{glossaryEntry.icon}</span>
              <h4 className="font-bold text-sm text-popover-foreground">
                {glossaryEntry.term}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {glossaryEntry.definition}
            </p>
            {glossaryEntry.example && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-primary/90 flex items-start gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="italic">{glossaryEntry.example}</span>
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface ExplanatoryNoteProps {
  type: NoteType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const noteStyles: Record<NoteType, { 
  bg: string; 
  border: string; 
  icon: React.ReactNode; 
  iconColor: string;
  titleColor: string;
}> = {
  info: {
    bg: 'bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent',
    border: 'border-blue-500/30',
    icon: <Info className="w-5 h-5" />,
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-700 dark:text-blue-400'
  },
  tip: {
    bg: 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent',
    border: 'border-amber-500/30',
    icon: <Lightbulb className="w-5 h-5" />,
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-700 dark:text-amber-400'
  },
  warning: {
    bg: 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent',
    border: 'border-red-500/30',
    icon: <AlertTriangle className="w-5 h-5" />,
    iconColor: 'text-red-500',
    titleColor: 'text-red-700 dark:text-red-400'
  },
  success: {
    bg: 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent',
    border: 'border-emerald-500/30',
    icon: <CheckCircle className="w-5 h-5" />,
    iconColor: 'text-emerald-500',
    titleColor: 'text-emerald-700 dark:text-emerald-400'
  }
};

/**
 * Nota explicativa contextual para destacar informações importantes
 * Ajuda o usuário a entender conceitos complexos
 */
export const ExplanatoryNote: React.FC<ExplanatoryNoteProps> = ({
  type,
  title,
  children,
  className
}) => {
  const style = noteStyles[type];
  
  return (
    <div className={cn(
      "p-4 sm:p-5 rounded-2xl border transition-all duration-300",
      style.bg,
      style.border,
      className
    )}>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={cn(
          "mt-0.5 shrink-0 p-2 rounded-xl bg-card/80 border border-border/50",
          style.iconColor
        )}>
          {style.icon}
        </div>
        <div className="space-y-1.5 flex-1 min-w-0">
          {title && (
            <h4 className={cn("font-bold text-sm sm:text-base", style.titleColor)}>
              {title}
            </h4>
          )}
          <div className="text-sm text-muted-foreground leading-relaxed [&>p]:mt-2 first:[&>p]:mt-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

interface QuickTipProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Dica rápida inline para informações menores
 */
export const QuickTip: React.FC<QuickTipProps> = ({ children, className }) => (
  <span className={cn(
    "inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/50",
    className
  )}>
    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
    {children}
  </span>
);
