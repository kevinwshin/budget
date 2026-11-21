import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_FORMAT_VERSION, parseBackup } from '../src/backup.ts';
import { CURRENCY } from '../src/config.ts';

const valid = (patch: Record<string, unknown> = {}) => JSON.stringify({
  formatVersion: 1,
  exportedAt: '2026-11-21T00:00:00.000Z',
  currency: CURRENCY,
  settings: { theme: 'system', envelopeLayout: 'tiles', lastBackupAt: null },
  accountTags: [], budgetTags: [], envelopes: [], transactions: [],
  ...patch,
});

test('import refuses files it cannot restore safely', () => {
  const cases: [string, string][] = [
    ['not JSON', 'budget export'],
    ['no format version', JSON.stringify({ envelopes: [] })],
    ['newer format than the app reads', valid({ formatVersion: BACKUP_FORMAT_VERSION + 1 })],
    ['missing transaction list', valid({ transactions: undefined })],
  ];
  for (const [label, text] of cases) assert.throws(() => parseBackup(text), Error, label);
  assert.doesNotThrow(() => parseBackup(valid()));
});

test('import warns when the backup uses a different currency', () => {
  assert.equal(parseBackup(valid()).warnings.length, 0);
  const other = (CURRENCY as string) === 'EUR' ? 'USD' : 'EUR';
  assert.equal(parseBackup(valid({ currency: other })).warnings.length, 1);
});
