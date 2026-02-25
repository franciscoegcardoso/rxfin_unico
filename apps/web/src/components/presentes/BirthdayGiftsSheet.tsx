import React, { useState, useMemo, useEffect } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Cake, Save, AlertCircle, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { GiftPerson, GiftEvent, GiftAssignment, RELATIONSHIP_LABELS, RelationshipType } from '@/hooks/useGifts';
import { cn } from '@/lib/utils';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface BirthdayGiftRow {
  personId: string;
  personName: string;
  birthday: string;
  relationship: string | null;
  plannedValue: number;
  actualValue: number | null;
  description: string;
  status: 'pending' | 'purchased' | 'delivered';
  existingAssignmentId: string | null;
  hasChanges: boolean;
}

interface BirthdayGiftsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: GiftPerson[];
  events: GiftEvent[];
  assignments: GiftAssignment[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  onSaveBirthdayAssignments: (data: {
    personId: string;
    plannedValue: number;
    description: string;
    existingAssignmentId: string | null;
  }[]) => Promise<void>;
}

const formatMoney = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const BirthdayGiftsSheet: React.FC<BirthdayGiftsSheetProps> = ({
  open,
  onOpenChange,
  people,
  events,
  assignments,
  selectedYear,
  onYearChange,
  onSaveBirthdayAssignments,
}) => {
  const currentYear = new Date().getFullYear();
  const [rows, setRows] = useState<BirthdayGiftRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Get birthday event (general system event)
  const birthdayEvent = useMemo(() => 
    events.find(e => e.event_type === 'birthday' && e.is_system_event),
    [events]
  );

  // Get all birthday assignments for the year
  const birthdayAssignments = useMemo(() =>
    assignments.filter(a => 
      a.year === selectedYear && 
      a.event?.event_type === 'birthday'
    ),
    [assignments, selectedYear]
  );

  // Sort people by birthday (upcoming first from current month)
  const sortedPeople = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    return [...people].sort((a, b) => {
      // People without birthday go to the end
      if (!a.birthday_month && !b.birthday_month) return 0;
      if (!a.birthday_month) return 1;
      if (!b.birthday_month) return -1;
      
      // Sort by month (upcoming first), then by day
      const monthA = a.birthday_month >= currentMonth ? a.birthday_month : a.birthday_month + 12;
      const monthB = b.birthday_month >= currentMonth ? b.birthday_month : b.birthday_month + 12;
      if (monthA !== monthB) return monthA - monthB;
      return (a.birthday_day || 0) - (b.birthday_day || 0);
    });
  }, [people]);

  // Initialize rows from people and existing assignments
  useEffect(() => {
    if (!open) return;
    
    const initialRows: BirthdayGiftRow[] = sortedPeople.map(person => {
      const assignment = birthdayAssignments.find(a => a.person_id === person.id);
      
      return {
        personId: person.id,
        personName: person.name,
        birthday: person.birthday_day && person.birthday_month 
          ? `${person.birthday_day.toString().padStart(2, '0')}/${person.birthday_month.toString().padStart(2, '0')}`
          : '',
        relationship: person.relationship,
        plannedValue: assignment?.planned_value || birthdayEvent?.default_value || 100,
        actualValue: assignment?.actual_value || null,
        description: assignment?.gift_description || '',
        status: assignment?.status || 'pending',
        existingAssignmentId: assignment?.id || null,
        hasChanges: false,
      };
    });
    
    setRows(initialRows);
  }, [open, sortedPeople, birthdayAssignments, birthdayEvent]);

  // People without birthday
  const peopleWithoutBirthday = useMemo(() =>
    rows.filter(r => !r.birthday),
    [rows]
  );

  // People with birthday
  const peopleWithBirthday = useMemo(() =>
    rows.filter(r => r.birthday),
    [rows]
  );

  // Calculate totals
  const totals = useMemo(() => ({
    planned: peopleWithBirthday.reduce((sum, r) => sum + r.plannedValue, 0),
    actual: peopleWithBirthday.reduce((sum, r) => sum + (r.actualValue || 0), 0),
    scheduled: peopleWithBirthday.filter(r => r.existingAssignmentId || r.hasChanges).length,
    total: peopleWithBirthday.length,
  }), [peopleWithBirthday]);

  const updateRow = (personId: string, field: 'plannedValue' | 'description', value: number | string) => {
    setRows(prev => prev.map(r => {
      if (r.personId !== personId) return r;
      return {
        ...r,
        [field]: value,
        hasChanges: true,
      };
    }));
  };

  const handleSaveAll = async () => {
    const dataToSave = rows
      .filter(r => r.birthday && (r.hasChanges || r.existingAssignmentId))
      .map(r => ({
        personId: r.personId,
        plannedValue: r.plannedValue,
        description: r.description,
        existingAssignmentId: r.existingAssignmentId,
      }));
    
    if (dataToSave.length === 0) return;
    
    setIsSaving(true);
    try {
      await onSaveBirthdayAssignments(dataToSave);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const hasAnyChanges = rows.some(r => r.hasChanges);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Cake className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>Aniversários</SheetTitle>
              <p className="text-sm text-muted-foreground">
                Gerencie os presentes de aniversário para todas as pessoas
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Year selector and summary */}
        <div className="flex items-center justify-between py-4 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onYearChange(selectedYear - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={selectedYear.toString()} onValueChange={v => onYearChange(parseInt(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onYearChange(selectedYear + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {totals.scheduled}/{totals.total} agendados
            </p>
            <p className="font-semibold text-primary">
              Total: {formatMoney(totals.planned)}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="py-4">
          {peopleWithBirthday.length === 0 ? (
            <EmptyState
              icon={<Cake className="h-6 w-6 text-muted-foreground" />}
              description="Nenhuma pessoa com data de aniversário cadastrada"
              actionLabel="Adicionar primeira pessoa"
              onAction={() => onOpenChange(false)}
              className="py-8"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-20 text-center">Data</TableHead>
                  <TableHead className="hidden sm:table-cell">Parentesco</TableHead>
                  <TableHead className="w-28">Valor</TableHead>
                  <TableHead className="hidden sm:table-cell">Ideia</TableHead>
                  <TableHead className="w-20 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {peopleWithBirthday.map(row => (
                  <TableRow key={row.personId} className={cn(row.hasChanges && "bg-primary/5")}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {row.personName}
                        {row.hasChanges && !row.existingAssignmentId && (
                          <Badge variant="outline" className="text-xs">Novo</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {row.birthday}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {row.relationship && (
                        <Badge variant="secondary" className="text-xs">
                          {RELATIONSHIP_LABELS[row.relationship as RelationshipType] || row.relationship}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <CurrencyInput
                        value={row.plannedValue}
                        onChange={v => updateRow(row.personId, 'plannedValue', v)}
                        compact
                        disabled={row.status !== 'pending'}
                      />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Input
                        value={row.description}
                        onChange={e => updateRow(row.personId, 'description', e.target.value)}
                        placeholder="Presente..."
                        className="h-8"
                        disabled={row.status !== 'pending'}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          row.status === 'delivered' ? 'default' :
                          row.status === 'purchased' ? 'secondary' :
                          row.existingAssignmentId ? 'outline' : 'outline'
                        }
                        className={cn(
                          "text-xs",
                          !row.existingAssignmentId && !row.hasChanges && "opacity-50"
                        )}
                      >
                        {row.status === 'delivered' ? (
                          <><Check className="h-3 w-3 mr-1" /> Entregue</>
                        ) : row.status === 'purchased' ? (
                          'Comprado'
                        ) : row.existingAssignmentId ? (
                          'Agendado'
                        ) : (
                          '—'
                        )}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* People without birthday warning */}
          {peopleWithoutBirthday.length > 0 && (
            <div className="mt-6 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Pessoas sem data de aniversário</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {peopleWithoutBirthday.map(r => r.personName).join(', ')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Edite o cadastro dessas pessoas para adicionar a data de aniversário.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="pt-4 border-t">
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveAll} 
              disabled={!hasAnyChanges || isSaving || peopleWithBirthday.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar Todos'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
