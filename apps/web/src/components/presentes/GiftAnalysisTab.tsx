import React, { useMemo, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Gift,
  Cake,
  TreePine,
  Flower2,
  User,
  PartyPopper,
  Baby,
  Heart,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { GiftEvent, GiftAssignment, GiftPerson } from '@/hooks/useGifts';
import { AnimatedChartContainer } from '@/components/charts/AnimatedChartContainer';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const EVENT_CHART_COLORS: Record<string, string> = {
  birthday: '#ec4899',
  christmas: '#059669',
  mothers_day: '#f43f5e',
  fathers_day: '#2563eb',
  easter: '#f59e0b',
  childrens_day: '#06b6d4',
  valentines_day: '#ef4444',
  custom: '#8b5cf6',
};

const formatMoney = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface GiftAnalysisTabProps {
  events: GiftEvent[];
  assignments: GiftAssignment[];
  year: number;
  people: { id: string; name: string; birthday_day: number | null; birthday_month: number | null }[];
}

interface TimelineEvent {
  month: number;
  day: number;
  name: string;
  type: string;
  planned: number;
  actual: number;
  pendingCount: number;
  doneCount: number;
  assignments: GiftAssignment[];
}

export const GiftAnalysisTab: React.FC<GiftAnalysisTabProps> = ({
  events,
  assignments,
  year: initialYear,
  people,
}) => {
  const isMobile = useIsMobile();
  const [timelineYear, setTimelineYear] = useState(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [detailEvent, setDetailEvent] = useState<TimelineEvent | null>(null);
  const [chartMonthDetail, setChartMonthDetail] = useState<number | null>(null);

  const yearAssignments = useMemo(
    () => assignments.filter((a) => a.year === timelineYear),
    [assignments, timelineYear]
  );

  // Build monthly budget data
  const monthlyData = useMemo(() => {
    const data = MONTHS_SHORT.map((name, idx) => ({
      name,
      month: idx,
      planejado: 0,
      realizado: 0,
      eventos: 0,
    }));

    yearAssignments.forEach((a) => {
      let eventMonth: number | null = null;
      if (a.event?.event_type === 'birthday' && a.person?.birthday_month) {
        eventMonth = a.person.birthday_month - 1;
      } else if (a.event?.event_month) {
        eventMonth = a.event.event_month - 1;
      }
      if (eventMonth !== null && eventMonth >= 0 && eventMonth < 12) {
        data[eventMonth].planejado += a.planned_value || 0;
        data[eventMonth].realizado += a.actual_value || 0;
      }
    });

    events.forEach((e) => {
      if (e.event_month && e.event_type !== 'birthday') {
        data[e.event_month - 1].eventos += 1;
      }
    });

    const birthdayMonths = new Set<number>();
    yearAssignments.forEach((a) => {
      if (a.event?.event_type === 'birthday' && a.person?.birthday_month) {
        birthdayMonths.add(a.person.birthday_month - 1);
      }
    });
    birthdayMonths.forEach((m) => {
      data[m].eventos += 1;
    });

    return data;
  }, [yearAssignments, events]);

  // Budget by event type
  const budgetByType = useMemo(() => {
    const typeMap = new Map<string, { name: string; type: string; planned: number; actual: number; count: number }>();
    yearAssignments.forEach((a) => {
      const type = a.event?.event_type || 'custom';
      const name = a.event?.name || 'Outro';
      if (!typeMap.has(type)) {
        typeMap.set(type, {
          name: type === 'birthday' ? 'Aniversários' : name,
          type, planned: 0, actual: 0, count: 0,
        });
      }
      const entry = typeMap.get(type)!;
      entry.planned += a.planned_value || 0;
      entry.actual += a.actual_value || 0;
      entry.count += 1;
    });
    return Array.from(typeMap.values()).sort((a, b) => b.planned - a.planned);
  }, [yearAssignments]);

  // Totals
  const totals = useMemo(() => {
    const planned = yearAssignments.reduce((s, a) => s + (a.planned_value || 0), 0);
    const actual = yearAssignments.reduce((s, a) => s + (a.actual_value || 0), 0);
    return { planned, actual, total: yearAssignments.length };
  }, [yearAssignments]);

  // Timeline events (sorted by date)
  const timelineEvents = useMemo(() => {
    const items: TimelineEvent[] = [];
    const grouped = new Map<string, GiftAssignment[]>();

    yearAssignments.forEach((a) => {
      let month: number | null = null;
      let day: number | null = null;
      if (a.event?.event_type === 'birthday' && a.person?.birthday_month && a.person?.birthday_day) {
        month = a.person.birthday_month;
        day = a.person.birthday_day;
      } else if (a.event?.event_month && a.event?.event_day) {
        month = a.event.event_month;
        day = a.event.event_day;
      }
      if (month && day) {
        const key = `${a.event?.event_type || 'custom'}-${month}-${day}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(a);
      }
    });

    grouped.forEach((groupAssignments, key) => {
      const [type, monthStr, dayStr] = key.split('-');
      const month = parseInt(monthStr);
      const day = parseInt(dayStr);
      const first = groupAssignments[0];
      const name = type === 'birthday'
        ? (groupAssignments.length === 1 ? `Aniversário de ${first.person?.name}` : `Aniversários (${groupAssignments.length})`)
        : first.event?.name || 'Evento';

      items.push({
        month, day, name, type,
        planned: groupAssignments.reduce((s, a) => s + (a.planned_value || 0), 0),
        actual: groupAssignments.reduce((s, a) => s + (a.actual_value || 0), 0),
        pendingCount: groupAssignments.filter((a) => a.status === 'pending').length,
        doneCount: groupAssignments.filter((a) => a.status !== 'pending').length,
        assignments: groupAssignments,
      });
    });

    return items.sort((a, b) => a.month - b.month || a.day - b.day);
  }, [yearAssignments]);

  const filteredTimelineEvents = useMemo(() => {
    if (selectedMonth === null) return timelineEvents;
    return timelineEvents.filter((e) => e.month === selectedMonth + 1);
  }, [timelineEvents, selectedMonth]);

  const currentMonth = new Date().getMonth();
  const today = new Date();

  // Pie chart data
  const pieData = useMemo(() => {
    return budgetByType.map((item) => ({
      name: item.name,
      value: item.planned,
      color: EVENT_CHART_COLORS[item.type] || EVENT_CHART_COLORS.custom,
    }));
  }, [budgetByType]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: p.color }} />
              {p.name === 'planejado' ? 'Planejado' : 'Realizado'}: {formatMoney(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Available years from assignments
  const availableYears = useMemo(() => {
    const years = new Set(assignments.map((a) => a.year));
    years.add(new Date().getFullYear());
    years.add(timelineYear);
    return Array.from(years).sort();
  }, [assignments, timelineYear]);

  if (yearAssignments.length === 0 && assignments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum presente agendado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Agende presentes para ver a análise do seu orçamento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      {/* Monthly Budget Chart */}
      <AnimatedChartContainer delay={0.2}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Orçamento Mensal de Presentes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Distribuição dos gastos com presentes ao longo do ano
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  onClick={(state) => {
                    if (state?.activeTooltipIndex != null) {
                      setChartMonthDetail(state.activeTooltipIndex);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis hide={isMobile} tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="planejado" name="planejado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.8} />
                  <Bar dataKey="realizado" name="realizado" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} opacity={0.9} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-primary opacity-80" />
                Planejado
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
                Realizado
              </div>
            </div>
          </CardContent>
        </Card>
      </AnimatedChartContainer>

      {/* Pie Chart - Budget by Category (full width now) */}
      <AnimatedChartContainer delay={0.3}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Orçamento por Ocasião</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatMoney(value)} />
                  <Legend
                    formatter={(value: string) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </AnimatedChartContainer>

      {/* Year Timeline */}
      <AnimatedChartContainer delay={0.4}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Linha do Tempo — {timelineYear}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedMonth !== null
                    ? `Eventos em ${MONTHS_PT[selectedMonth]}`
                    : 'Clique em um mês para filtrar os eventos'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setTimelineYear((y) => y - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold tabular-nums w-12 text-center">{timelineYear}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setTimelineYear((y) => y + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Month bar - clickable */}
              <div className="flex gap-0.5 mb-6">
                {MONTHS_SHORT.map((m, idx) => {
                  const isCurrentM = idx === currentMonth && timelineYear === today.getFullYear();
                  const isPastM = timelineYear < today.getFullYear() || (timelineYear === today.getFullYear() && idx < currentMonth);
                  const monthBudget = monthlyData[idx].planejado;
                  const hasEvents = timelineEvents.some((e) => e.month === idx + 1);
                  const isSelected = selectedMonth === idx;

                  return (
                    <button
                      key={idx}
                      className={cn(
                        'flex-1 text-center cursor-pointer rounded-md py-1 transition-all',
                        isSelected && 'bg-primary/10 ring-1 ring-primary/40'
                      )}
                      onClick={() => setSelectedMonth(isSelected ? null : idx)}
                    >
                      <div
                        className={cn(
                          'h-2 rounded-full transition-all mx-auto',
                          isSelected ? 'bg-primary' :
                          isCurrentM ? 'bg-primary' :
                          isPastM ? 'bg-primary/30' :
                          monthBudget > 0 ? 'bg-muted-foreground/20' : 'bg-muted/50'
                        )}
                      />
                      <span className={cn(
                        'text-[10px] mt-1 block',
                        isSelected ? 'text-primary font-bold' :
                        isCurrentM ? 'text-primary font-bold' :
                        isPastM ? 'text-muted-foreground' : 'text-muted-foreground/60'
                      )}>
                        {m}
                      </span>
                      {hasEvents && (
                        <div className="flex justify-center mt-0.5">
                          <div className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            isSelected ? 'bg-primary' :
                            isPastM ? 'bg-primary/40' : 'bg-primary'
                          )} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active filter badge */}
              {selectedMonth !== null && (
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="gap-1">
                    {MONTHS_PT[selectedMonth]}
                    <button onClick={() => setSelectedMonth(null)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </div>
              )}

              {/* Timeline events */}
              <div className="space-y-2 mt-2">
                {filteredTimelineEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {selectedMonth !== null
                      ? `Nenhum evento em ${MONTHS_PT[selectedMonth]}`
                      : `Nenhum evento em ${timelineYear}`}
                  </p>
                ) : (
                  filteredTimelineEvents.map((item, idx) => {
                    const Icon = EVENT_ICONS[item.type] || Gift;
                    const color = EVENT_CHART_COLORS[item.type] || EVENT_CHART_COLORS.custom;
                    const eventDate = new Date(timelineYear, item.month - 1, item.day);
                    const isPast = eventDate < today;
                    const isThisMonth = eventDate.getMonth() === currentMonth && timelineYear === today.getFullYear();

                    return (
                      <button
                        key={idx}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border transition-all w-full text-left hover:bg-muted/50',
                          isThisMonth && 'border-primary/30 bg-primary/5',
                          isPast && !isThisMonth && 'opacity-50',
                        )}
                        onClick={() => setDetailEvent(item)}
                      >
                        <div className="flex flex-col items-center w-10 shrink-0">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {MONTHS_SHORT[item.month - 1]}
                          </span>
                          <span className="text-lg font-bold">{item.day}</span>
                        </div>
                        <div
                          className="w-1 h-10 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                            <span className="text-sm font-medium truncate">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {item.pendingCount > 0 && (
                              <Badge variant="outline" className="text-[10px] h-4">
                                {item.pendingCount} pendente{item.pendingCount > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {item.doneCount > 0 && (
                              <Badge variant="secondary" className="text-[10px] h-4">
                                {item.doneCount} concluído{item.doneCount > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold">{formatMoney(item.planned)}</p>
                          {item.actual > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Gasto: {formatMoney(item.actual)}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </AnimatedChartContainer>

      {/* Detail Sheet */}
      <Sheet open={!!detailEvent} onOpenChange={(open) => !open && setDetailEvent(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto sm:max-w-2xl sm:mx-auto sm:rounded-t-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {detailEvent && (() => {
                const Icon = EVENT_ICONS[detailEvent.type] || Gift;
                const color = EVENT_CHART_COLORS[detailEvent.type] || EVENT_CHART_COLORS.custom;
                return (
                  <>
                    <Icon className="h-5 w-5" style={{ color }} />
                    {detailEvent.name}
                    <span className="text-muted-foreground font-normal text-sm ml-1">
                      — {detailEvent.day}/{MONTHS_SHORT[detailEvent.month - 1]}
                    </span>
                  </>
                );
              })()}
            </SheetTitle>
          </SheetHeader>

          {detailEvent && (
            <div className="mt-4 space-y-4">
              {/* Summary badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  Orçamento: {formatMoney(detailEvent.planned)}
                </Badge>
                {detailEvent.actual > 0 && (
                  <Badge variant="secondary">
                    Gasto: {formatMoney(detailEvent.actual)}
                  </Badge>
                )}
                <Badge variant="outline">
                  {detailEvent.assignments.length} pessoa{detailEvent.assignments.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pessoa</TableHead>
                      <TableHead>Orçamento</TableHead>
                      <TableHead className="hidden sm:table-cell">Ideia de Presente</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailEvent.assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {a.person?.name || '—'}
                          {/* Show gift description on mobile below the name */}
                          {a.gift_description && (
                            <p className="text-xs text-muted-foreground mt-0.5 sm:hidden truncate max-w-[150px]">
                              {a.gift_description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatMoney(a.planned_value || 0)}
                          {a.actual_value != null && a.actual_value > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Gasto: {formatMoney(a.actual_value)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {a.gift_description || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={a.status === 'pending' ? 'outline' : 'secondary'}
                            className="text-[10px]"
                          >
                            {a.status === 'pending' ? 'Pendente' :
                             a.status === 'purchased' ? 'Comprado' : 'Entregue'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Month Detail Sheet (from chart click) */}
      <Sheet open={chartMonthDetail !== null} onOpenChange={(open) => !open && setChartMonthDetail(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto sm:max-w-2xl sm:mx-auto sm:rounded-t-xl">
          <SheetHeader>
            <SheetTitle>
              {chartMonthDetail !== null && `Presentes — ${MONTHS_PT[chartMonthDetail]} ${timelineYear}`}
            </SheetTitle>
          </SheetHeader>

          {chartMonthDetail !== null && (() => {
            const monthAssignments = yearAssignments.filter((a) => {
              let eventMonth: number | null = null;
              if (a.event?.event_type === 'birthday' && a.person?.birthday_month) {
                eventMonth = a.person.birthday_month - 1;
              } else if (a.event?.event_month) {
                eventMonth = a.event.event_month - 1;
              }
              return eventMonth === chartMonthDetail;
            });

            if (monthAssignments.length === 0) {
              return (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum presente neste mês
                </p>
              );
            }

            const hasAnyRealized = monthAssignments.some((a) => a.actual_value != null && a.actual_value > 0);
            const totalPlanned = monthAssignments.reduce((s, a) => s + (a.planned_value || 0), 0);
            const totalActual = monthAssignments.reduce((s, a) => s + (a.actual_value || 0), 0);
            const showSubtotal = monthAssignments.length > 1;

            return (
              <div className="mt-4">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ocasião</TableHead>
                        <TableHead>Pessoa</TableHead>
                        <TableHead className="text-right">Planejado</TableHead>
                        {hasAnyRealized && <TableHead className="text-right">Realizado</TableHead>}
                        <TableHead className="hidden sm:table-cell">Presente</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthAssignments.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-sm">
                            {a.event?.event_type === 'birthday'
                              ? 'Aniversário'
                              : a.event?.name || '—'}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {a.person?.name || '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {formatMoney(a.planned_value || 0)}
                          </TableCell>
                          {hasAnyRealized && (
                            <TableCell className="text-right tabular-nums text-sm">
                              {a.actual_value != null && a.actual_value > 0
                                ? formatMoney(a.actual_value)
                                : '—'}
                            </TableCell>
                          )}
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                            {a.gift_description || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={a.status === 'pending' ? 'outline' : 'secondary'}
                              className="text-[10px]"
                            >
                              {a.status === 'pending' ? 'Pendente' :
                               a.status === 'purchased' ? 'Comprado' : 'Entregue'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {showSubtotal && (
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={2} className="text-sm">Subtotal</TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {formatMoney(totalPlanned)}
                          </TableCell>
                          {hasAnyRealized && (
                            <TableCell className="text-right tabular-nums text-sm">
                              {totalActual > 0 ? formatMoney(totalActual) : '—'}
                            </TableCell>
                          )}
                          <TableCell className="hidden sm:table-cell" />
                          <TableCell />
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
};
