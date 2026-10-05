// Calendar-date arithmetic on 'YYYY-MM-DD' strings. Done in UTC so the server
// timezone and DST never shift a date; timezone conversion happens in SQL.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: unknown): value is string {
  return typeof value === 'string' && DATE_RE.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z'));
}

export function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `date`. */
export function mondayOf(date: string): string {
  const dow = new Date(date + 'T00:00:00Z').getUTCDay(); // 0 = Sunday
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

export function formatDay(date: string, options: Intl.DateTimeFormatOptions) {
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-SE', { ...options, timeZone: 'UTC' });
}

/** 'HH:MM:SS' or 'HH:MM' → 'HH:MM'. */
export function hhmm(time: string) {
  return time.slice(0, 5);
}
