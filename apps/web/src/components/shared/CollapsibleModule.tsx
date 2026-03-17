import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface CollapsibleModuleProps {
  /** Module title */
  title: string;
  /** Optional subtitle / description */
  description?: string;
  /** Icon element shown in the header */
  icon?: React.ReactNode;
  /** Right-side actions (rendered next to the chevron) */
  actions?: React.ReactNode;
  /** Module content */
  children: React.ReactNode;
  /** Start expanded (default: false) */
  defaultOpen?: boolean;
  /** Extra CSS classes for the outer wrapper */
  className?: string;
  /** Item count badge */
  count?: number;
  /**
   * On mobile/tablet (< 1024px), use a full-screen drawer instead of
   * inline collapse. Defaults to true.
   */
  useDrawerOnMobile?: boolean;
  /**
   * On desktop (>= 1024px), use a dialog window instead of
   * inline collapse. Defaults to false.
   */
  useDialogOnDesktop?: boolean;
  /** Visually highlight this module with a primary border pulse */
  highlight?: boolean;
  /** When true, inline mode renders without card border/shadow/background (flat on page) */
  noCardStyle?: boolean;
}

const useIsTabletOrMobile = () => {
  const [is, setIs] = useState(false);
  useEffect(() => {
    const check = () => setIs(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return is;
};

/** Shared card trigger used by both mobile drawer and desktop dialog modes */
const TriggerCard: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  count?: number;
  className?: string;
  highlight?: boolean;
  onClick: () => void;
}> = ({ title, description, icon, actions, count, className, highlight, onClick }) => (
  <Card
    className={cn(
      "cursor-pointer hover:bg-muted/30 transition-colors border-border/60 active:scale-[0.99]",
      highlight && "border-primary/60 shadow-[0_0_12px_-3px_hsl(var(--primary)/0.35)] ring-1 ring-primary/20",
      className
    )}
    onClick={onClick}
  >
    <CardContent className="py-3 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[hsl(var(--color-text-primary))] truncate">{title}</span>
              {count !== undefined && (
                <span className="text-[10px] font-medium text-[hsl(var(--color-text-tertiary))] bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
                  {count}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-[hsl(var(--color-text-tertiary))] mt-0.5 truncate">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions && (
            <div onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
          <ChevronRight className="h-4 w-4 text-[hsl(var(--color-text-tertiary))]" />
        </div>
      </div>
    </CardContent>
  </Card>
);

/**
 * A modern collapsible module inspired by Linear, Notion, and Stripe dashboards.
 * On mobile/tablet, opens a full-screen drawer instead of collapsing inline.
 * Optionally on desktop, opens a dialog window instead of collapsing inline.
 */
export const CollapsibleModule: React.FC<CollapsibleModuleProps> = ({
  title,
  description,
  icon,
  actions,
  children,
  defaultOpen = false,
  className,
  count,
  useDrawerOnMobile = true,
  useDialogOnDesktop = false,
  highlight = false,
  noCardStyle = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const isTabletOrMobile = useIsTabletOrMobile();

  const shouldUseDrawer = useDrawerOnMobile && isTabletOrMobile;
  const shouldUseDialog = useDialogOnDesktop && !isTabletOrMobile;

  // Mobile/Tablet: summary card + full-screen drawer
  if (shouldUseDrawer) {
    return (
      <>
        <TriggerCard
          title={title}
          description={description}
          icon={icon}
          actions={actions}
          count={count}
          className={className}
          highlight={highlight}
          onClick={() => setDrawerOpen(true)}
        />

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="h-[95vh] max-h-[95vh]">
            <DrawerHeader className="flex flex-row items-center justify-between border-b pb-3">
              <DrawerTitle className="flex items-center gap-2 text-base">
                {icon && (
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                )}
                {title}
              </DrawerTitle>
              <div className="flex items-center gap-2">
                {actions && (
                  <div onClick={(e) => e.stopPropagation()}>
                    {actions}
                  </div>
                )}
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto p-4">
              {children}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: Dialog mode
  if (shouldUseDialog) {
    return (
      <>
        <TriggerCard
          title={title}
          description={description}
          icon={icon}
          actions={actions}
          count={count}
          className={className}
          highlight={highlight}
          onClick={() => setDialogOpen(true)}
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] h-[90vh] flex flex-col p-0">
            <DialogHeader className="flex flex-row items-center justify-between border-b px-6 py-4 shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                {icon && (
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                )}
                {title}
                {count !== undefined && (
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
                    {count}
                  </span>
                )}
              </DialogTitle>
              {actions && (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {actions}
                </div>
              )}
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Desktop: original inline collapsible behavior
  return (
    <div className={cn(
      noCardStyle ? "overflow-hidden" : "rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm",
      className
    )}>
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
          "hover:bg-muted/40 active:bg-muted/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          isOpen && "border-b border-border/40"
        )}
      >
        {/* Chevron indicator */}
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="shrink-0"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </motion.div>

        {/* Icon */}
        {icon && (
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">{title}</span>
            {count !== undefined && (
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
                {count}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div
            className="flex items-center gap-2 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </button>

      {/* Content — animated */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
