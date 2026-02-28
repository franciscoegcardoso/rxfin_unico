import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { GiftPerson, GiftEvent } from '@/hooks/useGifts';

export interface GiftFilterValues {
  personId: string;
  eventId: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

interface GiftFiltersProps {
  filters: GiftFilterValues;
  onFiltersChange: (filters: GiftFilterValues) => void;
  people: GiftPerson[];
  events: GiftEvent[];
}

const hasActiveFilters = (filters: GiftFilterValues) =>
  filters.personId !== '' || filters.eventId !== '' || !!filters.dateFrom || !!filters.dateTo;

export const GiftFilters: React.FC<GiftFiltersProps> = ({ filters, onFiltersChange, people, events }) => {
  const update = (partial: Partial<GiftFilterValues>) =>
    onFiltersChange({ ...filters, ...partial });

  const clearAll = () =>
    onFiltersChange({ personId: '', eventId: '', dateFrom: undefined, dateTo: undefined });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

      {/* Person filter */}
      <Select value={filters.personId} onValueChange={(v) => update({ personId: v === '_all' ? '' : v })}>
        <SelectTrigger className="w-[160px] h-9 text-sm">
          <SelectValue placeholder="Pessoa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todas as pessoas</SelectItem>
          {people.map(p => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Event/Occasion filter */}
      <Select value={filters.eventId} onValueChange={(v) => update({ eventId: v === '_all' ? '' : v })}>
        <SelectTrigger className="w-[160px] h-9 text-sm">
          <SelectValue placeholder="Ocasião" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todas as ocasiões</SelectItem>
          {events.map(e => (
            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date From */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 text-sm font-normal w-[130px] justify-start",
              !filters.dateFrom && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
            {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yy") : "De"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.dateFrom}
            onSelect={(d) => update({ dateFrom: d })}
            locale={ptBR}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {/* Date To */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 text-sm font-normal w-[130px] justify-start",
              !filters.dateTo && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
            {filters.dateTo ? format(filters.dateTo, "dd/MM/yy") : "Até"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.dateTo}
            onSelect={(d) => update({ dateTo: d })}
            locale={ptBR}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {/* Clear */}
      {hasActiveFilters(filters) && (
        <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={clearAll}>
          <X className="h-3.5 w-3.5 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
};
