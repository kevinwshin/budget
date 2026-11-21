import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTx, type TxInput } from '../src/ops.ts';

const t = (kind: TxInput['kind'], lines: [string, number][]): TxInput => ({
  kind, date: '2026-11-21', lines: lines.map(([envelopeId, amount]) => ({ envelopeId, amount })),
});

test('saving rejects transactions that would corrupt balances and accepts valid ones', () => {
  const cases: [string, TxInput, boolean][] = [
    ['unbalanced transfer', t('transfer', [['g', -500], ['d', 400]]), false],
    ['same envelope twice', t('expense', [['g', -100], ['g', -50]]), false],
    ['expense that adds money', t('expense', [['g', 100]]), false],
    ['income that removes money', t('income', [['g', -100]]), false],
    ['zero-amount line', t('expense', [['g', 0]]), false],
    ['line with no envelope', t('expense', [['', -100]]), false],
    ['fraction of a cent', t('expense', [['g', -10.5]]), false],
    ['no lines', t('expense', []), false],
    ['split expense', t('expense', [['g', -2350], ['h', -1899]]), true],
    ['one-to-many transfer', t('transfer', [['inc', -1000], ['g', 600], ['s', 400]]), true],
    ['many-to-many transfer', t('transfer', [['a', -300], ['b', -200], ['c', 250], ['d', 250]]), true],
    ['income', t('income', [['inc', 285000]]), true],
    ['value decrease', t('revaluation', [['r', -55000]]), true],
    ['adjustment', t('adjustment', [['g', -1243]]), true],
  ];
  for (const [label, input, valid] of cases) {
    assert.equal(validateTx(input) === null, valid, `${label}: ${validateTx(input)}`);
  }
});
