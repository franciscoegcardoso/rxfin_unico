import React, { useState, useMemo, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Gift, 
  User, 
  Check,
  Cake,
  TreePine,
  Flower2,
  Baby,
  Heart,
  PartyPopper,
  Save
} from 'lucide-react';
import { GiftPerson, GiftEvent, GiftAssignment, RELATIONSHIP_LABELS, RelationshipType } from '@/hooks/useGifts';
import { cn } from '@/lib/utils';

const EVENT_ICONS: Record<string, React.ElementType> = {
  birthday: Cake,
  christmas: TreePine,
  mothers_day: Flower2,
  fathers_day: User,
  easter: PartyPopper,
  childrens_day: Baby,
  valentines_day: Heart,
  custom: Gift,
};

const formatMoney = (value: number) => 
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface PersonAssignmentData {
  personId: string;
  selected: boolean;
  plannedValue: number;
  description: string;
  existingAssignmentId: string | null;
}

interface OccasionPeopleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: GiftEvent | null;
  people: GiftPerson[];
  assignments: GiftAssignment[];
  selectedYear: number;
  onSave: (eventId: string, data: {
    personId: string;
    plannedValue: number;
    description: string;
    existingAssignmentId: string | null;
  }[]) => Promise<void>;
}

export const OccasionPeopleSheet: React.FC<OccasionPeopleSheetProps> = ({
  open,
  onOpenChange,
  event,
  people,
  assignments,
  selectedYear,
  onSave,
}) => {
  const [personData, setPersonData] = useState<Record<string, PersonAssignmentData>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize data when event changes
  useEffect(() => {
    if (!event || !open) return;

    const eventAssignments = assignments.filter(
      a => a.event_id === event.id && a.year === selectedYear
    );

    const initialData: Record<string, PersonAssignmentData> = {};
    
    people.forEach(person => {
      const existingAssignment = eventAssignments.find(a => a.person_id === person.id);
      
      initialData[person.id] = {
        personId: person.id,
        selected: !!existingAssignment,
        plannedValue: existingAssignment?.planned_value || event.default_value,
        description: existingAssignment?.gift_description || '',
        existingAssignmentId: existingAssignment?.id || null,
      };
    });

    setPersonData(initialData);
  }, [event, people, assignments, selectedYear, open]);

  const togglePerson = (personId: string) => {
    setPersonData(prev => ({
      ...prev,
      [personId]: {
        ...prev[personId],
        selected: !prev[personId]?.selected,
        plannedValue: prev[personId]?.plannedValue || event?.default_value || 100,
      }
    }));
  };

  const updateValue = (personId: string, value: number) => {
    setPersonData(prev => ({
      ...prev,
      [personId]: { ...prev[personId], plannedValue: value }
    }));
  };

  const updateDescription = (personId: string, description: string) => {
    setPersonData(prev => ({
      ...prev,
      [personId]: { ...prev[personId], description }
    }));
  };

  const selectedPeople = useMemo(() => 
    Object.values(personData).filter(p => p.selected),
    [personData]
  );

  const totalPlanned = useMemo(() => 
    selectedPeople.reduce((sum, p) => sum + (p.plannedValue || 0), 0),
    [selectedPeople]
  );

  const handleSave = async () => {
    if (!event || selectedPeople.length === 0) return;
    
    setIsSaving(true);
    try {
      await onSave(
        event.id,
        selectedPeople.map(p => ({
          personId: p.personId,
          plannedValue: p.plannedValue,
          description: p.description,
          existingAssignmentId: p.existingAssignmentId,
        }))
      );
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!event) return null;

  const Icon = EVENT_ICONS[event.event_type] || Gift;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>{event.name}</SheetTitle>
              <SheetDescription>
                {event.event_day && event.event_month 
                  ? `${event.event_day}/${event.event_month}` 
                  : 'Data variável'
                } • {selectedYear}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0 mt-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">Selecione as pessoas</Label>
            <Badge variant="secondary">
              {selectedPeople.length} selecionada(s)
            </Badge>
          </div>

          <ScrollArea className="h-[calc(100vh-300px)] pr-3">
            <div className="space-y-2">
              {people.map(person => {
                const data = personData[person.id];
                const isSelected = data?.selected || false;

                return (
                  <div
                    key={person.id}
                    className={cn(
                      "border rounded-lg transition-all",
                      isSelected ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    {/* Person header - click to select */}
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer"
                      onClick={() => togglePerson(person.id)}
                    >
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => togglePerson(person.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{person.name}</p>
                        {person.relationship && (
                          <Badge variant="outline" className="text-xs mt-0.5">
                            {RELATIONSHIP_LABELS[person.relationship as RelationshipType]}
                          </Badge>
                        )}
                      </div>
                      {isSelected && (
                        <span className="text-sm font-medium text-primary">
                          {formatMoney(data?.plannedValue || 0)}
                        </span>
                      )}
                    </div>

                    {/* Expanded fields when selected */}
                    {isSelected && (
                      <div className="px-3 pb-3 pt-1 border-t border-border/50">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Valor</Label>
                            <CurrencyInput
                              value={data?.plannedValue || 0}
                              onChange={(v) => updateValue(person.id, v)}
                              compact
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Ideia de presente</Label>
                            <Input
                              value={data?.description || ''}
                              onChange={(e) => updateDescription(person.id, e.target.value)}
                              placeholder="Ex: Perfume..."
                              className="h-9"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {people.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma pessoa cadastrada</p>
                  <p className="text-sm">Adicione pessoas na aba "Pessoas" primeiro</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer with total and save */}
        <SheetFooter className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between w-full gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total planejado</p>
              <p className="text-lg font-semibold text-primary">{formatMoney(totalPlanned)}</p>
            </div>
            <Button 
              onClick={handleSave}
              disabled={selectedPeople.length === 0 || isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Salvar {selectedPeople.length > 0 && `(${selectedPeople.length})`}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
