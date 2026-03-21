import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses';
import { formatCurrency } from '@/lib/utils';
import { Repeat } from 'lucide-react';

interface RecurringItem {
  name?: string;
  category?: string;
  payment_method?: string;
  monthly_value?: number;
  is_fixed?: boolean;
  months_data?: unknown;
}

interface RecurringPayload {
  recurring_items?: RecurringItem[];
  summary?: {
    total_fixed?: number;
    total_variable?: number;
    total_monthly?: number;
    item_count?: number;
  };
}

export default function Recorrentes() {
  const [months] = useState(3);
  const { data, loading, error } = useRecurringExpenses(months);

  const payload = data as RecurringPayload | null;
  const rawItems = payload?.recurring_items ?? (Array.isArray(data) ? data : []) as RecurringItem[];
  const summary = payload?.summary ?? {};
  const items = useMemo(
    () => [...rawItems].sort((a, b) => (b.monthly_value ?? 0) - (a.monthly_value ?? 0)),
    [rawItems]
  );
  const totalFixed = summary.total_fixed ?? 0;
  const totalVariable = summary.total_variable ?? 0;
  const totalMonthly = summary.total_monthly ?? totalFixed + totalVariable;
  const isEmpty = items.length === 0;

  return (
    
      <div className="space-y-6">
        <PageHeader
          title="Despesas Recorrentes"
          description="Visão das despesas recorrentes (últimos meses)"
          icon={<Repeat className="h-5 w-5 text-primary" />}
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

        {!loading && !error && isEmpty && (
          <Card className="rounded-[14px] border border-border/80 p-12 text-center">
            <Repeat className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">Nenhuma despesa recorrente encontrada.</p>
          </Card>
        )}

        {!loading && !error && !isEmpty && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="rounded-[14px] border border-border/80">
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total fixo
                  </p>
                  <p className="mt-1 text-lg font-semibold">{formatCurrency(totalFixed)}</p>
                </CardContent>
              </Card>
              <Card className="rounded-[14px] border border-border/80">
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total variável
                  </p>
                  <p className="mt-1 text-lg font-semibold">{formatCurrency(totalVariable)}</p>
                </CardContent>
              </Card>
              <Card className="rounded-[14px] border border-border/80">
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total mensal
                  </p>
                  <p className="mt-1 text-lg font-semibold">{formatCurrency(totalMonthly)}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-[14px] border border-border/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/30">
                      <th className="px-4 py-3 text-left font-medium">Nome</th>
                      <th className="px-4 py-3 text-left font-medium">Categoria</th>
                      <th className="px-4 py-3 text-right font-medium">Valor mensal</th>
                      <th className="px-4 py-3 text-left font-medium">Tipo</th>
                      <th className="px-4 py-3 text-left font-medium">Forma de pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{item.name ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.category ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(item.monthly_value ?? 0)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={item.is_fixed ? 'secondary' : 'outline'}>
                            {item.is_fixed ? 'Fixo' : 'Variável'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.payment_method ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    
  );
}
