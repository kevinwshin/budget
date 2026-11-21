export const parsePercent = (text: string) => Number(text.replace(/[^0-9.]/g, '')) || 0;
export const fmtPercent = (p: number) => String(Math.round(p * 100) / 100);
/** Typed decimals rarely sum to exactly 100 in floating point; this is the accepted gap. */
export const isHundred = (sum: number) => Math.abs(sum - 100) < 1e-6;

/**
 * Splits `total` (whole cents) by percentages. When the percentages count as 100%, the shares
 * add up to exactly `total`; otherwise they add up to the rounded share of it. Each share is
 * first rounded down, then the units still owed go to the shares with the largest dropped
 * fractions, and any overshoot comes off the shares with the smallest.
 */
export function splitByPercent(total: number, percents: number[]): number[] {
  const sum = percents.reduce((a, b) => a + b, 0);
  const target = isHundred(sum) ? total : Math.round((total * sum) / 100);
  const exact = percents.map((p) => (total * p) / 100);
  const out = exact.map(Math.floor);
  let left = target - out.reduce((a, b) => a + b, 0);
  const byFraction = exact.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0 && byFraction.length; k = (k + 1) % byFraction.length, left--) out[byFraction[k][1]] += 1;
  // Cycles from the smallest fraction up; `idle` stops the loop once every share is zero.
  for (let k = 0, idle = 0; left < 0 && idle < byFraction.length; k = (k + 1) % byFraction.length) {
    const i = byFraction[byFraction.length - 1 - k][1];
    if (out[i] > 0) { out[i] -= 1; left++; idle = 0; } else idle++;
  }
  return out;
}

/**
 * Percentages, to two decimals, that each amount is of their sum. Rounding remainders go to
 * the largest amount, so the results add up to exactly 100.
 */
export function percentsFromAmounts(amounts: number[]): string[] {
  const total = amounts.reduce((a, b) => a + b, 0);
  if (total <= 0) return amounts.map(() => '');
  const hundredths = amounts.map((a) => Math.round((a / total) * 10000));
  const largest = amounts.indexOf(Math.max(...amounts));
  hundredths[largest] += 10000 - hundredths.reduce((a, b) => a + b, 0);
  return hundredths.map((h) => String(h / 100));
}
