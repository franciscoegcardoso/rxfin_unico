import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Person {
  id: string;
  name: string;
}

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterStartMonth: string;
  filterEndMonth: string;
  filterResponsible: string;
  onFilterStartMonthChange: (value: string) => void;
  onFilterEndMonthChange: (value: string) => void;
  onFilterResponsibleChange: (value: string) => void;
  allMonths: string[];
  sharedWith: Person[];
  isSharedAccount: boolean;
  formatMonthLabel: (month: string) => string;
}

export const FilterDialog: React.FC<FilterDialogProps> = ({
  open,
  onOpenChange,
  filterStartMonth,
  filterEndMonth,
  filterResponsible,
  onFilterStartMonthChange,
  onFilterEndMonthChange,
  onFilterResponsibleChange,
  allMonths,
  sharedWith,
  isSharedAccount,
  formatMonthLabel,
}) => {
  const hasActiveFilters = 
    (filterStartMonth && filterStartMonth !== 'all') || 
    (filterEndMonth && filterEndMonth !== 'all') || 
    filterResponsible !== 'all';

  const activeFilterCount = [
    filterStartMonth && filterStartMonth !== 'all',
    filterEndMonth && filterEndMonth !== 'all',
    filterResponsible !== 'all',
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    onFilterStartMonthChange('');
    onFilterEndMonthChange('');
    onFilterResponsibleChange('all');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filtros
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount} ativo{activeFilterCount > 1 ? 's' : ''}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Defina os critérios para filtrar os lançamentos exibidos na tabela.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Período */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              Período
              {(filterStartMonth && filterStartMonth !== 'all') || (filterEndMonth && filterEndMonth !== 'all') ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Ativo</Badge>
              ) : null}
            </Label>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <Select value={filterStartMonth || 'all'} onValueChange={onFilterStartMonthChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Início" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Sem limite</SelectItem>
                  {allMonths.map(month => (
                    <SelectItem key={month} value={month}>
                      {formatMonthLabel(month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground text-sm">até</span>
              <Select value={filterEndMonth || 'all'} onValueChange={onFilterEndMonthChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Fim" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Sem limite</SelectItem>
                  {allMonths.map(month => (
                    <SelectItem key={month} value={month}>
                      {formatMonthLabel(month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Responsável */}
          {isSharedAccount && sharedWith.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                Responsável
                {filterResponsible !== 'all' && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Ativo</Badge>
                )}
              </Label>
              <Select value={filterResponsible} onValueChange={onFilterResponsibleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os responsáveis</SelectItem>
                  <SelectItem value="unassigned">Sem responsável</SelectItem>
                  {sharedWith.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={handleResetFilters}
              className="gap-2 text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              Limpar filtros
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
