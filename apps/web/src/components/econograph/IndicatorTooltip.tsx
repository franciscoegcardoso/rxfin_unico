import React from 'react';
import { Info } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { INDICATOR_EDUCATION, CATEGORY_INFO } from './educationalContent';
import { cn } from '@/lib/utils';

interface IndicatorTooltipProps {
  indicatorKey: string;
  children: React.ReactNode;
}

export const IndicatorTooltip: React.FC<IndicatorTooltipProps> = ({ indicatorKey, children }) => {
  const education = INDICATOR_EDUCATION[indicatorKey];
  
  if (!education) return <>{children}</>;
  
  const categoryInfo = CATEGORY_INFO[education.category];
  
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 p-0 overflow-hidden" 
        side="right" 
        align="start"
        sideOffset={8}
      >
        {/* Header */}
        <div className={cn("px-4 py-3", categoryInfo.bgColor)}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{education.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-foreground">{education.shortName}</h4>
                <Badge variant="outline" className={cn("text-[10px]", categoryInfo.color)}>
                  {categoryInfo.name}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{education.fullName}</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              O que é?
            </h5>
            <p className="text-sm text-foreground leading-relaxed">
              {education.whatIs}
            </p>
          </div>
          
          <div>
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Impacto no seu bolso
            </h5>
            <p className="text-sm text-foreground leading-relaxed">
              {education.impact}
            </p>
          </div>
          
          <div className="pt-2 border-t">
            <h5 className="text-xs font-semibold text-primary flex items-center gap-1 mb-1">
              <Info className="h-3 w-3" />
              Como interpretar
            </h5>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {education.interpretation}
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
