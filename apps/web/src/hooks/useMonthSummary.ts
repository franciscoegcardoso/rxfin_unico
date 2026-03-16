import { useMemo } from 'react';
import { format, subMonths } from 'date-fns';
import { useHomeDashboard } from '@/hooks/useHomeDashboard';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { useCreditCardBills } from '@/hooks/useCreditCardBills';
import { isBillPaymentTransaction } from '@/hooks/useBillPaymentReconciliation';

/**
 * Single source of truth for month KPIs on Início.
 * Uses existing hooks only — no new RPCs.
 */
export function useMonthSummary(currentMonth: string, demoUserId?: string | null) {
  const { data: dashboardData } = useHomeDashboard(currentMonth, demoUserId);
  const { lancamentos } = useLancamentosRealizados();
  const { bills } = useCreditCardBills();

  return useMemo(() => {
    const monthItems = lancamentos.filter(
      (l) => l.mes_referencia === currentMonth && !isBillPaymentTransaction(l)
    );
    const receitas = monthItems
      .filter((l) => l.tipo === 'receita')
      .reduce((s, l) => s + (l.valor_realizado ?? 0), 0);
    const despesasSemCartao = monthItems
      .filter((l) => l.tipo === 'despesa')
      .reduce((s, l) => s + (l.valor_realizado ?? 0), 0);

    const totalCartao = bills
      .filter(
        (b) =>
          b.billing_month?.slice(0, 7) === currentMonth ||
          b.due_date?.slice(0, 7) === currentMonth
      )
      .reduce((s, b) => s + (b.total_value ?? 0), 0);

    const totalDespesas = despesasSemCartao + totalCartao;
    const saldoMensal = receitas - totalDespesas;
    const totalLancamentos = monthItems.length;
    const lancamentosSemCategoria = monthItems.filter(
      (l) => !l.is_category_confirmed
    ).length;

    const rpc = dashboardData?.month_summary as
      | {
          prev_income?: number;
          prev_expense?: number;
        }
      | undefined;
    const prevBalance =
      rpc?.prev_income != null || rpc?.prev_expense != null
        ? (rpc?.prev_income ?? 0) - (rpc?.prev_expense ?? 0)
        : null;
    const deltaVsMesAnterior =
      prevBalance != null && prevBalance !== 0
        ? ((saldoMensal - prevBalance) / Math.abs(prevBalance)) * 100
        : 0;

    return {
      receitas,
      despesasSemCartao,
      totalCartao,
      totalDespesas,
      saldoMensal,
      totalLancamentos,
      lancamentosSemCategoria,
      deltaVsMesAnterior,
    };
  }, [
    currentMonth,
    lancamentos,
    bills,
    dashboardData?.month_summary,
  ]);
}
