import Dexie, { type EntityTable } from 'dexie';
import type { AccountTag, BudgetTag, Envelope, SettingRow, Transaction } from './types';

export class BudgetDB extends Dexie {
  accountTags!: EntityTable<AccountTag, 'id'>;
  budgetTags!: EntityTable<BudgetTag, 'id'>;
  envelopes!: EntityTable<Envelope, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  settings!: EntityTable<SettingRow, 'key'>;

  constructor() {
    super('budget');
    this.version(1).stores({
      accountTags: 'id',
      budgetTags: 'id, order',
      envelopes: 'id, type',
      transactions: 'id, date, kind, *envelopeIds',
      settings: 'key',
    });
    this.on('populate', (tx) => {
      const s = starterRows();
      tx.table('accountTags').add(s.accountTag);
      tx.table('envelopes').add(s.income);
    });
  }
}

export const db = new BudgetDB();

/** The rows a new install starts with: one account tag and the income envelope. */
function starterRows(): { accountTag: AccountTag; income: Envelope } {
  const accountTagId = newId();
  return {
    accountTag: { id: accountTagId, name: 'Checking' },
    income: { id: newId(), name: 'Income', type: 'income', budgetTagId: null, accountTagId, archived: false },
  };
}

/** Clears every table, settings included, and puts back the rows a new install starts with. */
export async function deleteAllData(): Promise<void> {
  await db.transaction('rw', [db.accountTags, db.budgetTags, db.envelopes, db.transactions, db.settings], async () => {
    await Promise.all([db.accountTags.clear(), db.budgetTags.clear(), db.envelopes.clear(), db.transactions.clear(), db.settings.clear()]);
    const s = starterRows();
    await db.accountTags.add(s.accountTag);
    await db.envelopes.add(s.income);
  });
}

// crypto.randomUUID exists only in secure contexts; getRandomValues works everywhere.
export function newId(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}
