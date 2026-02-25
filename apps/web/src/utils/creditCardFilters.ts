/**
 * Centralized filter for credit card transactions.
 * Returns true only for real consumption/purchase transactions,
 * filtering out bill payments, fees, chargebacks, and adjustments.
 */

const BLOCKED_KEYWORDS = [
  'pagamento de fatura',
  'pagamento recebido',
  'pagto fatura',
  'pgto fatura',
  'pag fatura',
  'recebido',
  'desconto antecipação',
  'desconto antecipacao',
  'credit card payment',
  'estorno',
  'iof',
  'juros',
  'multa',
];

const BLOCKED_CATEGORIES = [
  'pagamento dívidas',
  'pagamento dividas',
];

interface TransactionLike {
  store_name: string;
  friendly_name?: string | null;
  category?: string | null;
}

/**
 * Returns true if the transaction is a real purchase/consumption.
 * Returns false for payments, fees, chargebacks, and other non-purchase entries.
 */
export function isConsumptionTransaction(tx: TransactionLike): boolean {
  const name = `${tx.friendly_name || ''} ${tx.store_name || ''}`.toLowerCase().trim();
  if (BLOCKED_KEYWORDS.some(kw => name.includes(kw))) return false;

  const category = (tx.category || '').toLowerCase().trim();
  if (BLOCKED_CATEGORIES.includes(category)) return false;

  return true;
}
// sync
