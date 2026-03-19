import { useMemo } from 'react';
import { useHomeDashboard } from '@/hooks/useHomeDashboard';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { useCreditCardBills } from '@/hooks/useCreditCardBills';
import { isBillPaymentTransaction } from '@/hooks/useBillPaymentReconciliation';

/**
 * Single source of truth for month KPIs on Início.
 * Prefer `get_home_dashboard.month_summary` when disponível (alinhado ao desktop),
 * com fallback para soma local de lançamentos + faturas.
 */
export function useMonthSummary(currentMonth: string, demoUserId?: string | null) {
  const { data: dashboardData } = useHomeDashboard(currentMonth, demoUserId);
  const { lancamentos } = useLancamentosRealizados();
  const { bills } = useCreditCardBills();

  return useMemo(() => {
    const monthItems = lancamentos.filter(
      (l) => l.mes_referencia === currentMonth && !isBillPaymentTransaction(l)
    );
    const receitasClient = monthItems
      .filter((l) => l.tipo === 'receita')
      .reduce((s, l) => s + (l.valor_realizado ?? 0), 0);
    const despesasSemCartao = monthItems
      .filter((l) => l.tipo === 'despesa')
      .reduce((s, l) => s + (l.valor_realizado ?? 0), 0);

    const seenBillIds = new Set<string>();
    const totalCartao = bills
      .filter((b) => {
        const inMonth =
          b.billing_month?.slice(0, 7) === currentMonth ||
          b.due_date?.slice(0, 7) === currentMonth;
        if (!inMonth) return false;
        if (seenBillIds.has(b.id)) return false;
        seenBillIds.add(b.id);
        return true;
      })
      .reduce((s, b) => s + (b.total_value ?? 0), 0);

    const rpc = dashboardData?.month_summary as
      | {
          total_income?: number;
          total_expense?: number;
          balance?: number;
          prev_income?: number;
          prev_expense?: number;
        }
      | undefined;

    const receitas =
      rpc?.total_income != null ? Number(rpc.total_income) : receitasClient;

    const totalDespesasClient = despesasSemCartao + totalCartao;
    const totalDespesas =
      rpc?.total_expense != null
        ? Number(rpc.total_expense)
        : totalDespesasClient;

    const saldoMensal =
      rpc?.balance != null
        ? Number(rpc.balance)
        : receitas - totalDespesas;
    const totalLancamentos = monthItems.length;
    const lancamentosSemCategoria = monthItems.filter(
      (l) => !l.is_category_confirmed
    ).length;

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
