import React from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Phase } from './architectureData';
import { ArchChecklistItem } from './ArchChecklistItem';
interface ArchPhaseAccordionProps {
  phase: Phase;
  completedIds: string[];
  onToggleItem: (id: string) => void;
  onOpenCursor: (itemId: string) => void;
  defaultOpen?: boolean;
}

export function ArchPhaseAccordion({
  phase,
  completedIds,
  onToggleItem,
  onOpenCursor,
  defaultOpen = false,
}: ArchPhaseAccordionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const done = phase.items.filter((i) => completedIds.includes(i.id)).length;
  const total = phase.items.length;
  const progressPct = total ? (done / total) * 100 : 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors text-left">
        <div className="flex items-center gap-3">
          <div
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: phase.color }}
          />
          <div>
            <p className="font-semibold text-foreground">{phase.label} — {phase.sublabel}</p>
            <p className="text-xs text-muted-foreground">Prazo: {phase.deadline}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {done}/{total}
          </span>
          <Progress value={progressPct} className="w-24 h-2" />
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 pl-4 space-y-1 border-l-2 border-muted">
          {phase.items.map((item) => (
            <ArchChecklistItem
              key={item.id}
              item={item}
              completed={completedIds.includes(item.id)}
              onToggle={() => onToggleItem(item.id)}
              onOpenCursor={item.hasCursorPrompt ? onOpenCursor : undefined}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
