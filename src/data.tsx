import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { balances } from './ledger';
import { rowsToSettings } from './settings';
import type { AccountTag, BudgetTag, Envelope, Id, Settings, Transaction } from './types';

export interface Data {
  envelopes: Envelope[];
  budgetTags: BudgetTag[];
  accountTags: AccountTag[];
  txs: Transaction[];
  settings: Settings;
  /** Current balance of every envelope, from all transactions. */
  balance: Map<Id, number>;
  env: (id: Id) => Envelope | undefined;
  income: Envelope | undefined;
  budgetTag: (id: Id | null) => BudgetTag | undefined;
  accountTag: (id: Id) => AccountTag | undefined;
}

const Ctx = createContext<Data | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const envelopes = useLiveQuery(() => db.envelopes.toArray());
  const budgetTags = useLiveQuery(() => db.budgetTags.orderBy('order').toArray());
  const accountTags = useLiveQuery(() => db.accountTags.toArray());
  const txs = useLiveQuery(() => db.transactions.toArray());
  const settingRows = useLiveQuery(() => db.settings.toArray());

  const value = useMemo<Data | null>(() => {
    if (!envelopes || !budgetTags || !accountTags || !txs || !settingRows) return null;
    const envMap = new Map(envelopes.map((e) => [e.id, e]));
    const btMap = new Map(budgetTags.map((t) => [t.id, t]));
    const atMap = new Map(accountTags.map((t) => [t.id, t]));
    const sortedAccounts = [...accountTags].sort((a, b) => a.name.localeCompare(b.name));
    return {
      envelopes,
      budgetTags,
      accountTags: sortedAccounts,
      txs,
      settings: rowsToSettings(settingRows),
      balance: balances(txs),
      env: (id) => envMap.get(id),
      income: envelopes.find((e) => e.type === 'income'),
      budgetTag: (id) => (id ? btMap.get(id) : undefined),
      accountTag: (id) => atMap.get(id),
    };
  }, [envelopes, budgetTags, accountTags, txs, settingRows]);

  if (!value) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): Data {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData outside DataProvider');
  return v;
}

/** Active envelopes grouped by budget tag in tag order; envelopes within a group by name. */
export function groupByBudgetTag(d: Data, list: Envelope[]): { tag: BudgetTag; items: Envelope[] }[] {
  return d.budgetTags
    .map((tag) => ({
      tag,
      items: list.filter((e) => e.budgetTagId === tag.id).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.items.length);
}
