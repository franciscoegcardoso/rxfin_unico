import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, ExternalLink, CircleDot, Crown, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type Page } from '@/hooks/usePages';

const PLAN_COLORS: Record<string, string> = {
  sem_cadastro: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  free: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  basic: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  pro: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

interface SortablePageRowProps {
  page: Page;
  isNested?: boolean;
  hasPendingChange: boolean;
  isDeleting: boolean;
  isUpdating: boolean;
  isToggling: boolean;
  hasReorderPending?: boolean;
  displayUserStatus: boolean;
  displayShowWhenUnavailable: boolean;
  displayPlanSlug: string;
  sortedPlans: { slug: string; name: string; order_index: number }[];
  onEdit: (page: Page) => void;
  onDelete: (page: Page) => void;
  onPlanChange: (page: Page, planSlug: string) => void;
  onToggleStatus: (page: Page) => void;
  onToggleShowWhenUnavailable: (page: Page) => void;
  getPlanName: (slug: string | null) => string;
}

export function SortablePageRow({
  page,
  isNested = false,
  hasPendingChange,
  isDeleting,
  isUpdating,
  isToggling,
  hasReorderPending = false,
  displayUserStatus,
  displayShowWhenUnavailable,
  displayPlanSlug,
  sortedPlans,
  onEdit,
  onDelete,
  onPlanChange,
  onToggleStatus,
  onToggleShowWhenUnavailable,
  getPlanName,
}: SortablePageRowProps) {
  const navigate = useNavigate();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : undefined,
  };

  const handleNavigateToPage = (path?: string) => {
    if (path && !path.includes(':')) {
      navigate(path);
    }
  };

  const showPendingIndicator = hasPendingChange || hasReorderPending;

  // Visual indicator for inactive pages
  const isInactive = !displayUserStatus;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`
        ${isNested ? 'bg-muted/20' : ''}
        ${showPendingIndicator ? 'ring-2 ring-inset ring-amber-400/50 bg-amber-50/30 dark:bg-amber-900/10' : ''}
        ${isDeleting ? 'ring-red-400/50 bg-red-50/30 dark:bg-red-900/10 opacity-60' : ''}
        ${isInactive && !isDeleting ? 'opacity-60 bg-muted/30' : ''}
        ${isDragging ? 'shadow-lg' : ''}
      `}
    >
      <TableCell>
        <div className={`flex items-center gap-2 ${isNested ? 'pl-6' : ''}`}>
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
            title="Arrastar para reordenar"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-medium flex items-center gap-2">
            {showPendingIndicator && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <CircleDot className={`h-3.5 w-3.5 flex-shrink-0 ${isDeleting ? 'text-red-500' : 'text-amber-500'} animate-pulse`} />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {isDeleting && 'Será excluído'}
                  {hasReorderPending && !isDeleting && 'Posição alterada'}
                  {isUpdating && !isDeleting && !hasReorderPending && 'Alterações pendentes'}
                  {isToggling && !isDeleting && !isUpdating && !hasReorderPending && 'Status alterado'}
                </TooltipContent>
              </Tooltip>
            )}
            {page.icon && (
              <span className="text-muted-foreground text-xs flex-shrink-0">[{page.icon}]</span>
            )}
            <span className={`truncate ${isDeleting ? 'line-through' : ''} ${isInactive ? 'text-muted-foreground' : ''}`}>{page.title}</span>
            {isInactive && !isDeleting && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300 border-amber-500/30 flex items-center gap-0.5">
                <Rocket className="h-2.5 w-2.5" />
                Em breve
              </Badge>
            )}
            {showPendingIndicator && !isDeleting && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300">
                {hasReorderPending ? 'Reordenado' : 'Não salvo'}
              </Badge>
            )}
            </div>
            {page.description && (
              <div className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                {page.description}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {page.path}
        </code>
      </TableCell>
      <TableCell>
        <Select
          value={displayPlanSlug}
          onValueChange={(value) => onPlanChange(page, value)}
        >
          <SelectTrigger className="h-8 w-[130px]">
            <SelectValue>
              <Badge 
                variant="secondary"
                className={PLAN_COLORS[displayPlanSlug] || ''}
              >
                {getPlanName(displayPlanSlug)}
              </Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sortedPlans.map((plan, index) => (
              <SelectItem key={plan.slug} value={plan.slug}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] px-1 h-4">
                    {index + 1}
                  </Badge>
                  <span>{plan.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-center">
        <Switch
          checked={displayUserStatus}
          onCheckedChange={() => onToggleStatus(page)}
        />
      </TableCell>
      <TableCell className="text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Switch
                checked={displayShowWhenUnavailable}
                onCheckedChange={() => onToggleShowWhenUnavailable(page)}
                disabled={displayUserStatus} // Disabled when page is available (must be shown)
              />
            </div>
          </TooltipTrigger>
          {displayUserStatus && (
            <TooltipContent side="top" className="text-xs">
              Páginas disponíveis são sempre exibidas
            </TooltipContent>
          )}
        </Tooltip>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {page.path && !page.path.includes(':') && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleNavigateToPage(page.path)}
              title="Abrir página"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(page)}
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(page)}
            title="Excluir"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
