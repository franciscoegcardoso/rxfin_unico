import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MobileSectionDrawerProps {
  /** Section title displayed in the summary card and drawer header */
  title: string;
  /** Icon component to show in the summary card */
  icon: React.ReactNode;
  /** Optional badge content (e.g. "3.2%/ano" or "12 anos") */
  badge?: React.ReactNode;
  /** The full content to render (in drawer on mobile, directly on desktop) */
  children: React.ReactNode;
  /** Whether this is tablet/mobile (controls drawer vs direct render) */
  isTabletOrMobile: boolean;
}

export const MobileSectionDrawer: React.FC<MobileSectionDrawerProps> = ({
  title,
  icon,
  badge,
  children,
  isTabletOrMobile,
}) => {
  const [open, setOpen] = useState(false);

  // Desktop: render content directly, no drawer
  if (!isTabletOrMobile) {
    return <>{children}</>;
  }

  // Mobile/Tablet: summary card + drawer
  return (
    <>
      <Card
        className="cursor-pointer hover:bg-muted/30 transition-colors border-muted-foreground/10 active:scale-[0.99]"
        onClick={() => setOpen(true)}
      >
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <span className="text-sm font-medium">{title}</span>
              {badge}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="h-[95vh] max-h-[95vh]">
          <DrawerHeader className="flex flex-row items-center justify-between border-b pb-3">
            <DrawerTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};
