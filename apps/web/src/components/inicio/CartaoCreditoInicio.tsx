import React from 'react';
import { Link } from 'react-router-dom';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useHomeDashboard } from '@/hooks/useHomeDashboard';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number, isHidden: boolean) => {
  if (isHidden) return '••••••';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const CartaoCreditoInicio: React.FC = () => {
  const { isHidden } = useVisibility();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const { data: dashboardData } = useHomeDashboard(currentMonth);

  const creditCardsPayload = dashboardData?.credit_cards;
  const bills = Array.isArray(creditCardsPayload)
    ? creditCardsPayload
    : (creditCardsPayload as { bills?: unknown[] })?.bills ?? [];

  if (bills.length === 0) return null;

  const totalAberto = (bills as Array<{ total_value?: number; status?: string }>)
    .filter((b) => b.status !== 'paid')
    .reduce((s, b) => s + (b.total_value ?? 0), 0);

  return (
    <Card className="rounded-xl border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))]">
      <CardHeader className="pb-2 p-4 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-[hsl(var(--color-text-primary))]">
          Cartão de Crédito
        </CardTitle>
        <Link
          to="/movimentacoes/cartao-credito"
          className="text-xs text-primary hover:underline font-medium"
        >
          Ver detalhes →
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        {(bills as Array<{
          card_name?: string | null;
          status?: string;
          total_value?: number;
          is_overdue?: boolean;
        }>).map((bill, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center justify-between rounded-lg border p-3',
              bill.status !== 'paid'
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-[hsl(var(--color-border-subtle))]'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-[hsl(var(--color-text-primary))] truncate">
                {bill.card_name ?? 'Cartão'}
              </span>
              {bill.status === 'paid' && (
                <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                  Paga
                </span>
              )}
              {bill.status !== 'paid' && bill.is_overdue && (
                <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                  Vencida
                </span>
              )}
              {bill.status !== 'paid' && !bill.is_overdue && (
                <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--color-surface-raised))] text-[hsl(var(--color-text-muted))]">
                  Aberta
                </span>
              )}
            </div>
            <span className="text-sm font-semibold tabular-nums text-[hsl(var(--color-text-primary))] shrink-0">
              {formatCurrency(bill.total_value ?? 0, isHidden)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
