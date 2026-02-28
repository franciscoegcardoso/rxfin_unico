import React from 'react';
import { motion } from 'framer-motion';
import { Info, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CHART_INTERPRETATION_GUIDE } from './educationalContent';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChartGuideProps {
  tab: 'overview' | 'portfolio';
  className?: string;
}

export const ChartGuide: React.FC<ChartGuideProps> = ({ tab, className }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const guide = CHART_INTERPRETATION_GUIDE[tab];
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn("border-dashed border-primary/30 bg-primary/5", className)}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-4 h-auto hover:bg-transparent"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {guide.title}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {isOpen ? 'Ocultar' : 'Ver dicas'}
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="grid gap-2">
              {guide.points.map((point, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-3 p-2 rounded-lg bg-background/50"
                >
                  <span className="text-lg shrink-0">{point.icon}</span>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {point.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
