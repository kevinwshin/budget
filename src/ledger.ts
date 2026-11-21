import type { Id, Transaction } from './types';
import { monthEnd, monthOf } from './dates';

/** Balance of every envelope from all transactions dated on or before `upTo` (all when omitted). */
export function balances(txs: Transaction[], upTo?: string): Map<Id, number> {
  const out = new Map<Id, number>();
  for (const t of txs) {
    if (upTo && t.date > upTo) continue;
    for (const l of t.lines) out.set(l.envelopeId, (out.get(l.envelopeId) ?? 0) + l.amount);
  }
  return out;
}

export function balancesAtMonthEnd(txs: Transaction[], month: string): Map<Id, number> {
  return balances(txs, monthEnd(month));
}

export interface Flow {
  in: number;
  out: number;
}

/** Money into and out of each envelope during one month, from every kind of transaction. */
export function monthFlows(txs: Transaction[], month: string): Map<Id, Flow> {
  const out = new Map<Id, Flow>();
  for (const t of txs) {
    if (monthOf(t.date) !== month) continue;
    for (const l of t.lines) {
      const f = out.get(l.envelopeId) ?? { in: 0, out: 0 };
      if (l.amount > 0) f.in += l.amount;
      else f.out -= l.amount;
      out.set(l.envelopeId, f);
    }
  }
  return out;
}

/** Sum of line amounts of one kind in one month, limited to the envelopes `include` accepts. */
export function kindTotal(
  txs: Transaction[], month: string, kind: Transaction['kind'], include: (id: Id) => boolean,
): number {
  let sum = 0;
  for (const t of txs) {
    if (t.kind !== kind || monthOf(t.date) !== month) continue;
    for (const l of t.lines) if (include(l.envelopeId)) sum += l.amount;
  }
  return sum;
}

/** Newest first: by date, then by creation time. */
export function sortNewest(txs: Transaction[]): Transaction[] {
  return [...txs].sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
}
