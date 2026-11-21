import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balancesAtMonthEnd, monthFlows } from '../src/ledger.ts';
import type { Transaction, TxKind } from '../src/types.ts';

let n = 0;
const tx = (date: string, kind: TxKind, lines: [string, number][]): Transaction => ({
  id: `t${n++}`, kind, date,
  lines: lines.map(([envelopeId, amount]) => ({ envelopeId, amount })),
  envelopeIds: lines.map(([id]) => id),
  createdAt: `${date}T12:00:00.000Z`,
});

test('month-end balance counts transactions through the last day of the month and none after', () => {
  const txs = [
    tx('2026-01-31', 'income', [['g', 10000]]),
    tx('2026-02-28', 'expense', [['g', -3000]]),
    tx('2026-03-01', 'expense', [['g', -500]]),
    tx('2026-12-31', 'income', [['g', 100]]),
    tx('2027-01-01', 'expense', [['g', -100]]),
  ];
  const cases: [string, number][] = [
    ['2026-01', 10000], // the 31st counts
    ['2026-02', 7000], // a 28-day month still includes its last day
    ['2026-03', 6500],
    ['2026-12', 6600], // the next year's transaction stays out
  ];
  for (const [month, expected] of cases) assert.equal(balancesAtMonthEnd(txs, month).get('g'), expected, month);
});

test('Month report In and Out count every line, including transfers and value updates', () => {
  const txs = [
    tx('2026-11-01', 'income', [['inc', 200000]]),
    tx('2026-11-01', 'transfer', [['inc', -50000], ['g', 50000]]),
    tx('2026-11-05', 'expense', [['g', -12000]]),
    tx('2026-11-03', 'revaluation', [['r', 5000]]),
    tx('2026-11-20', 'revaluation', [['r', -2000]]),
    tx('2026-11-21', 'transfer', [['g', -3000], ['d', 3000]]),
    tx('2026-10-31', 'income', [['g', 99900]]), // previous month: not in November's flows
  ];
  const flows = monthFlows(txs, '2026-11');
  assert.deepEqual(Object.fromEntries(flows), {
    inc: { in: 200000, out: 50000 },
    g: { in: 50000, out: 15000 },
    r: { in: 5000, out: 2000 },
    d: { in: 3000, out: 0 },
  });
});
