import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  Gift,
  Cake,
  TreePine,
  Flower2,
  User,
  PartyPopper,
  Baby,
  Heart,
} from 'lucide-react';
import { GiftEvent, GiftAssignment } from '@/hooks/useGifts';

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

const EVENT_COLORS: Record<string, string> = {
  birthday: 'bg-pink-500',
  christmas: 'bg-emerald-600',
  mothers_day: 'bg-rose-500',
  fathers_day: 'bg-blue-600',
  easter: 'bg-amber-500',
  childrens_day: 'bg-cyan-500',
  valentines_day: 'bg-red-500',
  custom: 'bg-violet-500',
};

const EVENT_COLORS_LIGHT: Record<string, string> = {
  birthday: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
  christmas: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  mothers_day: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  fathers_day: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  easter: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  childrens_day: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
  valentines_day: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  custom: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface CalendarEvent {
  date: Date;
  event: GiftEvent;
  assignments: GiftAssignment[];
  label?: string; // For birthdays: person's name
}

interface GiftCalendarProps {
  events: GiftEvent[];
  assignments: GiftAssignment[];
  year: number;
  onAssignmentClick?: (assignment: GiftAssignment) => void;
}

export const GiftCalendar: React.FC<GiftCalendarProps> = ({
  events,
  assignments,
  year,
  onAssignmentClick,
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  // Build calendar events - handle birthdays using person's birthday date
  const calendarEvents = useMemo(() => {
    const result: CalendarEvent[] = [];

    // Add non-birthday events normally
    events.forEach((event) => {
      if (event.event_type === 'birthday') return; // Handle separately
      if (!event.event_day || !event.event_month) return;
      const date = new Date(year, event.event_month - 1, event.event_day);
      const eventAssignments = assignments.filter(
        (a) => a.event_id === event.id && a.year === year
      );
      result.push({ date, event, assignments: eventAssignments });
    });

    // Handle birthday assignments - group by person's birthday date
    const birthdayAssignments = assignments.filter(
      (a) => a.event?.event_type === 'birthday' && a.year === year
    );

    // Group by person's birthday date
    const birthdayByDate = new Map<string, GiftAssignment[]>();
    birthdayAssignments.forEach((a) => {
      if (a.person?.birthday_day && a.person?.birthday_month) {
        const key = `${a.person.birthday_month}-${a.person.birthday_day}`;
        if (!birthdayByDate.has(key)) birthdayByDate.set(key, []);
        birthdayByDate.get(key)!.push(a);
      }
    });

    // Create calendar entries for each birthday date
    birthdayByDate.forEach((bAssignments, key) => {
      const [month, day] = key.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const birthdayEvent = bAssignments[0].event!;
      const label = bAssignments.length === 1 
        ? `Aniversário de ${bAssignments[0].person?.name}`
        : `Aniversários (${bAssignments.length})`;
      result.push({ 
        date, 
        event: { ...birthdayEvent, name: label, event_day: day, event_month: month },
        assignments: bAssignments,
        label,
      });
    });

    // Also add people with birthdays who DON'T have assignments yet (for calendar awareness)
    // This is done via the events list - check for individual birthday events
    events.forEach((event) => {
      if (event.event_type !== 'birthday' || !event.event_day || !event.event_month) return;
      const date = new Date(year, event.event_month - 1, event.event_day);
      const dateKey = `${event.event_month}-${event.event_day}`;
      if (!birthdayByDate.has(dateKey)) {
        const eventAssignments = assignments.filter(
          (a) => a.event_id === event.id && a.year === year
        );
        result.push({ date, event, assignments: eventAssignments });
      }
    });

    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, assignments, year]);

  // Events for the current month (calendar view)
  const monthEvents = useMemo(
    () => calendarEvents.filter((e) => e.date.getMonth() === currentMonth),
    [calendarEvents, currentMonth]
  );

  // Generate calendar grid
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, currentMonth, 1);
    const lastDay = new Date(year, currentMonth + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < startPadding; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    while (days.length % 7 !== 0) days.push(null);

    return days;
  }, [year, currentMonth]);

  const getEventsForDay = (day: number) =>
    monthEvents.filter((e) => e.date.getDate() === day);

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === currentMonth &&
    today.getDate() === day;

  const isPast = (day: number) => {
    const d = new Date(year, currentMonth, day);
    d.setHours(23, 59, 59);
    return d < today;
  };

  const goToPrevMonth = () => {
    if (currentMonth === 0) return;
    setCurrentMonth(currentMonth - 1);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) return;
    setCurrentMonth(currentMonth + 1);
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
  };

  const formatMoney = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        {/* Calendar month navigation - only for calendar view */}
        {viewMode === 'calendar' ? (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevMonth} disabled={currentMonth === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="font-semibold min-w-[160px] text-center" onClick={goToToday}>
              {MONTHS_PT[currentMonth]} {year}
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextMonth} disabled={currentMonth === 11}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Todos os eventos de {year}
            </span>
          </div>
        )}

        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2.5 gap-1.5"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">Calendário</span>
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2.5 gap-1.5"
            onClick={() => setViewMode('list')}
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">Lista</span>
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Card>
          <CardContent className="p-2 sm:p-4">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-px bg-border/50 rounded-lg overflow-hidden">
              {calendarGrid.map((day, idx) => {
                const dayEvents = day ? getEventsForDay(day) : [];
                const dayIsToday = day ? isToday(day) : false;
                const dayIsPast = day ? isPast(day) : false;

                return (
                  <div
                    key={idx}
                    className={cn(
                      'min-h-[72px] sm:min-h-[90px] bg-card p-1 relative',
                      !day && 'bg-muted/20',
                      dayIsPast && day && 'opacity-60',
                    )}
                  >
                    {day && (
                      <>
                        <span
                          className={cn(
                            'inline-flex items-center justify-center w-6 h-6 text-xs rounded-full',
                            dayIsToday && 'bg-primary text-primary-foreground font-bold',
                            !dayIsToday && 'text-foreground'
                          )}
                        >
                          {day}
                        </span>

                        <div className="space-y-0.5 mt-0.5">
                          {dayEvents.slice(0, 2).map((ce, i) => {
                            const colorClass = EVENT_COLORS[ce.event.event_type] || EVENT_COLORS.custom;
                            return (
                              <div
                                key={i}
                                className={cn(
                                  'text-[10px] sm:text-xs leading-tight px-1 py-0.5 rounded truncate text-white font-medium cursor-default',
                                  colorClass
                                )}
                                title={`${ce.event.name} (${ce.assignments.length} presente${ce.assignments.length !== 1 ? 's' : ''})`}
                              >
                                <span className="hidden sm:inline">{ce.event.name}</span>
                                <span className="sm:hidden">
                                  {ce.event.name.length > 6
                                    ? ce.event.name.slice(0, 6) + '…'
                                    : ce.event.name}
                                </span>
                              </div>
                            );
                          })}
                          {dayEvents.length > 2 && (
                            <span className="text-[10px] text-muted-foreground pl-1">
                              +{dayEvents.length - 2}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Month event summary below calendar */}
            {monthEvents.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Eventos em {MONTHS_PT[currentMonth]}
                </p>
                {monthEvents.map((ce, i) => {
                  const Icon = EVENT_ICONS[ce.event.event_type] || Gift;
                  const colorLight = EVENT_COLORS_LIGHT[ce.event.event_type] || EVENT_COLORS_LIGHT.custom;
                  const totalPlanned = ce.assignments.reduce((s, a) => s + (a.planned_value || 0), 0);

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', colorLight)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ce.event.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ce.date.getDate()}/{ce.date.getMonth() + 1} •{' '}
                          {ce.assignments.length} presente{ce.assignments.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {totalPlanned > 0 && (
                        <span className="text-sm font-semibold text-foreground shrink-0">
                          {formatMoney(totalPlanned)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {monthEvents.length === 0 && (
              <div className="mt-4 text-center py-6 text-sm text-muted-foreground">
                Nenhum evento em {MONTHS_PT[currentMonth]}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* List View - show ALL events grouped by month, no month filter */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {calendarEvents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum evento cadastrado para {year}</p>
              </CardContent>
            </Card>
          ) : (
            (() => {
              // Group by month
              const grouped: Record<number, CalendarEvent[]> = {};
              calendarEvents.forEach((ce) => {
                const m = ce.date.getMonth();
                if (!grouped[m]) grouped[m] = [];
                if (!grouped[m].some((e) => e.event.id === ce.event.id && e.date.getTime() === ce.date.getTime())) {
                  grouped[m].push(ce);
                }
              });

              return Object.entries(grouped)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([monthIdx, monthEvts]) => {
                  const mIdx = Number(monthIdx);
                  const isCurrentMonth = today.getMonth() === mIdx && today.getFullYear() === year;
                  const isMonthPast = new Date(year, mIdx + 1, 0) < today;

                  return (
                    <div key={mIdx}>
                      <div className="flex items-center gap-2 mb-3">
                        <h3
                          className={cn(
                            'text-sm font-semibold',
                            isCurrentMonth && 'text-primary',
                            isMonthPast && 'text-muted-foreground'
                          )}
                        >
                          {MONTHS_PT[mIdx]}
                        </h3>
                        {isCurrentMonth && (
                          <Badge variant="default" className="text-[10px] h-5">
                            Mês atual
                          </Badge>
                        )}
                        <div className="flex-1 h-px bg-border" />
                      </div>

                      <div className="space-y-2">
                        {monthEvts.map((ce, i) => {
                          const Icon = EVENT_ICONS[ce.event.event_type] || Gift;
                          const colorLight =
                            EVENT_COLORS_LIGHT[ce.event.event_type] || EVENT_COLORS_LIGHT.custom;
                          const colorDot =
                            EVENT_COLORS[ce.event.event_type] || EVENT_COLORS.custom;
                          const totalPlanned = ce.assignments.reduce(
                            (s, a) => s + (a.planned_value || 0),
                            0
                          );
                          const dateIsPast = ce.date < today;
                          const pendingCount = ce.assignments.filter(
                            (a) => a.status === 'pending'
                          ).length;
                          const doneCount = ce.assignments.filter(
                            (a) => a.status !== 'pending'
                          ).length;

                          return (
                            <Card
                              key={i}
                              className={cn(
                                'transition-all',
                                dateIsPast && 'opacity-60'
                              )}
                            >
                              <CardContent className="p-3 sm:p-4">
                                <div className="flex items-start gap-3">
                                  {/* Date column */}
                                  <div className="flex flex-col items-center w-12 shrink-0">
                                    <span className="text-[10px] uppercase font-medium text-muted-foreground">
                                      {WEEKDAYS[ce.date.getDay()]}
                                    </span>
                                    <span
                                      className={cn(
                                        'text-xl font-bold w-10 h-10 flex items-center justify-center rounded-full',
                                        isToday(ce.date.getDate()) &&
                                          ce.date.getMonth() === today.getMonth()
                                          ? 'bg-primary text-primary-foreground'
                                          : 'text-foreground'
                                      )}
                                    >
                                      {ce.date.getDate()}
                                    </span>
                                  </div>

                                  {/* Color bar */}
                                  <div className={cn('w-1 self-stretch rounded-full shrink-0', colorDot)} />

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <p className="font-medium text-sm truncate">
                                        {ce.event.name}
                                      </p>
                                    </div>

                                    {/* Assignments preview */}
                                    {ce.assignments.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {ce.assignments.slice(0, 3).map((a) => (
                                          <div
                                            key={a.id}
                                            className="flex items-center justify-between text-xs cursor-pointer hover:bg-accent/50 rounded px-1.5 py-1 -mx-1.5"
                                            onClick={() => onAssignmentClick?.(a)}
                                          >
                                            <span className="text-muted-foreground truncate">
                                              {a.person?.name}
                                              {a.gift_description && ` • ${a.gift_description}`}
                                            </span>
                                            <Badge
                                              variant={
                                                a.status === 'pending'
                                                  ? 'outline'
                                                  : a.status === 'purchased'
                                                  ? 'secondary'
                                                  : 'default'
                                              }
                                              className="text-[10px] h-4 ml-2 shrink-0"
                                            >
                                              {a.status === 'pending'
                                                ? formatMoney(a.planned_value)
                                                : a.status === 'purchased'
                                                ? 'Comprado'
                                                : 'Entregue'}
                                            </Badge>
                                          </div>
                                        ))}
                                        {ce.assignments.length > 3 && (
                                          <p className="text-[10px] text-muted-foreground pl-1.5">
                                            +{ce.assignments.length - 3} mais
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {ce.assignments.length === 0 && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Nenhum presente agendado
                                      </p>
                                    )}
                                  </div>

                                  {/* Right summary */}
                                  <div className="text-right shrink-0">
                                    {totalPlanned > 0 && (
                                      <p className="text-sm font-semibold">{formatMoney(totalPlanned)}</p>
                                    )}
                                    <div className="flex items-center gap-1 mt-1 justify-end">
                                      {pendingCount > 0 && (
                                        <Badge variant="outline" className="text-[10px] h-4">
                                          {pendingCount} pend.
                                        </Badge>
                                      )}
                                      {doneCount > 0 && (
                                        <Badge variant="secondary" className="text-[10px] h-4">
                                          {doneCount} ✓
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
            })()
          )}
        </div>
      )}
    </div>
  );
};
