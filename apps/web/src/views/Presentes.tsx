import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { AppLayout } from '@/components/layout/AppLayout';
import { CollapsibleModule } from '@/components/shared/CollapsibleModule';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { BackLink } from '@/components/shared/BackLink';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { 
  Gift, 
  Plus, 
  Users, 
  Calendar, 
  Check, 
  Clock, 
  ShoppingBag,
  Trash2,
  Edit2,
  ChevronRight,
  Cake,
  Heart,
  TreePine,
  Baby,
  Flower2,
  PartyPopper,
  Settings,
  User,
  Upload,
  Eye,
  ExternalLink,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { useGifts, GiftPerson, GiftEvent, GiftAssignment, SYSTEM_EVENTS, RELATIONSHIP_LABELS, RELATIONSHIP_OCCASIONS, RelationshipType } from '@/hooks/useGifts';
import { cn } from '@/lib/utils';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BirthdayGiftsSheet } from '@/components/presentes/BirthdayGiftsSheet';
import { OccasionPeopleSheet } from '@/components/presentes/OccasionPeopleSheet';
import { GiftCalendar } from '@/components/presentes/GiftCalendar';
import { GiftAnalysisTab } from '@/components/presentes/GiftAnalysisTab';
import { ImportPeopleDialog } from '@/components/presentes/ImportPeopleDialog';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';
import { useNavigate } from 'react-router-dom';
import { GiftFilters, GiftFilterValues } from '@/components/presentes/GiftFilters';
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

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

/**
 * Helper: get the effective date for an assignment (uses person's birthday for birthday events)
 */
const getAssignmentDate = (a: GiftAssignment, year: number): Date | null => {
  if (a.event?.event_type === 'birthday' && a.person?.birthday_month && a.person?.birthday_day) {
    return new Date(year, a.person.birthday_month - 1, a.person.birthday_day);
  }
  if (a.event?.event_month && a.event?.event_day) {
    return new Date(year, a.event.event_month - 1, a.event.event_day);
  }
  return null;
};

const formatAssignmentDate = (a: GiftAssignment): string => {
  if (a.event?.event_type === 'birthday' && a.person?.birthday_day && a.person?.birthday_month) {
    return `${String(a.person.birthday_day).padStart(2, '0')}/${String(a.person.birthday_month).padStart(2, '0')}`;
  }
  if (a.event?.event_day && a.event?.event_month) {
    return `${String(a.event.event_day).padStart(2, '0')}/${String(a.event.event_month).padStart(2, '0')}`;
  }
  return '';
};

export const Presentes: React.FC = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState<'calendar' | 'pending' | 'completed'>('calendar');
  const [cadastroTab, setCadastroTab] = useState<'people' | 'events'>('people');
  // Section open states removed — now handled by CollapsibleModule
  const [giftFilters, setGiftFilters] = useState<GiftFilterValues>({
    personId: '', eventId: '', dateFrom: undefined, dateTo: undefined,
  });
  
  // Dialogs state
  const [personDialogOpen, setPersonDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [birthdaySheetOpen, setBirthdaySheetOpen] = useState(false);
  const [occasionSheetOpen, setOccasionSheetOpen] = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState<GiftEvent | null>(null);
  const [editingPerson, setEditingPerson] = useState<GiftPerson | null>(null);
  const [editingEvent, setEditingEvent] = useState<GiftEvent | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<GiftAssignment | null>(null);

  const [detailAssignment, setDetailAssignment] = useState<GiftAssignment | null>(null);

  // Form states
  const [personForm, setPersonForm] = useState({ name: '', birthday_day: '', birthday_month: '', relationship: '', notes: '' });
  const [eventForm, setEventForm] = useState({ name: '', event_type: 'custom' as string, event_day: '', event_month: '', default_value: 100 });
  const [assignForm, setAssignForm] = useState<{
    person_id: string;
    event_ids: string[];
    values: Record<string, number>;
    descriptions: Record<string, string>;
  }>({ person_id: '', event_ids: [], values: {}, descriptions: {} });

  const {
    people,
    events,
    assignments,
    isLoading,
    initializeSystemEvents,
    addPerson,
    addPeopleBulk,
    updatePerson,
    deletePerson,
    upsertEvent,
    deleteEvent,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    bulkUpsertBirthdayAssignments,
    bulkUpsertOccasionAssignments,
  } = useGifts();

  // Initialize system events on first load
  useEffect(() => {
    if (!isLoading && events.length === 0) {
      initializeSystemEvents.mutate();
    }
  }, [isLoading, events.length]);

  // Filter assignments by year and status
  const yearAssignments = useMemo(() => 
    assignments.filter(a => a.year === selectedYear),
    [assignments, selectedYear]
  );

  // Apply shared filters
  const applyGiftFilters = useCallback((items: GiftAssignment[]) => {
    return items.filter(a => {
      if (giftFilters.personId && a.person_id !== giftFilters.personId) return false;
      if (giftFilters.eventId && a.event_id !== giftFilters.eventId) return false;
      if (giftFilters.dateFrom || giftFilters.dateTo) {
        const eventDate = getAssignmentDate(a, selectedYear);
        if (!eventDate) return false;
        if (giftFilters.dateFrom && eventDate < giftFilters.dateFrom) return false;
        if (giftFilters.dateTo && eventDate > giftFilters.dateTo) return false;
      }
      return true;
    });
  }, [giftFilters, selectedYear]);

  const pendingAssignments = useMemo(() => 
    yearAssignments.filter(a => a.status === 'pending'),
    [yearAssignments]
  );

  const completedAssignments = useMemo(() => 
    yearAssignments.filter(a => a.status !== 'pending'),
    [yearAssignments]
  );

  const filteredPending = useMemo(() => applyGiftFilters(pendingAssignments), [applyGiftFilters, pendingAssignments]);
  const filteredCompleted = useMemo(() => applyGiftFilters(completedAssignments), [applyGiftFilters, completedAssignments]);
  const filteredYearAssignments = useMemo(() => applyGiftFilters(yearAssignments), [applyGiftFilters, yearAssignments]);

  // Calculate totals
  const totalPlanned = useMemo(() => 
    yearAssignments.reduce((sum, a) => sum + (a.planned_value || 0), 0),
    [yearAssignments]
  );

  const totalSpent = useMemo(() => 
    yearAssignments.reduce((sum, a) => sum + (a.actual_value || 0), 0),
    [yearAssignments]
  );

  // Get upcoming gifts (next 30 days) - fixed to use person's birthday date for birthday events
  const upcomingGifts = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);
    
    return pendingAssignments.filter(a => {
      const eventDate = getAssignmentDate(a, selectedYear);
      if (!eventDate) return false;
      return isAfter(eventDate, today) && isBefore(eventDate, thirtyDaysFromNow);
    }).sort((a, b) => {
      const dateA = getAssignmentDate(a, selectedYear)!;
      const dateB = getAssignmentDate(b, selectedYear)!;
      return dateA.getTime() - dateB.getTime();
    });
  }, [pendingAssignments, selectedYear]);

  // Handlers
  const handleSavePerson = async () => {
    const data = {
      name: personForm.name,
      birthday_day: personForm.birthday_day ? parseInt(personForm.birthday_day) : undefined,
      birthday_month: personForm.birthday_month ? parseInt(personForm.birthday_month) : undefined,
      relationship: personForm.relationship ? personForm.relationship as RelationshipType : undefined,
      notes: personForm.notes || undefined,
    };
    
    if (editingPerson) {
      await updatePerson.mutateAsync({ id: editingPerson.id, ...data });
    } else {
      await addPerson.mutateAsync(data);
    }
    
    setPersonDialogOpen(false);
    setEditingPerson(null);
    setPersonForm({ name: '', birthday_day: '', birthday_month: '', relationship: '', notes: '' });
  };

  const handleSaveEvent = async () => {
    const data = {
      name: eventForm.name,
      event_type: eventForm.event_type as any,
      event_day: eventForm.event_day ? parseInt(eventForm.event_day) : null,
      event_month: eventForm.event_month ? parseInt(eventForm.event_month) : null,
      default_value: eventForm.default_value,
      is_system_event: false,
    };
    
    if (editingEvent) {
      await upsertEvent.mutateAsync({ id: editingEvent.id, ...data });
    } else {
      await upsertEvent.mutateAsync(data as any);
    }
    
    setEventDialogOpen(false);
    setEditingEvent(null);
    setEventForm({ name: '', event_type: 'custom', event_day: '', event_month: '', default_value: 100 });
  };

  const handleSaveAssignment = async () => {
    if (!assignForm.person_id || assignForm.event_ids.length === 0) return;
    
    if (editingAssignment) {
      const eventId = assignForm.event_ids[0];
      await updateAssignment.mutateAsync({
        id: editingAssignment.id,
        planned_value: assignForm.values[eventId] || 0,
        gift_description: assignForm.descriptions[eventId] || null,
      });
    } else {
      for (const eventId of assignForm.event_ids) {
        await createAssignment.mutateAsync({
          person_id: assignForm.person_id,
          event_id: eventId,
          year: selectedYear,
          planned_value: assignForm.values[eventId] || 0,
          gift_description: assignForm.descriptions[eventId] || undefined,
        });
      }
    }
    
    setAssignDialogOpen(false);
    setEditingAssignment(null);
    setAssignForm({ person_id: '', event_ids: [], values: {}, descriptions: {} });
  };

  const handleMarkAsPurchased = async (assignment: GiftAssignment) => {
    await updateAssignment.mutateAsync({
      id: assignment.id,
      status: 'purchased',
      actual_value: assignment.planned_value,
      purchase_date: new Date().toISOString().split('T')[0],
    });
  };

  const handleMarkAsDelivered = async (assignment: GiftAssignment) => {
    await updateAssignment.mutateAsync({
      id: assignment.id,
      status: 'delivered',
    });
  };

  const openEditPerson = (person: GiftPerson) => {
    setEditingPerson(person);
    setPersonForm({
      name: person.name,
      birthday_day: person.birthday_day?.toString() || '',
      birthday_month: person.birthday_month?.toString() || '',
      relationship: person.relationship || '',
      notes: person.notes || '',
    });
    setPersonDialogOpen(true);
  };

  const openEditEvent = (event: GiftEvent) => {
    setEditingEvent(event);
    setEventForm({
      name: event.name,
      event_type: event.event_type,
      event_day: event.event_day?.toString() || '',
      event_month: event.event_month?.toString() || '',
      default_value: event.default_value,
    });
    setEventDialogOpen(true);
  };

  const openEditAssignment = (assignment: GiftAssignment) => {
    setEditingAssignment(assignment);
    const eventId = assignment.event_id;
    setAssignForm({
      person_id: assignment.person_id,
      event_ids: [eventId],
      values: { [eventId]: assignment.planned_value },
      descriptions: { [eventId]: assignment.gift_description || '' },
    });
    setAssignDialogOpen(true);
  };

  const openAssignDialog = (personId?: string, eventId?: string) => {
    const initialValues: Record<string, number> = {};
    const initialDescriptions: Record<string, string> = {};
    let suggestedEventIds: string[] = [];
    
    if (eventId) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        initialValues[eventId] = event.default_value;
        initialDescriptions[eventId] = '';
        suggestedEventIds = [eventId];
      }
    } else if (personId) {
      const person = people.find(p => p.id === personId);
      if (person?.relationship) {
        const suggestedTypes = RELATIONSHIP_OCCASIONS[person.relationship as RelationshipType] || [];
        suggestedEventIds = events
          .filter(e => suggestedTypes.includes(e.event_type))
          .map(e => e.id);
        
        suggestedEventIds.forEach(eId => {
          const event = events.find(e => e.id === eId);
          if (event) {
            initialValues[eId] = event.default_value;
            initialDescriptions[eId] = '';
          }
        });
      }
    }
    
    setAssignForm({
      person_id: personId || '',
      event_ids: suggestedEventIds,
      values: initialValues,
      descriptions: initialDescriptions,
    });
    setEditingAssignment(null);
    setAssignDialogOpen(true);
  };

  const toggleOccasion = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    setAssignForm(prev => {
      const isSelected = prev.event_ids.includes(eventId);
      if (isSelected) {
        const newEventIds = prev.event_ids.filter(id => id !== eventId);
        const newValues = { ...prev.values };
        const newDescriptions = { ...prev.descriptions };
        delete newValues[eventId];
        delete newDescriptions[eventId];
        return { ...prev, event_ids: newEventIds, values: newValues, descriptions: newDescriptions };
      } else {
        return {
          ...prev,
          event_ids: [...prev.event_ids, eventId],
          values: { ...prev.values, [eventId]: event?.default_value || 100 },
          descriptions: { ...prev.descriptions, [eventId]: '' },
        };
      }
    });
  };

  const updateOccasionValue = (eventId: string, value: number) => {
    setAssignForm(prev => ({
      ...prev,
      values: { ...prev.values, [eventId]: value },
    }));
  };

  const updateOccasionDescription = (eventId: string, description: string) => {
    setAssignForm(prev => ({
      ...prev,
      descriptions: { ...prev.descriptions, [eventId]: description },
    }));
  };

  const getEventIcon = (eventType: string) => {
    const Icon = EVENT_ICONS[eventType] || Gift;
    return <Icon className="h-4 w-4" />;
  };

  const formatEventDate = (event: GiftEvent) => {
    if (!event.event_day || !event.event_month) return '';
    return `${event.event_day}/${event.event_month}`;
  };

  const renderAssignmentCard = (assignment: GiftAssignment, showActions = true, showCompletedActions = false) => {
    const Icon = EVENT_ICONS[assignment.event?.event_type || 'custom'] || Gift;
    const isPending = assignment.status === 'pending';
    const isPurchased = assignment.status === 'purchased';
    const dateStr = formatAssignmentDate(assignment);
    const eventName = assignment.event?.event_type === 'birthday' 
      ? `Aniversário de ${assignment.person?.name}`
      : assignment.event?.name;
    
    return (
      <Card key={assignment.id} className={cn(
        "transition-all",
        !isPending && "opacity-80"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                isPending ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{assignment.person?.name}</span>
                  <Badge variant={isPending ? "default" : isPurchased ? "secondary" : "outline"} className="text-xs">
                    {isPending ? 'Pendente' : isPurchased ? 'Comprado' : 'Entregue'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {eventName} {dateStr && `• ${dateStr}`}
                </p>
                {assignment.gift_description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {assignment.gift_description}
                  </p>
                )}
              </div>
            </div>
            
            <div className="text-right shrink-0">
              <p className="font-semibold">{formatMoney(assignment.planned_value)}</p>
              {assignment.actual_value && assignment.actual_value !== assignment.planned_value && (
                <p className="text-xs text-muted-foreground">
                  Pago: {formatMoney(assignment.actual_value)}
                </p>
              )}
            </div>
          </div>
          
          {/* Pending actions */}
          {showActions && isPending && (
            <div className="flex gap-2 mt-3 pt-3 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => handleMarkAsPurchased(assignment)}
              >
                <ShoppingBag className="h-4 w-4 mr-1" />
                Comprado
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditAssignment(assignment)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteAssignment.mutate(assignment.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {showActions && isPurchased && (
            <div className="flex gap-2 mt-3 pt-3 border-t">
              <Button 
                variant="default" 
                size="sm" 
                className="flex-1"
                onClick={() => handleMarkAsDelivered(assignment)}
              >
                <Check className="h-4 w-4 mr-1" />
                Entregue
              </Button>
            </div>
          )}

          {/* Completed actions */}
          {showCompletedActions && !isPending && (
            <div className="flex gap-2 mt-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailAssignment(assignment)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Detalhes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditAssignment(assignment)}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/lancamentos')}
                title="Ver lançamento vinculado"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteAssignment.mutate(assignment.id)}
                className="text-muted-foreground hover:text-destructive"
                title="Excluir presente"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <PageSkeleton variant="cards-grid" metrics={3} items={6} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <BackLink to="/planejamento" label="Planejamento" className="mb-1" />
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">Presentes</h1>
              <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.listaPresentes} />
            </div>
            <p className="text-sm text-muted-foreground">
              Organize seus presentes ao longo do ano
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => openAssignDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Agendar Presente
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{yearAssignments.length}</p>
                  <p className="text-xs text-muted-foreground">Presentes {selectedYear}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingAssignments.length}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatMoney(totalPlanned)}</p>
                  <p className="text-xs text-muted-foreground">Planejado</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Check className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatMoney(totalSpent)}</p>
                  <p className="text-xs text-muted-foreground">Gasto</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Gifts Alert */}
        {upcomingGifts.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-amber-500" />
                <span className="font-medium">Próximos 30 dias</span>
                <Badge variant="outline" className="ml-auto">{upcomingGifts.length} presente(s)</Badge>
              </div>
              <div className="space-y-2">
                {upcomingGifts.slice(0, 3).map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span>
                      {a.person?.name} - {a.event?.event_type === 'birthday' ? `Aniversário` : a.event?.name} ({formatAssignmentDate(a)})
                    </span>
                    <span className="font-medium">{formatMoney(a.planned_value)}</span>
                  </div>
                ))}
                {upcomingGifts.length > 3 && (
                  <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setActiveTab('pending')}>
                    Ver todos <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ SECTION 1: Cadastro de pessoas e ocasiões ═══ */}
        <CollapsibleModule
          title="Cadastro de pessoas e ocasiões"
          description={`${people.length} pessoa(s) • ${events.length} ocasião(ões)`}
          icon={<Settings className="h-4 w-4 text-primary" />}
          useDialogOnDesktop
        >
          <Tabs value={cadastroTab} onValueChange={(v) => setCadastroTab(v as 'people' | 'events')}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="people">
                <Users className="h-4 w-4" />
                <span>Pessoas</span>
              </TabsTrigger>
              <TabsTrigger value="events">
                <PartyPopper className="h-4 w-4" />
                <span>Ocasiões</span>
              </TabsTrigger>
            </TabsList>

            {/* People Sub-Tab */}
            <TabsContent value="people" className="space-y-4">
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </Button>
                <Button size="sm" onClick={() => {
                  setEditingPerson(null);
                  setPersonForm({ name: '', birthday_day: '', birthday_month: '', relationship: '', notes: '' });
                  setPersonDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Pessoa
                </Button>
              </div>
              
              {people.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-6 w-6 text-muted-foreground" />}
                  description="Você ainda não cadastrou nenhuma pessoa"
                  actionLabel="Adicionar primeira pessoa"
                  onAction={() => setPersonDialogOpen(true)}
                />
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-4 font-medium text-muted-foreground">Nome</th>
                            <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Parentesco</th>
                            <th className="text-left p-4 font-medium text-muted-foreground">Aniversário</th>
                            <th className="text-right p-4 font-medium text-muted-foreground hidden md:table-cell">Valor Estimado</th>
                            <th className="text-right p-4 font-medium text-muted-foreground hidden md:table-cell">Valor Realizado</th>
                            <th className="text-center p-4 font-medium text-muted-foreground">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {people.map(person => {
                            const personAssignments = yearAssignments.filter(a => a.person_id === person.id);
                            const estimatedTotal = personAssignments.reduce((sum, a) => sum + (a.planned_value || 0), 0);
                            const actualTotal = personAssignments.reduce((sum, a) => sum + (a.actual_value || 0), 0);
                            
                            return (
                              <tr key={person.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                      <User className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="font-medium">{person.name}</span>
                                  </div>
                                </td>
                                <td className="p-4 hidden sm:table-cell">
                                  {person.relationship ? (
                                    <Badge variant="outline" className="text-xs">
                                      {RELATIONSHIP_LABELS[person.relationship as RelationshipType] || person.relationship}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="p-4">
                                  {person.birthday_day && person.birthday_month ? (
                                    <span className="text-sm">
                                      {String(person.birthday_day).padStart(2, '0')}/{String(person.birthday_month).padStart(2, '0')}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="p-4 text-right hidden md:table-cell">
                                  <span className="text-sm font-medium">{formatMoney(estimatedTotal)}</span>
                                </td>
                                <td className="p-4 text-right hidden md:table-cell">
                                  <span className="text-sm font-medium">{formatMoney(actualTotal)}</span>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => openAssignDialog(person.id)}>
                                      <Gift className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => openEditPerson(person)}>
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deletePerson.mutate(person.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Events/Occasions Sub-Tab */}
            <TabsContent value="events" className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => {
                  setEditingEvent(null);
                  setEventForm({ name: '', event_type: 'custom', event_day: '', event_month: '', default_value: 100 });
                  setEventDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Ocasião
                </Button>
              </div>
              
              {/* Birthday Special Card */}
              {(() => {
                const birthdayAssignmentsForYear = yearAssignments.filter(a => a.event?.event_type === 'birthday');
                const birthdayAssignmentsCount = birthdayAssignmentsForYear.length;
                const peopleWithBirthday = people.filter(p => p.birthday_day && p.birthday_month).length;
                const totalBirthdayPlanned = birthdayAssignmentsForYear
                  .reduce((sum, a) => sum + (a.planned_value || 0), 0);
                
                return (
                  <Card 
                    className="cursor-pointer hover:bg-muted/50 transition-colors border-primary/20 bg-primary/5"
                    onClick={() => setBirthdaySheetOpen(true)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                            <Cake className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-lg">Aniversários</p>
                            <p className="text-sm text-muted-foreground">
                              {peopleWithBirthday} pessoas • {birthdayAssignmentsCount} agendado(s)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm text-muted-foreground">Total planejado</p>
                            <p className="font-semibold text-primary">{formatMoney(totalBirthdayPlanned)}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.filter(e => e.event_type !== 'birthday').map(event => {
                  const Icon = EVENT_ICONS[event.event_type] || Gift;
                  const eventAssignments = yearAssignments.filter(a => a.event_id === event.id);
                  const totalPlannedEvent = eventAssignments.reduce((sum, a) => sum + (a.planned_value || 0), 0);
                  
                  return (
                    <Card 
                      key={event.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setSelectedOccasion(event);
                        setOccasionSheetOpen(true);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{event.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatEventDate(event)} • {formatMoney(event.default_value)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {!event.is_system_event && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => openEditEvent(event)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteEvent.mutate(event.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {event.is_system_event && (
                              <Button variant="ghost" size="icon" onClick={() => openEditEvent(event)}>
                                <Settings className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {eventAssignments.length} pessoa(s) • {formatMoney(totalPlannedEvent)}
                            </p>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          {eventAssignments.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {eventAssignments.slice(0, 4).map(a => (
                                <Badge key={a.id} variant="secondary" className="text-xs">
                                  {a.person?.name}
                                </Badge>
                              ))}
                              {eventAssignments.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{eventAssignments.length - 4}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CollapsibleModule>

        {/* ═══ SECTION 2: Acompanhamento ═══ */}
        <CollapsibleModule
          title="Acompanhamento"
          description={`${pendingAssignments.length} pendente(s) • ${completedAssignments.length} realizado(s)`}
          icon={<Gift className="h-4 w-4 text-primary" />}
          useDialogOnDesktop
          defaultOpen
        >
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="w-full grid grid-cols-3 h-auto p-1">
              <TabsTrigger value="calendar" className="flex items-center gap-2 py-2.5 text-sm">
                <Calendar className="h-4 w-4" />
                <span>Calendário</span>
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2 py-2.5 text-sm">
                <Clock className="h-4 w-4" />
                <span>Pendentes</span>
                {pendingAssignments.length > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1 text-xs ml-0.5">
                    {pendingAssignments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2 py-2.5 text-sm">
                <Check className="h-4 w-4" />
                <span>Realizados</span>
              </TabsTrigger>
            </TabsList>

            {/* Calendar Tab */}
            <TabsContent value="calendar" className="space-y-4">
              <GiftFilters filters={giftFilters} onFiltersChange={setGiftFilters} people={people} events={events} />
              <GiftCalendar
                events={events}
                assignments={filteredYearAssignments}
                year={selectedYear}
              />
            </TabsContent>

            {/* Pending Tab */}
            <TabsContent value="pending" className="space-y-4">
              <GiftFilters filters={giftFilters} onFiltersChange={setGiftFilters} people={people} events={events} />
              {filteredPending.length === 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <EmptyState
                      icon={<Gift className="h-6 w-6 text-muted-foreground" />}
                      description={`Nenhum presente pendente para ${selectedYear}`}
                      actionLabel="Agendar presente"
                      onAction={() => openAssignDialog()}
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredPending.map(a => renderAssignmentCard(a))}
                </div>
              )}
            </TabsContent>

            {/* Completed Tab */}
            <TabsContent value="completed" className="space-y-4">
              <GiftFilters filters={giftFilters} onFiltersChange={setGiftFilters} people={people} events={events} />
              {filteredCompleted.length === 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <EmptyState
                      icon={<Check className="h-6 w-6 text-muted-foreground" />}
                      description={`Nenhum presente realizado em ${selectedYear}`}
                      actionLabel="Agendar presente"
                      onAction={() => openAssignDialog()}
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredCompleted.map(a => renderAssignmentCard(a, false, true))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CollapsibleModule>

        {/* ═══ SECTION 3: Análises ═══ */}
        <CollapsibleModule
          title="Análises"
          description="Orçamento, linha do tempo e gráficos"
          icon={<BarChart3 className="h-4 w-4 text-primary" />}
          useDialogOnDesktop
        >
          <GiftAnalysisTab
            events={events}
            assignments={assignments}
            year={selectedYear}
            people={people}
          />
        </CollapsibleModule>
      </div>

      {/* Person Dialog */}
      <Dialog open={personDialogOpen} onOpenChange={setPersonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPerson ? 'Editar Pessoa' : 'Nova Pessoa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input 
                value={personForm.name}
                onChange={e => setPersonForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome da pessoa"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dia do Aniversário</Label>
                <Select 
                  value={personForm.birthday_day} 
                  onValueChange={v => setPersonForm(prev => ({ ...prev, birthday_day: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mês</Label>
                <Select 
                  value={personForm.birthday_month} 
                  onValueChange={v => setPersonForm(prev => ({ ...prev, birthday_month: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Parentesco</Label>
              <Select 
                value={personForm.relationship} 
                onValueChange={v => setPersonForm(prev => ({ ...prev, relationship: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o parentesco" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RELATIONSHIP_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Ajuda a sugerir ocasiões automaticamente
              </p>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea 
                value={personForm.notes}
                onChange={e => setPersonForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Preferências, tamanhos, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPersonDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePerson} disabled={!personForm.name}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Occasion Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Editar Ocasião' : 'Nova Ocasião'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input 
                value={eventForm.name}
                onChange={e => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome da ocasião"
                disabled={editingEvent?.is_system_event}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dia</Label>
                <Select 
                  value={eventForm.event_day} 
                  onValueChange={v => setEventForm(prev => ({ ...prev, event_day: v }))}
                  disabled={editingEvent?.is_system_event}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mês</Label>
                <Select 
                  value={eventForm.event_month} 
                  onValueChange={v => setEventForm(prev => ({ ...prev, event_month: v }))}
                  disabled={editingEvent?.is_system_event}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Valor Padrão do Presente</Label>
              <CurrencyInput 
                value={eventForm.default_value}
                onChange={v => setEventForm(prev => ({ ...prev, default_value: v }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Este valor será sugerido ao agendar presentes para esta ocasião
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEvent} disabled={!eventForm.name}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? 'Editar Presente' : 'Agendar Presente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pessoa *</Label>
              <Select 
                value={assignForm.person_id} 
                onValueChange={v => setAssignForm(prev => ({ ...prev, person_id: v }))}
                disabled={!!editingAssignment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a pessoa" />
                </SelectTrigger>
                <SelectContent>
                  {people.map(person => (
                    <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {!editingAssignment && (
              <div>
                <Label>Ocasiões de Presente *</Label>
                <p className="text-xs text-muted-foreground mb-2">Selecione uma ou mais ocasiões</p>
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {events.map(event => {
                    const isSelected = assignForm.event_ids.includes(event.id);
                    const Icon = EVENT_ICONS[event.event_type] || Gift;
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50",
                          isSelected && "bg-primary/10"
                        )}
                        onClick={() => toggleOccasion(event.id)}
                      >
                        <div className={cn(
                          "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input"
                        )}>
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{event.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatEventDate(event)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Individual values for each selected occasion */}
            {assignForm.event_ids.length > 0 && (
              <div className="space-y-3">
                <Label>Valores por Ocasião</Label>
                {assignForm.event_ids.map(eventId => {
                  const event = events.find(e => e.id === eventId);
                  if (!event) return null;
                  const Icon = EVENT_ICONS[event.event_type] || Gift;
                  return (
                    <div key={eventId} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Icon className="h-4 w-4 text-primary" />
                        {event.name}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Valor</Label>
                          <CurrencyInput 
                            value={assignForm.values[eventId] || 0}
                            onChange={v => updateOccasionValue(eventId, v)}
                            compact
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Ideia</Label>
                          <Input 
                            value={assignForm.descriptions[eventId] || ''}
                            onChange={e => updateOccasionDescription(eventId, e.target.value)}
                            placeholder="Presente..."
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {assignForm.event_ids.length > 1 && (
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-semibold">
                      {formatMoney(Object.values(assignForm.values).reduce((sum, v) => sum + v, 0))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editingAssignment && editingAssignment.status !== 'pending' && (
              <Button 
                variant="destructive" 
                className="sm:mr-auto"
                onClick={async () => {
                  await updateAssignment.mutateAsync({
                    id: editingAssignment.id,
                    status: 'pending',
                    actual_value: null,
                    purchase_date: null,
                  });
                  setAssignDialogOpen(false);
                  setEditingAssignment(null);
                }}
              >
                Cancelar Compra
              </Button>
            )}
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleSaveAssignment} 
              disabled={!assignForm.person_id || assignForm.event_ids.length === 0}
            >
              {editingAssignment ? 'Salvar' : `Agendar ${assignForm.event_ids.length > 1 ? `(${assignForm.event_ids.length})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog for completed assignments */}
      <Dialog open={!!detailAssignment} onOpenChange={(open) => !open && setDetailAssignment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Presente</DialogTitle>
          </DialogHeader>
          {detailAssignment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Pessoa</Label>
                  <p className="font-medium">{detailAssignment.person?.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ocasião</Label>
                  <p className="font-medium">
                    {detailAssignment.event?.event_type === 'birthday' 
                      ? 'Aniversário' 
                      : detailAssignment.event?.name}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data do Evento</Label>
                  <p className="font-medium">{formatAssignmentDate(detailAssignment)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge variant={detailAssignment.status === 'purchased' ? 'secondary' : 'default'}>
                    {detailAssignment.status === 'purchased' ? 'Comprado' : 'Entregue'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Valor Planejado</Label>
                  <p className="font-medium">{formatMoney(detailAssignment.planned_value)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Valor Pago</Label>
                  <p className="font-medium">{formatMoney(detailAssignment.actual_value || 0)}</p>
                </div>
                {detailAssignment.gift_description && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Descrição</Label>
                    <p className="font-medium">{detailAssignment.gift_description}</p>
                  </div>
                )}
                {detailAssignment.purchase_date && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Data da Compra</Label>
                    <p className="font-medium">{detailAssignment.purchase_date}</p>
                  </div>
                )}
                {detailAssignment.notes && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Observações</Label>
                    <p className="font-medium">{detailAssignment.notes}</p>
                  </div>
                )}
              </div>

              {/* Links to related transactions */}
              <div className="pt-4 border-t">
                <Label className="text-xs text-muted-foreground mb-2 block">Vincular ao lançamento</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailAssignment(null);
                      navigate('/lancamentos');
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Lançamentos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailAssignment(null);
                      navigate('/cartao-de-credito');
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Cartão de Crédito
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailAssignment(null)}>Fechar</Button>
            <Button onClick={() => {
              if (detailAssignment) {
                openEditAssignment(detailAssignment);
                setDetailAssignment(null);
              }
            }}>
              <Edit2 className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Birthday Gifts Sheet */}
      <BirthdayGiftsSheet
        open={birthdaySheetOpen}
        onOpenChange={setBirthdaySheetOpen}
        people={people}
        events={events}
        assignments={assignments}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        onSaveBirthdayAssignments={async (data) => {
          await bulkUpsertBirthdayAssignments.mutateAsync(
            data.map(d => ({ ...d, year: selectedYear }))
          );
        }}
      />

      {/* Occasion People Sheet */}
      <OccasionPeopleSheet
        open={occasionSheetOpen}
        onOpenChange={setOccasionSheetOpen}
        event={selectedOccasion}
        people={people}
        assignments={assignments}
        selectedYear={selectedYear}
        onSave={async (eventId, data) => {
          await bulkUpsertOccasionAssignments.mutateAsync({
            eventId,
            year: selectedYear,
            assignments: data,
          });
        }}
      />

      {/* Import People Dialog */}
      <ImportPeopleDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={async (names) => {
          await addPeopleBulk.mutateAsync(names);
        }}
      />
    </AppLayout>
  );
};

export default Presentes;
