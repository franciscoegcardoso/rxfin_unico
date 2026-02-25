/**
 * Safe date utilities that avoid timezone-related day shifts.
 * 
 * Problem: `new Date("2026-02-10")` is interpreted as UTC midnight,
 * which in Brasília (UTC-3) becomes Feb 9th 21:00. This causes
 * transactions to appear one day off.
 * 
 * Solution: Always extract YYYY-MM-DD components as strings and
 * construct Date objects using local-time constructors.
 */

/**
 * Extract the YYYY-MM-DD portion from any date string (ISO or plain).
 * Strips time component entirely.
 */
export function toDateOnly(dateStr: string): string {
  if (!dateStr) return dateStr;
  return dateStr.split('T')[0];
}

/**
 * Parse a date string into a Date object at local midnight,
 * avoiding UTC interpretation pitfalls.
 * 
 * Use this instead of `new Date(dateString)` or `parseISO(dateString)`.
 */
export function parseLocalDate(dateStr: string): Date {
  const clean = toDateOnly(dateStr);
  const [year, month, day] = clean.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date object as YYYY-MM-DD using local date components.
 * Use this instead of `toISOString().split('T')[0]`.
 */
export function formatDateYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extract YYYY-MM from a date string safely.
 */
export function toMonthOnly(dateStr: string): string {
  return toDateOnly(dateStr).substring(0, 7);
}

/**
 * Build a YYYY-MM-DD string clamping the day to the last valid day
 * of the target month. Useful for projecting installment dates into
 * months that may have fewer days than the original purchase date.
 *
 * @param year  Full year (e.g. 2026)
 * @param month 1-12
 * @param day   Desired day (will be clamped to month's last day)
 */
export function clampDayToMonth(year: number, month: number, day: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  const clampedDay = Math.min(day, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}
// sync
