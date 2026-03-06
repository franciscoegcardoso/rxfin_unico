import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChecklistItem as ChecklistItemType } from './architectureData';

interface ArchChecklistItemProps {
  item: ChecklistItemType;
  completed: boolean;
  onToggle: () => void;
  onOpenCursor?: (prompt: string) => void;
}

const priorityVariant: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  CRÍTICA: 'destructive',
  ALTA: 'default',
  MÉDIA: 'secondary',
  BAIXA: 'outline',
};

export function ArchChecklistItem({ item, completed, onToggle, onOpenCursor }: ArchChecklistItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border',
        completed && 'opacity-60'
      )}
      onClick={onToggle}
    >
      <Checkbox checked={completed} onClick={(e) => { e.stopPropagation(); onToggle(); }} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', completed && 'line-through text-muted-foreground')}>{item.text}</p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          <Badge variant={priorityVariant[item.priority] ?? 'secondary'} className="text-[10px]">
            {item.priority}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {item.effort}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {item.area}
          </Badge>
        </div>
      </div>
      {item.hasCursorPrompt && onOpenCursor && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1"
          onClick={(e) => {
            e.stopPropagation();
            onOpenCursor(item.id);
          }}
        >
          <Keyboard className="h-3.5 w-3.5" />
          Cursor
        </Button>
      )}
    </div>
  );
}
