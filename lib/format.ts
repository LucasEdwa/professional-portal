import { DEFAULT_TIMEZONE } from '@/lib/professional';

// Server components run in UTC on Vercel, so every date shown to a professional
// must be formatted in their own timezone (professional_profiles.timezone).

export function formatSessionDate(iso: string, timeZone: string = DEFAULT_TIMEZONE) {
  return new Date(iso).toLocaleString('en-SE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
}

/** Calendar day (YYYY-MM-DD) of `date` in `timeZone`. */
export function dayKey(date: Date | string, timeZone: string = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(new Date(date));
}

/** Current hour (0–23) in `timeZone`. */
export function hourIn(timeZone: string = DEFAULT_TIMEZONE) {
  return Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone }).format(new Date()),
  );
}

/** PostgREST returns a to-one embed as an object, but older typings model it as an array. */
export function firstEmbed<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
