import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Receipt, AlertCircle } from 'lucide-react';
import { ConnectorLogo } from '@/components/openfinance/ConnectorLogo';
import { BillStatusBadge, type BillStatus } from './BillStatusBadge';
import {
  useCreditCardBillsDetail,
  type CreditCardBillDetail,
} from '@/hooks/useCreditCardBillsDetail';
import { useVisibility } from '@/contexts/VisibilityContext';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number, isHidden: boolean) => {
  if (isHidden) return '••••••';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

interface CreditCardBillViewProps {
  cardId?: string | null;
  month?: string | null;
  limit?: number;
  showSummaryRow?: boolean;
}

export const CreditCardBillView: React.FC<CreditCardBillViewProps> = ({
  cardId = null,
  month = null,
  limit = 6,
  showSummaryRow = true,
}) => {
  const { isHidden } = useVisibility();
  const { data, isLoading, error } = useCreditCardBillsDetail(cardId, month, limit);
  const [openCharges, setOpenCharges] = useState<Record<string, boolean>>({});

  if (isLoading && !data) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-5">
              <div className="h-6 w-32 bg-muted rounded mb-3" />
              <div className="h-8 w-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { bills, current_bill, totals } = data;
  const displayBills = bills.length > 0 ? bills : current_bill;

  return (
    <div className="space-y-4">
      {showSummaryRow && current_bill.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {current_bill.map((bill) => {
            const days = bill.days_until_due ?? 999;
            const chipColor =
              bill.is_overdue
                ? 'bg-destructive/10 text-destructive border-destructive/30'
                : days <= 7
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
            return (
              <div
                key={bill.id}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm',
                  chipColor
                )}
              >
                <span className="font-medium">{bill.card_name}</span>
                <span className="tabular-nums font-semibold">
                  {formatCurrency(bill.total_value, isHidden)}
                </span>
                {bill.is_overdue && (
                  <span className="text-xs">Vencida há {Math.abs(days)} dias</span>
                )}
                {!bill.is_overdue && days <= 31 && (
                  <span className="text-xs">Vence em {days} dias</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        {displayBills.map((bill) => (
          <BillCard
            key={bill.id}
            bill={bill}
            isHidden={isHidden}
            openCharges={openCharges[bill.id]}
            onToggleCharges={() =>
              setOpenCharges((prev) => ({ ...prev, [bill.id]: !prev[bill.id] }))
            }
          />
        ))}
      </div>
    </div>
  );
};

const BillCard: React.FC<{
  bill: CreditCardBillDetail;
  isHidden: boolean;
  openCharges: boolean;
  onToggleCharges: () => void;
}> = ({ bill, isHidden, openCharges, onToggleCharges }) => {
  const progressPct =
    bill.total_value > 0 ? (bill.paid_amount / bill.total_value) * 100 : 0;
  const topCategories = (bill.transaction_summary?.categories ?? []).slice(0, 5);
  const totalCat = topCategories.reduce((s, c) => s + c.total, 0);
  const status = bill.status as BillStatus;

  return (
    <Card className="rounded-xl border border-border overflow-hidden">
      <CardHeader className="pb-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ConnectorLogo
              imageUrl={bill.connector_image_url}
              primaryColor={bill.connector_color}
              connectorName={bill.connector_name}
              size="sm"
            />
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{bill.card_name}</p>
              <p className="text-xs text-muted-foreground">
                Fatura {bill.billing_month}
              </p>
            </div>
          </div>
          <BillStatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <div>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {formatCurrency(bill.total_value, isHidden)}
          </p>
          {bill.total_value > 0 && (
            <Progress value={progressPct} className="h-2 mt-2" />
          )}
          {bill.paid_amount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Pago: {formatCurrency(bill.paid_amount, isHidden)}
            </p>
          )}
        </div>

        {bill.minimum_payment_amount != null && bill.minimum_payment_amount > 0 && (
          <p className="text-sm text-muted-foreground">
            Pagamento mínimo: {formatCurrency(bill.minimum_payment_amount, isHidden)}
          </p>
        )}

        {bill.finance_charges && bill.finance_charges.length > 0 && (
          <Collapsible open={openCharges} onOpenChange={onToggleCharges}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 -ml-2">
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', openCharges && 'rotate-180')}
                />
                Encargos:{' '}
                {formatCurrency(
                  bill.finance_charges.reduce((s, f) => s + f.amount, 0),
                  isHidden
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground pl-4">
                {bill.finance_charges.map((f) => (
                  <li key={f.id}>
                    {f.type}: {formatCurrency(f.amount, isHidden)}
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {bill.is_overdue && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm font-medium text-destructive">
              Fatura vencida há {bill.days_until_due != null ? Math.abs(bill.days_until_due) : 0} dias
            </p>
          </div>
        )}

        {!bill.is_overdue && bill.days_until_due != null && bill.days_until_due > 0 && bill.days_until_due <= 7 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Vence em {bill.days_until_due} dias
          </p>
        )}

        {topCategories.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Por categoria</p>
            <div className="space-y-1.5">
              {topCategories.map((c) => {
                const pct = totalCat > 0 ? (c.total / totalCat) * 100 : 0;
                return (
                  <div key={c.category} className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs truncate w-24">{c.category}</span>
                    <span className="text-xs tabular-nums shrink-0">
                      {formatCurrency(c.total, isHidden)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {bill.transaction_summary && bill.transaction_summary.count > 0 && (
          <Link
            to={`/movimentacoes/cartao-credito?bill_id=${bill.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Receipt className="h-4 w-4" />
            {bill.transaction_summary.count} transações · Ver todas
          </Link>
        )}
      </CardContent>
    </Card>
  );
};
