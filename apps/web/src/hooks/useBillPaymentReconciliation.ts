import { useMemo } from 'react';
import { LancamentoRealizado } from './useLancamentosRealizados';
import { CreditCardBill } from './useCreditCardBills';

/**
 * Patterns that identify a lancamento as a credit card bill payment.
 */
const BILL_PAYMENT_PATTERNS = [
  'pagamento de fatura',
  'pagamento fatura',
  'pagto fatura',
  'pgto fatura',
];

const BILL_PAYMENT_CATEGORIES = [
  'credit card payment',
  'pagamento dívidas',
];

export interface ReconciliationInfo {
  /** Whether this lancamento is a bill payment */
  isBillPayment: boolean;
  /** Whether a matching bill was found */
  matched: boolean;
  /** The matched bill (if any) */
  matchedBill?: CreditCardBill;
  /** Card name for display */
  cardName?: string;
}

/**
 * Check if a lancamento looks like a credit card bill payment.
 */
export function isBillPaymentTransaction(item: LancamentoRealizado): boolean {
  const nameLower = item.nome.toLowerCase();
  const categoryLower = item.categoria.toLowerCase();

  return (
    BILL_PAYMENT_PATTERNS.some(p => nameLower.includes(p)) ||
    BILL_PAYMENT_CATEGORIES.some(c => categoryLower.includes(c))
  );
}

/**
 * Calculate the difference in business days between two date strings (YYYY-MM-DD).
 * Simplified: counts calendar days and subtracts weekends roughly.
 */
function calendarDaysDiff(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T12:00:00Z');
  const b = new Date(dateB + 'T12:00:00Z');
  return Math.abs(Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Try to find a matching credit card bill for a bill-payment lancamento.
 * Match criteria:
 * - Exact value match (to the cent)
 * - Due date within ±5 calendar days (≈3 business days) of the payment date
 */
function findMatchingBill(
  item: LancamentoRealizado,
  bills: CreditCardBill[],
): CreditCardBill | undefined {
  const paymentDate = item.data_pagamento || item.data_vencimento || item.data_registro;
  if (!paymentDate) return undefined;

  const paymentDateOnly = paymentDate.split('T')[0];
  const value = item.valor_realizado;

  // Round to 2 decimals for comparison
  const roundedValue = Math.round(value * 100);

  return bills.find(bill => {
    const billValue = Math.round(bill.total_value * 100);
    if (billValue !== roundedValue) return false;

    const billDueDate = bill.due_date.split('T')[0];
    const daysDiff = calendarDaysDiff(paymentDateOnly, billDueDate);
    return daysDiff <= 5; // ~3 business days window
  });
}

/**
 * Hook that reconciles bill-payment lancamentos with credit card bills.
 * Returns a map: lancamento.id → ReconciliationInfo
 */
export function useBillPaymentReconciliation(
  lancamentos: LancamentoRealizado[],
  bills: CreditCardBill[],
) {
  const reconciliationMap = useMemo(() => {
    const map = new Map<string, ReconciliationInfo>();

    for (const item of lancamentos) {
      if (!isBillPaymentTransaction(item)) continue;

      const matchedBill = findMatchingBill(item, bills);

      map.set(item.id, {
        isBillPayment: true,
        matched: !!matchedBill,
        matchedBill,
        cardName: matchedBill?.card_name || undefined,
      });
    }

    return map;
  }, [lancamentos, bills]);

  /**
   * Get reconciliation info for a lancamento.
   */
  const getReconciliation = (id: string): ReconciliationInfo | null => {
    return reconciliationMap.get(id) || null;
  };

  /**
   * Check if a lancamento should be excluded from expense category charts.
   * Bill payments should be excluded because the actual expenses are already
   * counted in the credit card transactions.
   */
  const shouldExcludeFromCategoryChart = (item: LancamentoRealizado): boolean => {
    return isBillPaymentTransaction(item);
  };

  /**
   * Filter lancamentos to exclude bill payments (for category charts).
   */
  const filterForCategoryChart = (items: LancamentoRealizado[]): LancamentoRealizado[] => {
    return items.filter(item => !isBillPaymentTransaction(item));
  };

  /**
   * All bill payment IDs (for quick lookup).
   */
  const billPaymentIds = useMemo(() => {
    return new Set(
      lancamentos
        .filter(isBillPaymentTransaction)
        .map(l => l.id)
    );
  }, [lancamentos]);

  return {
    reconciliationMap,
    getReconciliation,
    shouldExcludeFromCategoryChart,
    filterForCategoryChart,
    billPaymentIds,
  };
}
// sync
