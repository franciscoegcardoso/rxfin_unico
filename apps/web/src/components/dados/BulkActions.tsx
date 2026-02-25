import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Trash2, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BulkActionsProps {
  selectedCount: number;
  onExportExcel: () => void;
  onExportCSV: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  deleting?: boolean;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedCount,
  onExportExcel,
  onExportCSV,
  onDelete,
  onClearSelection,
  deleting,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
      <span className="text-sm font-medium text-foreground">
        {selectedCount} selecionado(s)
      </span>
      <div className="flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onExportExcel}>
            Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportCSV}>
            CSV (.csv)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onDelete}
        disabled={deleting}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Excluir
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClearSelection}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
