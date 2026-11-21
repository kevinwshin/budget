import { db } from './db';
import { CURRENCY } from './config';
import { balances } from './ledger';
import { rowsToSettings, setSetting } from './settings';
import type { AccountTag, BudgetTag, Envelope, Settings, Transaction } from './types';

/**
 * Raise by one whenever the file's structure changes, and add a migration from the previous
 * version to MIGRATIONS. Import reads formatVersion first, so it must stay the first key.
 */
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupV1 {
  formatVersion: 1;
  exportedAt: string;
  currency: string;
  settings: Settings;
  accountTags: AccountTag[];
  budgetTags: BudgetTag[];
  envelopes: (Envelope & { balance: number })[];
  transactions: Transaction[];
}

type AnyBackup = { formatVersion: number } & Record<string, unknown>;

/** MIGRATIONS[n] turns a version-n file into a version-(n+1) file. */
const MIGRATIONS: Record<number, (b: AnyBackup) => AnyBackup> = {};

export async function buildBackup(): Promise<BackupV1> {
  const [accountTags, budgetTags, envelopes, transactions, settingRows] = await Promise.all([
    db.accountTags.toArray(), db.budgetTags.toArray(), db.envelopes.toArray(),
    db.transactions.toArray(), db.settings.toArray(),
  ]);
  const bal = balances(transactions);
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    currency: CURRENCY,
    settings: rowsToSettings(settingRows),
    accountTags,
    budgetTags,
    envelopes: envelopes.map((e) => ({ ...e, balance: bal.get(e.id) ?? 0 })),
    transactions,
  };
}

export async function exportBackup(): Promise<string> {
  const data = await buildBackup();
  // The file records itself as the latest backup, so a restore does not report "no backup".
  data.settings.lastBackupAt = data.exportedAt;
  const name = `budget-backup-${data.exportedAt.slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  await setSetting('lastBackupAt', data.exportedAt);
  return name;
}

export interface ParsedBackup {
  data: BackupV1;
  warnings: string[];
}

export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('The file is not valid JSON.');
  }
  if (!raw || typeof raw !== 'object' || typeof (raw as AnyBackup).formatVersion !== 'number') {
    throw new Error('The file is not a budget backup: formatVersion is missing.');
  }
  let b = raw as AnyBackup;
  if (b.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error(`The backup uses format ${b.formatVersion}, and this app reads up to format ${BACKUP_FORMAT_VERSION}. Update the app first.`);
  }
  while (b.formatVersion < BACKUP_FORMAT_VERSION) {
    const step = MIGRATIONS[b.formatVersion];
    if (!step) throw new Error(`No migration from backup format ${b.formatVersion}.`);
    b = step(b);
  }
  const data = b as unknown as BackupV1;
  for (const k of ['accountTags', 'budgetTags', 'envelopes', 'transactions'] as const) {
    if (!Array.isArray(data[k])) throw new Error(`The backup has no ${k} list.`);
  }
  const warnings: string[] = [];
  if (data.currency !== CURRENCY) {
    warnings.push(`The backup uses ${data.currency}, and this app uses ${CURRENCY}. Amounts are not converted.`);
  }
  const bal = balances(data.transactions);
  const off = data.envelopes.filter((e) => (bal.get(e.id) ?? 0) !== e.balance);
  if (off.length) warnings.push(`${off.length} envelope balance(s) in the file do not match their transactions. The transactions are used.`);
  return { data, warnings };
}

/** Replaces every table with the backup's contents in one database transaction. */
export async function restoreBackup(data: BackupV1): Promise<void> {
  await db.transaction('rw', [db.accountTags, db.budgetTags, db.envelopes, db.transactions, db.settings], async () => {
    await Promise.all([db.accountTags.clear(), db.budgetTags.clear(), db.envelopes.clear(), db.transactions.clear(), db.settings.clear()]);
    await db.accountTags.bulkAdd(data.accountTags);
    await db.budgetTags.bulkAdd(data.budgetTags);
    await db.envelopes.bulkAdd(data.envelopes.map(({ balance: _balance, ...e }) => e));
    await db.transactions.bulkAdd(data.transactions);
    await db.settings.bulkAdd(Object.entries(data.settings).map(([key, value]) => ({ key: key as keyof Settings, value })));
  });
}
