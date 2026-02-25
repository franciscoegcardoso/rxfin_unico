import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { getActiveBillingMonth } from '@/utils/billingCycleUtils';
import { ptBR } from 'date-fns/locale';
import { 
  CreditCard, 
  Calendar, 
  Check, 
  Clock, 
  AlertCircle,
  Wallet,
  ChevronDown,
  ChevronRight,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useCreditCardBills, CreditCardBill } from '@/hooks/useCreditCardBills';
import { BillPaymentDialog } from './BillPaymentDialog';
import { useVisibility } from '@/contexts/VisibilityContext';
import { cn } from '@/lib/utils';
import { ConnectorLogo } from '@/components/openfinance/ConnectorLogo';

interface CardInfo {
  id: string;
  name: string;
  connectorName?: string;
  imageUrl?: string | null;
  primaryColor?: string | null;
}

interface BillsSectionProps {
  cardFilter?: string;
  availableCards?: CardInfo[];
}

type BillStatusType = 'open' | 'closed' | 'paid' | 'overdue';
type DisplayStatusType = 'open' | 'closed' | 'paid' | 'partial' | 'awaiting' | 'overdue' | 'manual_check';

const statusConfig: Record<DisplayStatusType, { label: string; className: string; icon: React.ElementType }> = {
  open: { 
    label: 'Em Aberto', 
    className: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/60',
    icon: Clock
  },
  closed: { 
    label: 'Fechada', 
    className: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/60',
    icon: AlertCircle
  },
  paid: { 
    label: 'Paga', 
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/60',
    icon: Check
  },
  partial: {
    label: 'Pgto. Parcial',
    className: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/60',
    icon: AlertCircle
  },
  awaiting: {
    label: 'Aguardando Pgto.',
    className: 'bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/60',
    icon: Clock
  },
  overdue: {
    label: 'Vencida',
    className: 'bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/60',
    icon: AlertCircle
  },
  manual_check: {
    label: 'Verificar',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200/80 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800/60',
    icon: AlertCircle
  },
};

function getBillDisplayStatus(bill: CreditCardBill): { displayStatus: DisplayStatusType; remaining: number | null } {
  const status = bill.status as BillStatusType;
  const total = bill.total_value;
  const paid = bill.paid_amount;

  if (status === 'overdue') return { displayStatus: 'overdue', remaining: null };
  if (bill.requires_manual_check) return { displayStatus: 'manual_check', remaining: null };
  if (status === 'open') return { displayStatus: 'open', remaining: null };

  if (status === 'paid') {
    if (paid != null && paid < total) {
      return { displayStatus: 'partial', remaining: total - paid };
    }
    return { displayStatus: 'paid', remaining: null };
  }

  // closed
  if (paid == null || paid === 0) {
    return { displayStatus: 'awaiting', remaining: null };
  }
  if (paid < total) {
    return { displayStatus: 'partial', remaining: total - paid };
  }
  return { displayStatus: 'paid', remaining: null };
}

export const BillsSection: React.FC<BillsSectionProps> = ({ cardFilter, availableCards = [] }) => {
  const { bills, loading, fetchBills } = useCreditCardBills();
  const { isHidden } = useVisibility();
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [selectedBill, setSelectedBill] = useState<CreditCardBill | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredBills = useMemo(() => {
    if (!cardFilter || cardFilter === 'all') return bills;
    return bills.filter(b => b.card_id === cardFilter);
  }, [bills, cardFilter]);

  const billsByMonth = useMemo(() => {
    const grouped: Record<string, CreditCardBill[]> = {};
    
    filteredBills.forEach(bill => {
      const monthKey = format(parseISO(bill.due_date), 'yyyy-MM');
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(bill);
    });

    const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    
    return sortedKeys.map(monthKey => ({
      monthKey,
      monthLabel: format(parseISO(`${monthKey}-01`), "MMMM 'de' yyyy", { locale: ptBR }),
      bills: grouped[monthKey].sort((a, b) => 
        new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
      ),
      total: grouped[monthKey].reduce((sum, b) => sum + b.total_value, 0),
      paidTotal: grouped[monthKey]
        .filter(b => b.status === 'paid')
        .reduce((sum, b) => sum + b.total_value, 0),
    }));
  }, [filteredBills]);

  React.useEffect(() => {
    const active = getActiveBillingMonth(filteredBills);
    const [ay, am] = active.split('-').map(Number);
    const nd = new Date(ay, am, 1);
    const next = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`;
    setExpandedMonths(new Set([active, next]));
  }, [filteredBills]);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  };

  const handlePayBill = (bill: CreditCardBill) => {
    setSelectedBill(bill);
    setPaymentDialogOpen(true);
  };

  const handlePaymentComplete = () => {
    fetchBills();
  };

  if (loading) {
    return (
      <Card className="rounded-2xl border border-border/50">
        <CardHeader className="pb-2 px-6 pt-6">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">Faturas por Mês</CardTitle>
              <CardDescription className="text-xs">
                Acompanhe e pague suas faturas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2 px-6 pb-6">
          {billsByMonth.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-4 opacity-30" strokeWidth={1.5} />
              <p className="font-medium text-sm">Nenhuma fatura encontrada</p>
              <p className="text-xs mt-1 text-muted-foreground/70">Importe suas faturas de cartão para começar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {billsByMonth.map(({ monthKey, monthLabel, bills: monthBills, total, paidTotal }) => (
                <Collapsible
                  key={monthKey}
                  open={expandedMonths.has(monthKey)}
                  onOpenChange={() => toggleMonth(monthKey)}
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card hover:bg-muted/15 hover:border-border/60 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-primary" strokeWidth={1.5} />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-sm capitalize tracking-tight">{monthLabel}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {monthBills.length} fatura{monthBills.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-sm font-mono tabular-nums tracking-tight">{formatCurrency(total)}</p>
                          {paidTotal > 0 && paidTotal < total && (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono tabular-nums font-medium">
                              {formatCurrency(paidTotal)} pago
                            </p>
                          )}
                        </div>
                        <div className="text-muted-foreground/40">
                          {expandedMonths.has(monthKey) ? (
                            <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                          ) : (
                            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                          )}
                        </div>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1.5 space-y-1.5 pl-2">
                      {monthBills.map(bill => {
                        const { displayStatus, remaining } = getBillDisplayStatus(bill);
                        const config = statusConfig[displayStatus];
                        const StatusIcon = config.icon;
                        const isOverdue = displayStatus !== 'paid' && displayStatus !== 'partial' && new Date(bill.due_date) < new Date();

                        return (
                          <div
                            key={bill.id}
                            className={cn(
                              "flex flex-col p-4 rounded-xl border transition-all",
                              isOverdue 
                                ? "border-red-200/80 bg-red-50/20 dark:border-red-800/30 dark:bg-red-950/10" 
                                : "border-border/30 bg-card hover:bg-muted/10"
                            )}
                          >
                            <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {(() => {
                                const card = availableCards.find(c => c.id === bill.card_id);
                                return card?.imageUrl || card?.primaryColor ? (
                                  <ConnectorLogo
                                    imageUrl={card.imageUrl}
                                    primaryColor={card.primaryColor}
                                    connectorName={card.connectorName || card.name || 'C'}
                                    size="sm"
                                    className="ring-1 ring-border/30"
                                  />
                                ) : (
                                  <div className="h-9 w-9 rounded-xl bg-muted/40 flex items-center justify-center">
                                    <CreditCard className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                                  </div>
                                );
                              })()}
                              <div>
                                <p className="font-medium text-sm tracking-tight">
                                  {bill.card_name || 'Cartão de Crédito'}
                                </p>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono tabular-nums">
                                  <span>Fecha {format(parseISO(bill.closing_date), 'dd/MM')}</span>
                                  <span className="text-border">·</span>
                                  <span>Vence {format(parseISO(bill.due_date), 'dd/MM')}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className={cn(
                                  "font-bold text-sm font-mono tabular-nums tracking-tight",
                                  displayStatus === 'paid' ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                                )}>
                                  {formatCurrency(bill.total_value)}
                                </p>
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-[9px] px-1.5 py-0 font-medium mt-0.5", config.className)}
                                >
                                  <StatusIcon className="h-2.5 w-2.5 mr-0.5" strokeWidth={1.5} />
                                  {config.label}
                                </Badge>
                                {bill.payment_source === 'bank_statement' && (
                                  <Badge variant="outline" className="text-[8px] px-1 py-0 font-medium bg-blue-50 text-blue-600 border-blue-200/80 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/60">
                                    via extrato
                                  </Badge>
                                )}
                              </div>
                              {displayStatus !== 'paid' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2.5 border-border/50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-all"
                                  onClick={() => handlePayBill(bill)}
                                >
                                  <Wallet className="h-3 w-3 mr-1" strokeWidth={1.5} />
                                  Pagar
                                </Button>
                              )}
                            </div>
                            </div>
                            {/* Partial payment alert */}
                            {remaining != null && remaining > 0 && (
                              <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                                <span className="font-medium">Pagamento Parcial: Restam {formatCurrency(remaining)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BillPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        bill={selectedBill}
        onPaymentComplete={handlePaymentComplete}
      />
    </>
  );
};
