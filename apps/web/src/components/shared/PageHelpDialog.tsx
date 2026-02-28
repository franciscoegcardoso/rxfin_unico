import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle, Lightbulb, Target, Wrench, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface PageHelpContent {
  title: string;
  description: string;
  whatIs: string;
  whatDoes: string;
  whatSolves: string;
  importance: string;
  icon?: React.ReactNode;
}

interface PageHelpDialogProps {
  content: PageHelpContent;
  className?: string;
  variant?: 'icon' | 'button';
}

interface HelpSectionProps {
  icon: React.ReactNode;
  title: string;
  content: string;
  color: string;
  delay: number;
}

const HelpSection: React.FC<HelpSectionProps> = ({ icon, title, content, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    className={cn(
      "p-4 rounded-xl border bg-card/50 backdrop-blur-sm",
      "hover:shadow-md transition-shadow duration-200"
    )}
  >
    <div className="flex items-start gap-3">
      <div className={cn(
        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
        color
      )}>
        {icon}
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold text-sm text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
      </div>
    </div>
  </motion.div>
);

export const PageHelpDialog: React.FC<PageHelpDialogProps> = ({ 
  content, 
  className,
  variant = 'icon' 
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'icon' ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10",
              className
            )}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2", className)}
          >
            <HelpCircle className="h-4 w-4" />
            Ajuda
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            {content.icon && (
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                {content.icon}
              </div>
            )}
            <div>
              <span>{content.title}</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                {content.description}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          <HelpSection
            icon={<Lightbulb className="h-5 w-5 text-amber-600" />}
            title="O que é?"
            content={content.whatIs}
            color="bg-amber-100 dark:bg-amber-900/30"
            delay={0.1}
          />
          
          <HelpSection
            icon={<Wrench className="h-5 w-5 text-blue-600" />}
            title="O que faz?"
            content={content.whatDoes}
            color="bg-blue-100 dark:bg-blue-900/30"
            delay={0.2}
          />
          
          <HelpSection
            icon={<Target className="h-5 w-5 text-emerald-600" />}
            title="O que resolve?"
            content={content.whatSolves}
            color="bg-emerald-100 dark:bg-emerald-900/30"
            delay={0.3}
          />
          
          <HelpSection
            icon={<Star className="h-5 w-5 text-purple-600" />}
            title="Por que é importante?"
            content={content.importance}
            color="bg-purple-100 dark:bg-purple-900/30"
            delay={0.4}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
