/**
 * Parse ISO / Postgres timestamps reliably across web and React Native.
 * Supabase `timestamptz` values are UTC; strings without a zone must not be treated as local wall time.
 */
export function parseIsoTimestamp(value: string): Date {
  const raw = value.trim();
  if (!raw) return new Date(NaN);

  const normalized = raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw;
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);

  if (hasTimeZone) return new Date(normalized);

  return new Date(`${normalized}Z`);
}

/** Format a timestamp in the user's local timezone (Hermes-safe). */
export function formatLocalTime(value: string): string {
  const date = parseIsoTimestamp(value);
  if (Number.isNaN(date.getTime())) return '';

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/** Canonical UTC ISO string for persistence. */
export function toUtcIso(value: string | Date): string {
  const date = value instanceof Date ? value : parseIsoTimestamp(value);
  return date.toISOString();
}
