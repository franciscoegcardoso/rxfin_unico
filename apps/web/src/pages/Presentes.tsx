import React, { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { HeaderMetricCard } from '@/components/shared/HeaderMetricCard';
import { Badge } from '@/components/ui/badge';
import { Gift, CalendarRange, Wallet, Clock, Heart, Egg, Star, TreePine, Cake } from 'lucide-react';
import { useGiftsPlanner } from '@/hooks/useGiftsPlanner';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const EVENT_ICONS: Record<string, React.ElementType> = {
  christmas: TreePine,
  valentines_day: Gift,
  mothers_day: Heart,
  fathers_day: Heart,
  easter: Egg,
  childrens_day: Star,
  birthday: Cake,
};

function getEventIcon(type?: string): React.ElementType {
  if (!type) return Gift;
  return EVENT_ICONS[type] ?? Gift;
}

function formatEventDate(day?: number, month?: number): string {
  if (day == null || month == null) return '—';
  return `${day} de ${MONTHS_PT[month - 1] ?? ''}`;
}

function formatNextEventDate(day?: number, month?: number): string {
  if (day == null || month == null) return '';
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

export const Presentes: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { data, loading, error } = useGiftsPlanner(selectedYear);

  const summary = data?.summary ?? {};
  const events = data?.events ?? [];
  const nextEvent = summary.next_event;

  const eventsByMonth = useMemo(() => {
    const byMonth: Map<number, typeof events> = new Map();
    for (const ev of events) {
      const month = ev.month ?? 0;
      if (!byMonth.has(month)) byMonth.set(month, []);
      byMonth.get(month)!.push(ev);
    }
    for (const arr of byMonth.values()) {
      arr.sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
    }
    const sortedMonths = [...byMonth.keys()].sort((a, b) => a - b);
    return sortedMonths.map((m) => ({ month: m, events: byMonth.get(m) ?? [] }));
  }, [events]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Gift}
          title="Presentes"
          subtitle="Planejamento de presentes para o ano"
        />

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Carregando...</span>
          </div>
        )}
        {error && (
          <Card className="rounded-[14px] border-destructive/50 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        )}

        {!loading && !error && data && (
          <>
            {/* A) Cards de resumo - 4 colunas (padrão bens-investimentos) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <Card className="rounded-[14px] border border-border/80 bg-card shadow-sm">
                <CardContent className="flex items-center gap-2 p-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 [&>svg]:h-4 [&>svg]:w-4 text-primary">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate">Próximo evento</p>
                    <p className="text-sm font-semibold text-foreground truncate tabular-nums">
                      {nextEvent?.name ?? '—'}
                      {nextEvent?.day != null && nextEvent?.month != null && (
                        <span className="text-muted-foreground font-normal"> em {formatNextEventDate(nextEvent.day, nextEvent.month)}</span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <HeaderMetricCard label="Total planejado" value={formatCurrency(summary.total_planned ?? 0)} variant="blue" icon={<CalendarRange className="h-4 w-4" />} />
              <HeaderMetricCard label="Total gasto" value={formatCurrency(summary.total_spent ?? 0)} variant="positive" icon={<Wallet className="h-4 w-4" />} />
              <HeaderMetricCard label="Pendentes" value={`${summary.total_pending ?? 0} presente(s)`} variant="amber" icon={<Clock className="h-4 w-4" />} />
            </div>

            {/* B) Timeline de eventos */}
            <section>
              <h2 className="mb-3 text-lg font-semibold">Eventos do ano</h2>
              {eventsByMonth.length === 0 ? (
                <Card className="rounded-[14px] border border-border/80 p-12 text-center">
                  <Gift className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-3 text-muted-foreground">Nenhum evento cadastrado para este ano.</p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {eventsByMonth.map(({ month, events: monthEvents }) => (
                    <div key={month}>
                      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                        {MONTHS_PT[month - 1] ?? `Mês ${month}`}
                      </h3>
                      <div className="space-y-3">
                        {monthEvents.map((ev, i) => {
                          const Icon = getEventIcon(ev.type);
                          const totalPlanned = ev.total_planned ?? 0;
                          const defaultVal = ev.default_value ?? 0;
                          const displayValue = totalPlanned > 0 ? totalPlanned : defaultVal;
                          const assignments = ev.assignments ?? [];
                          const done = assignments.filter((a) => a.status !== 'pending').length;
                          const total = assignments.length;
                          return (
                            <Card
                              key={ev.id ?? i}
                              className="rounded-[14px] border border-border/80 p-4"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                  <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-bold">{ev.name ?? 'Evento'}</p>
                                    {ev.is_upcoming != null && (
                                      <Badge variant={ev.is_upcoming ? 'secondary' : 'outline'}>
                                        {ev.is_upcoming
                                          ? `Em ${ev.days_until ?? 0} dias`
                                          : 'Passou'}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {formatEventDate(ev.day, ev.month)}
                                  </p>
                                  <p className="mt-1 text-sm font-medium">
                                    {displayValue > 0
                                      ? formatCurrency(displayValue)
                                      : `Sugestão: ${formatCurrency(defaultVal)}`}
                                  </p>
                                  {total > 0 ? (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {done} de {total} presentes prontos
                                    </p>
                                  ) : (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Nenhum presente atribuído
                                    </p>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Presentes;
