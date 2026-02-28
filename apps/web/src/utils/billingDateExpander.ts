import { CreditCardTransaction } from '@/hooks/useCreditCardTransactions';
import { clampDayToMonth } from '@/utils/dateUtils';

/**
 * For "billing date" view, expand installment transactions so each installment
 * appears in its corresponding billing month.
 * 
 * Example: A purchase "Store 3/12" with transaction_date 2025-03 means
 * installment 3 of 12. The original purchase was ~2 months earlier.
 * We generate virtual entries for installments 1-12, each in the correct month.
 * 
 * Non-installment transactions pass through unchanged.
 */
export interface ExpandedTransaction extends CreditCardTransaction {
  /** True if this row was synthetically generated for a future/past installment */
  is_virtual_installment?: boolean;
  /** The billing month this installment corresponds to (YYYY-MM) */
  billing_month?: string;
  /** Display label like "3/12" */
  installment_label?: string;
}

export function expandInstallmentTransactions(
  transactions: CreditCardTransaction[]
): ExpandedTransaction[] {
  const result: ExpandedTransaction[] = [];

  // Current month threshold: only refine dates from this month onward
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  for (const tx of transactions) {
    // Non-installment: pass through as-is
    if (!tx.installment_total || tx.installment_total <= 1 || !tx.installment_current) {
      result.push({
        ...tx,
        billing_month: tx.transaction_date.substring(0, 7),
      });
      continue;
    }

    // Installment transaction: expand to all months
    // tx.transaction_date is the date this specific installment was billed
    // tx.installment_current tells us which installment this is
    const [year, month, day] = tx.transaction_date.split('T')[0].split('-').map(Number);
    const txDate = new Date(year, month - 1, day);
    const originalDay = day;
    
    for (let i = 1; i <= tx.installment_total; i++) {
      // Calculate the billing month for installment i relative to the current one
      const monthOffset = i - tx.installment_current;
      const billingDate = new Date(txDate);
      billingDate.setMonth(billingDate.getMonth() + monthOffset);
      
      const billingYear = billingDate.getFullYear();
      const billingMonth = billingDate.getMonth() + 1;
      const billingMonthStr = `${billingYear}-${String(billingMonth).padStart(2, '0')}`;

      // For current/future months: use clampDayToMonth to preserve original purchase day
      // For past months (closed bills): keep original date to avoid retroactive changes
      const billingDateStr = billingMonthStr >= currentMonthStr
        ? clampDayToMonth(billingYear, billingMonth, originalDay)
        : `${billingMonthStr}-${String(billingDate.getDate()).padStart(2, '0')}`;
      
      result.push({
        ...tx,
        // Use a unique ID for virtual entries to avoid React key conflicts
        id: i === tx.installment_current ? tx.id : `${tx.id}__inst_${i}`,
        transaction_date: billingDateStr,
        installment_current: i,
        is_virtual_installment: i !== tx.installment_current,
        billing_month: billingMonthStr,
        installment_label: `${i}/${tx.installment_total}`,
      });
    }
  }

  return result;
}
// sync
