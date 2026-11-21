import { CURRENCY, LOCALE } from './config';

const fmt = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });

/** Decimal places of the currency, for example 2 for USD and 0 for JPY. */
export const DIGITS = fmt.resolvedOptions().maximumFractionDigits ?? 2;
const SCALE = 10 ** DIGITS;

export const CURRENCY_SYMBOL =
  fmt.formatToParts(0).find((p) => p.type === 'currency')?.value ?? CURRENCY;

export function formatMoney(minor: number): string {
  return fmt.format(minor / SCALE);
}

export function formatSigned(minor: number): string {
  return (minor > 0 ? '+' : '') + formatMoney(minor);
}

/** Parses typed text to minor units. Returns null for empty or invalid input. */
export function parseMoney(text: string): number | null {
  const t = text.replace(/[^0-9.-]/g, '');
  if (t === '' || t === '-' || t === '.') return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * SCALE);
}

export function toInput(minor: number): string {
  return minor === 0 ? '' : (minor / SCALE).toFixed(DIGITS);
}

export function moneyClass(minor: number): string {
  return minor < 0 ? 'neg' : minor > 0 ? 'pos' : '';
}
