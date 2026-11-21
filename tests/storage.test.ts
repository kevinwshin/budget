import 'fake-indexeddb/auto';
import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { db, deleteAllData } from '../src/db.ts';
import { parseBackup, restoreBackup } from '../src/backup.ts';
import { CURRENCY } from '../src/config.ts';

const settings = { theme: 'dark', envelopeLayout: 'list', lastBackupAt: '2026-11-01T00:00:00.000Z' };
const tx = { id: 't1', kind: 'income', date: '2026-11-02', lines: [{ envelopeId: 'inc', amount: 5000 }], envelopeIds: ['inc'], createdAt: '2026-11-02T00:00:00.000Z' };

// A format-1 file: account tags and envelopes have no `order`, as files exported before reordering.
// When MIGRATIONS drops format 1, switch this fixture to the oldest format still read.
const v1File = JSON.stringify({
  formatVersion: 1,
  exportedAt: '2026-11-21T00:00:00.000Z',
  currency: CURRENCY,
  settings,
  accountTags: [{ id: 'sav', name: 'Savings' }, { id: 'chk', name: 'Checking' }],
  budgetTags: [{ id: 'food', name: 'Food', order: 1 }],
  envelopes: [
    { id: 'inc', name: 'Income', type: 'income', budgetTagId: null, accountTagId: 'chk', archived: false, balance: 5000 },
    { id: 'rent', name: 'Rent', type: 'standard', budgetTagId: 'food', accountTagId: 'chk', archived: false, balance: 0 },
    { id: 'gro', name: 'Groceries', type: 'standard', budgetTagId: 'food', accountTagId: 'sav', archived: false, balance: 0 },
  ],
  transactions: [tx],
});

beforeEach(async () => {
  await db.open();
  await deleteAllData();
  // Rows that a restore must remove.
  await db.budgetTags.add({ id: 'old', name: 'Old', order: 1 });
  await db.transactions.add({ ...tx, id: 'old-tx' } as never);
});

test('restoring a backup replaces every table, and a format-1 file keeps its name order', async () => {
  await restoreBackup(parseBackup(v1File).data);
  const ids = async (t: { toArray(): Promise<{ id: string }[]> }) => (await t.toArray()).map((r) => r.id).sort();
  assert.deepEqual(await ids(db.budgetTags), ['food']);
  assert.deepEqual(await ids(db.transactions), ['t1']);
  assert.deepEqual((await db.accountTags.orderBy('order').toArray()).map((t) => t.name), ['Checking', 'Savings']);
  assert.deepEqual((await db.envelopes.orderBy('order').toArray()).map((e) => e.name), ['Groceries', 'Income', 'Rent']);
  assert.deepEqual(Object.fromEntries((await db.settings.toArray()).map((r) => [r.key, r.value])), settings);
});

test('Delete all data leaves only the first-install rows', async () => {
  await restoreBackup(parseBackup(v1File).data);
  await deleteAllData();
  const [accounts, envelopes] = [await db.accountTags.toArray(), await db.envelopes.toArray()];
  assert.deepEqual(accounts.map((a) => [a.name, a.order]), [['Checking', 1]]);
  assert.deepEqual(envelopes.map((e) => [e.name, e.type, e.accountTagId, e.order]), [['Income', 'income', accounts[0].id, 1]]);
  assert.equal(await db.budgetTags.count(), 0);
  assert.equal(await db.transactions.count(), 0);
  assert.equal(await db.settings.count(), 0);
});
