import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, AlertCircle, CalendarClock, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { useCompromissos } from '@/hooks/useCompromissos';
import { useMonthlyGoals } from '@/hooks/useMonthlyGoals';
import { useFeaturePreferences } from '@/hooks/useFeaturePreferences';
import { format } from 'date-fns';
import { isBillPaymentTransaction } from '@/hooks/useBillPaymentReconciliation';
import { cn } from '@/lib/utils';

export const AcoesImediatas: React.FC = () => {
  const { lancamentos } = useLancamentosRealizados();
  const { data: compromissosData } = useCompromissos();
  const { goals: monthlyGoals, getGoalByMonth } = useMonthlyGoals();
  const { isFeatureEnabled } = useFeaturePreferences();

  const currentMonth = format(new Date(), 'yyyy-MM');
  const hasMetasFeature = isFeatureEnabled('metas-mensais');

  const uncategorizedCount = lancamentos.filter(
    (l) =>
      l.mes_referencia === currentMonth &&
      !l.is_category_confirmed &&
      !isBillPaymentTransaction(l)
  ).length;

  const lastSyncedAt = compromissosData?.monthly_summary?.last_synced_at;
  const hasCompromissos = lastSyncedAt != null;
  const expensesCount = compromissosData?.expenses?.length ?? 0;
  const seenThisMonth = compromissosData?.expenses?.filter((e) => e.seen_this_month).length ?? 0;
  const allCompromissosPaid = hasCompromissos && expensesCount > 0 && seenThisMonth >= expensesCount;

  const currentGoal = getGoalByMonth(currentMonth);
  const hasMetas = hasMetasFeature && currentGoal?.item_goals && Object.keys(currentGoal.item_goals).length > 0;

  const rows = [
    {
      icon: AlertCircle,
      title: 'Categorização pendente',
      subtitle: uncategorizedCount > 0 ? `${uncategorizedCount} itens sem categoria` : 'Tudo categorizado',
      badge: uncategorizedCount > 0 ? (
        <Badge style={{ background: 'hsl(var(--color-warning-bg))', color: 'hsl(var(--color-warning))' }} className="border-0 text-[10px]">
          {uncategorizedCount}
        </Badge>
      ) : null,
      href: '/movimentacoes?filter=uncategorized',
    },
    {
      icon: CalendarClock,
      title: 'Compromissos do mês',
      subtitle: hasCompromissos ? (allCompromissosPaid ? 'Todos pagos' : 'Ver pendências') : 'Open Finance',
      badge: hasCompromissos && allCompromissosPaid ? (
        <Badge style={{ background: 'hsl(var(--color-income-bg))', color: 'hsl(var(--color-income))' }} className="border-0 text-[10px]">✓ ok</Badge>
      ) : null,
      href: '/movimentacoes/extrato',
    },
    {
      icon: Target,
      title: 'Metas do mês',
      subtitle: hasMetas ? 'Acompanhar metas' : 'Definir metas por categoria',
      badge: !hasMetas ? (
        <Badge variant="ghost" className="text-[10px] text-[hsl(var(--color-text-tertiary))]">
          Configurar
        </Badge>
      ) : null,
      href: '/planejamento-mensal/metas',
    },
  ];

  return (
    <div className="rounded-xl border border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] shadow-[var(--shadow-sm)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[hsl(var(--color-border-subtle))]">
        <h2 className="text-sm font-semibold text-[hsl(var(--color-text-primary))]">Ações imediatas</h2>
      </div>
      <div className="divide-y divide-[hsl(var(--color-border-subtle))]">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <Link
              key={row.title}
              to={row.href}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[hsl(var(--color-surface-sunken))] transition-colors"
            >
              <div className="h-9 w-9 rounded-full bg-[hsl(var(--color-surface-sunken))] flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-[hsl(var(--color-text-tertiary))]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[hsl(var(--color-text-primary))] truncate">
                  {row.title}
                </p>
                <p className="text-xs text-[hsl(var(--color-text-tertiary))] truncate">
                  {row.subtitle}
                </p>
              </div>
              {row.badge}
              <ChevronRight className="h-4 w-4 text-[hsl(var(--color-text-tertiary))] shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
};
