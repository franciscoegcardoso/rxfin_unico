import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2, X } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  /** Content rendered in the header right area, before the expand button */
  headerRight?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Remove default padding from content */
  noPadding?: boolean;
  /** Show expand button that opens chart in fullscreen dialog */
  expandable?: boolean;
}

/**
 * Stripe-style section card with consistent header styling.
 * Use for grouping related content within a page.
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  children,
  title,
  description,
  icon,
  actions,
  headerRight,
  className,
  contentClassName,
  noPadding = false,
  expandable = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRotateHint, setShowRotateHint] = useState(false);
  const hasHeader = title || icon || actions || headerRight || expandable;

  const dismissHint = useCallback(() => setShowRotateHint(false), []);

  useEffect(() => {
    if (isExpanded) {
      const isSmallScreen = window.matchMedia('(max-width: 767px)').matches;
      if (isSmallScreen) {
        setShowRotateHint(true);
        const timer = setTimeout(() => setShowRotateHint(false), 2500);
        return () => clearTimeout(timer);
      }
    } else {
      setShowRotateHint(false);
    }
  }, [isExpanded]);

  return (
    <>
      <Card className={cn("overflow-hidden", className)}>
        {hasHeader && (
          <CardHeader className="flex flex-row items-center justify-between gap-4 py-4 px-5 border-b bg-muted/30">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <CardTitle className="text-sm font-semibold text-foreground truncate">
                    {title}
                  </CardTitle>
                )}
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              {actions}
              {expandable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsExpanded(true)}
                  title="Expandir gráfico"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
        )}
        <CardContent className={cn(
          noPadding ? "p-0" : "p-5",
          contentClassName
        )}>
          {children}
        </CardContent>
      </Card>

      {expandable && (
        <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
          <DialogContent
            hideCloseButton
            className="max-w-[95vw] w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-6 gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {icon && (
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                )}
                <div>
                  {title ? (
                    <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
                  ) : (
                    <VisuallyHidden><DialogTitle>Gráfico expandido</DialogTitle></VisuallyHidden>
                  )}
                  {description && <p className="text-xs text-muted-foreground">{description}</p>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="relative flex-1 min-h-[250px] max-h-[75vh]">
              <AnimatePresence>
                {showRotateHint && (
                  <motion.div
                    key="rotate-hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-background/85 backdrop-blur-sm rounded-lg cursor-pointer"
                    onClick={dismissHint}
                    onTouchStart={dismissHint}
                  >
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <motion.div
                        animate={{ rotate: [0, 0, -90, -90, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="text-primary"
                      >
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                          <circle cx="12" cy="18" r="0.5" fill="currentColor" />
                        </svg>
                      </motion.div>
                      <p className="text-sm font-medium text-foreground/70">Gire o celular para melhor visualização</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {children}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
