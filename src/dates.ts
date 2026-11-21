import { LOCALE } from './config';

const pad = (n: number) => String(n).padStart(2, '0');

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/**
 * Upper bound for string comparison: every YYYY-MM-DD date in the month sorts at or below
 * YYYY-MM-31, whatever the month's real length.
 */
export function monthEnd(month: string): string {
  return `${month}-31`;
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function lastMonths(month: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(month, i - count + 1));
}

const parse = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function monthLabel(month: string): string {
  return parse(`${month}-01`).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
}

export function monthShort(month: string): string {
  return parse(`${month}-01`).toLocaleDateString(LOCALE, { month: 'short' });
}

export function dateLabel(date: string): string {
  const t = today();
  if (date === t) return 'Today';
  const y = parse(t);
  y.setDate(y.getDate() - 1);
  if (date === `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`) return 'Yesterday';
  const d = parse(date);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(LOCALE, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
