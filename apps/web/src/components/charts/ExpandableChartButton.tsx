import React, { useState, useEffect, useCallback } from 'react';
import { Maximize2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { AnimatePresence, motion } from 'framer-motion';

interface ExpandableChartButtonProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

function RotatePhoneHint({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      key="rotate-hint"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-background/85 backdrop-blur-sm rounded-lg cursor-pointer"
      onClick={onDismiss}
      onTouchStart={onDismiss}
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
  );
}

export function ExpandableChartButton({
  title,
  subtitle,
  children,
}: ExpandableChartButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRotateHint, setShowRotateHint] = useState(false);

  const dismissHint = useCallback(() => setShowRotateHint(false), []);

  // Show rotate hint when dialog opens on small screens (< 768px wide)
  useEffect(() => {
    if (isExpanded) {
      const isSmallScreen = window.matchMedia('(max-width: 767px)').matches;
      if (isSmallScreen) {
        setShowRotateHint(true);
      }
    } else {
      setShowRotateHint(false);
    }
  }, [isExpanded]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        onClick={() => setIsExpanded(true)}
        title="Expandir gráfico"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent
          hideCloseButton
          className="max-w-[95vw] w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-6 gap-3"
        >
          <div className="flex items-center justify-between">
            <div>
              {title ? (
                <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
              ) : (
                <VisuallyHidden><DialogTitle>Gráfico expandido</DialogTitle></VisuallyHidden>
              )}
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
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
              {showRotateHint && <RotatePhoneHint onDismiss={dismissHint} />}
            </AnimatePresence>
            {children}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
