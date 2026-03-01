/**
 * Safe date utilities that avoid timezone-related day shifts.
 */

export function toDateOnly(dateStr: string): string {
  if (!dateStr) return dateStr;
  return dateStr.split('T')[0];
}

export function parseLocalDate(dateStr: string): Date {
  const clean = toDateOnly(dateStr);
  const [year, month, day] = clean.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toMonthOnly(dateStr: string): string {
  return toDateOnly(dateStr).substring(0, 7);
}

export function clampDayToMonth(year: number, month: number, day: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  const clampedDay = Math.min(day, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}
