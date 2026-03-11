import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, FolderOpen, ChevronDown, ChevronRight, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type PageGroup } from '@/hooks/usePageGroups';

interface SortableGroupRowProps {
  group: PageGroup;
  pagesCount: number;
  isExpanded: boolean;
  hasPendingChange: boolean;
  isDeleting: boolean;
  hasReorderPending?: boolean;
  onToggle: () => void;
  onEdit: (group: PageGroup) => void;
  onDelete: (group: PageGroup) => void;
}

export function SortableGroupRow({
  group,
  pagesCount,
  isExpanded,
  hasPendingChange,
  isDeleting,
  hasReorderPending = false,
  onToggle,
  onEdit,
  onDelete,
}: SortableGroupRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : undefined,
  };

  const showPendingIndicator = hasPendingChange || hasReorderPending;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`
        bg-muted/40 hover:bg-muted/60
        ${showPendingIndicator ? 'ring-2 ring-inset ring-amber-400/50 bg-amber-100/40 dark:bg-amber-900/20' : ''}
        ${isDeleting ? 'ring-red-400/50 bg-red-100/40 dark:bg-red-900/20 opacity-60' : ''}
        ${isDragging ? 'shadow-lg' : ''}
      `}
    >
      <TableCell colSpan={5} className="align-middle">
        <div className="flex items-center gap-3 py-1">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
            title="Arrastar para reordenar"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <div 
            className="flex items-center gap-3 cursor-pointer flex-1"
            onClick={onToggle}
          >
            {showPendingIndicator ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <CircleDot className={`h-4 w-4 flex-shrink-0 ${isDeleting ? 'text-red-500' : 'text-amber-500'} animate-pulse`} />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {isDeleting ? 'Será excluído' : hasReorderPending ? 'Posição alterada' : 'Alterações pendentes'}
                </TooltipContent>
              </Tooltip>
            ) : isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <FolderOpen className="h-4 w-4 text-primary" />
            <span className={`font-semibold ${isDeleting ? 'line-through' : ''}`}>{group.name}</span>
            {showPendingIndicator && !isDeleting && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300">
                {hasReorderPending ? 'Reordenado' : 'Não salvo'}
              </Badge>
            )}
            <Badge variant="outline" className="ml-2">
              {pagesCount} páginas
            </Badge>
            {group.icon && (
              <span className="text-xs text-muted-foreground">[{group.icon}]</span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="w-[120px] text-right align-middle">
        <div className="flex items-center justify-end gap-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(group);
            }}
            title="Editar grupo"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(group);
            }}
            title="Excluir grupo"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
