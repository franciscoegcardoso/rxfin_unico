import { formatDateYMD } from './dateUtils';

/**
 * Determines the active billing month based on bill statuses and closing dates.
 *
 * Priority:
 * 1. If any bill has status 'open', return the most future billing_month among them.
 * 2. If no open bills, check the latest billing_month's closing_date:
 *    - If today > closing_date → advance to next month.
 *    - Otherwise → return that billing_month.
 * 3. Fallback: current calendar month.
 *
 * @param bills  Array of credit card bills with closing_date, billing_month, status, card_id.
 * @param cardFilter  Optional card_id to restrict the analysis to a single card.
 */
export function getActiveBillingMonth(
  bills: Array<{
    closing_date: string;
    billing_month: string;
    due_date: string;
    status: string;
    card_id: string;
  }>,
  cardFilter?: string,
): string {
  const filtered = cardFilter
    ? bills.filter(b => b.card_id === cardFilter)
    : bills;

  if (filtered.length === 0) return calendarMonth();

  const dueMonth = (b: { due_date: string }) => b.due_date.substring(0, 7);

  // Priority 1: open bills → most future due_date month
  const openBills = filtered.filter(b => b.status === 'open');
  if (openBills.length > 0) {
    return openBills.reduce((best, b) =>
      dueMonth(b) > best ? dueMonth(b) : best,
      dueMonth(openBills[0]),
    );
  }

  // Priority 2: no open bills → check closing_date of latest (by due_date)
  const latest = filtered.reduce((best, b) =>
    dueMonth(b) > dueMonth(best) ? b : best,
    filtered[0],
  );

  const today = formatDateYMD(new Date());
  if (today > latest.closing_date) {
    return nextMonth(dueMonth(latest));
  }

  return dueMonth(latest);
}

// ── helpers ──────────────────────────────────────────────

function calendarMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m, 1); // m is already 1-based, so m means next month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
// sync
