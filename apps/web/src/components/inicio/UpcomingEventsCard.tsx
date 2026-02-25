import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGifts, GiftEvent, GiftPerson } from '@/hooks/useGifts';
import { Gift, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpcomingEvent {
  event: GiftEvent;
  date: Date;
  daysUntil: number;
  people: GiftPerson[];
  pendingCount: number;
}

export const UpcomingEventsCard: React.FC = () => {
  const navigate = useNavigate();
  const { events, assignments, people } = useGifts();

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    const results: UpcomingEvent[] = [];

    for (const event of events) {
      if (!event.event_day || !event.event_month) continue;

      // Build date for this year
      let eventDate = new Date(currentYear, event.event_month - 1, event.event_day);
      // If the date already passed, check next year
      if (eventDate < today) {
        eventDate = new Date(currentYear + 1, event.event_month - 1, event.event_day);
      }

      const diffMs = eventDate.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysUntil <= 30) {
        // Find people with pending assignments for this event
        const eventAssignments = assignments.filter(
          a => a.event_id === event.id && a.year === eventDate.getFullYear() && a.status === 'pending'
        );
        const assignedPeople = eventAssignments
          .map(a => people.find(p => p.id === a.person_id))
          .filter(Boolean) as GiftPerson[];

        results.push({
          event,
          date: eventDate,
          daysUntil,
          people: assignedPeople,
          pendingCount: eventAssignments.length,
        });
      }
    }

    // Also check birthdays from people
    for (const person of people) {
      if (!person.birthday_day || !person.birthday_month) continue;

      let bDate = new Date(currentYear, person.birthday_month - 1, person.birthday_day);
      if (bDate < today) {
        bDate = new Date(currentYear + 1, person.birthday_month - 1, person.birthday_day);
      }

      const diffMs = bDate.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysUntil <= 30) {
        // Check if there's already an event entry for birthday
        const alreadyListed = results.some(
          r => r.event.event_type === 'birthday' && r.daysUntil === daysUntil
        );
        if (!alreadyListed) {
          // Find birthday event
          const birthdayEvent = events.find(e => e.event_type === 'birthday');
          if (birthdayEvent) {
            const pendingAssignments = assignments.filter(
              a => a.event_id === birthdayEvent.id && a.person_id === person.id && a.year === bDate.getFullYear() && a.status === 'pending'
            );
            results.push({
              event: { ...birthdayEvent, name: `Aniversário de ${person.name}` },
              date: bDate,
              daysUntil,
              people: [person],
              pendingCount: pendingAssignments.length,
            });
          }
        }
      }
    }

    return results.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [events, assignments, people]);

  if (upcomingEvents.length === 0) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const getDaysLabel = (days: number) => {
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Amanhã';
    return `em ${days} dias`;
  };

  const getDaysBadgeVariant = (days: number) => {
    if (days <= 3) return 'destructive' as const;
    if (days <= 7) return 'default' as const;
    return 'secondary' as const;
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" /> Próximos Eventos
        </CardTitle>
        <button
          onClick={() => navigate('/presentes')}
          className="text-xs text-primary flex items-center gap-0.5"
        >
          Ver todos <ChevronRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcomingEvents.slice(0, 5).map((item, idx) => (
          <button
            key={`${item.event.id}-${idx}`}
            onClick={() => navigate('/presentes')}
            className="w-full flex items-center gap-3 py-2 border-b border-border/50 last:border-0 text-left hover:bg-muted/50 rounded-md px-1 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Gift className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.event.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(item.date)}
                {item.pendingCount > 0 && (
                  <span className="text-warning"> · {item.pendingCount} pendente(s)</span>
                )}
              </p>
            </div>
            <Badge variant={getDaysBadgeVariant(item.daysUntil)} className="text-[10px] shrink-0">
              {getDaysLabel(item.daysUntil)}
            </Badge>
          </button>
        ))}
      </CardContent>
    </Card>
  );
};
