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
      const accountTagId = newId();
      tx.table('accountTags').add({ id: accountTagId, name: 'Checking' });
      tx.table('envelopes').add({
        id: newId(), name: 'Income', type: 'income', budgetTagId: null, accountTagId, archived: false,
      });
    });
  }
}

export const db = new BudgetDB();

// crypto.randomUUID exists only in secure contexts; getRandomValues works everywhere.
export function newId(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}
