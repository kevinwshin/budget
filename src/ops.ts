import { db, newId } from './db';
import type { Envelope, Id, Transaction, TxKind, TxLine } from './types';

export interface TxInput {
  id?: Id;
  kind: TxKind;
  date: string;
  payee?: string;
  note?: string;
  lines: TxLine[];
}

export function validateTx(t: TxInput): string | null {
  if (!t.lines.length) return 'Add at least one envelope.';
  if (t.lines.some((l) => !l.envelopeId)) return 'Choose an envelope on every line.';
  if (t.lines.some((l) => !Number.isInteger(l.amount) || l.amount === 0)) return 'Every line needs an amount.';
  if (new Set(t.lines.map((l) => l.envelopeId)).size !== t.lines.length) return 'Each envelope can appear only once.';
  if (t.kind === 'transfer') {
    if (t.lines.reduce((s, l) => s + l.amount, 0) !== 0) return 'From and To must be equal.';
    if (!t.lines.some((l) => l.amount < 0) || !t.lines.some((l) => l.amount > 0)) return 'A transfer needs a source and a destination.';
  }
  if (t.kind === 'expense' && t.lines.some((l) => l.amount > 0)) return 'Expense amounts must be positive.';
  if (t.kind === 'income' && t.lines.some((l) => l.amount < 0)) return 'Income amounts must be positive.';
  return null;
}

export async function saveTx(t: TxInput): Promise<void> {
  const err = validateTx(t);
  if (err) throw new Error(err);
  const existing = t.id ? await db.transactions.get(t.id) : undefined;
  const row: Transaction = {
    id: t.id ?? newId(),
    kind: t.kind,
    date: t.date,
    payee: t.payee?.trim() || undefined,
    note: t.note?.trim() || undefined,
    lines: t.lines,
    envelopeIds: t.lines.map((l) => l.envelopeId),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  await db.transactions.put(row);
}

export async function deleteTx(id: Id): Promise<void> {
  await db.transactions.delete(id);
}

export async function saveEnvelope(e: Omit<Envelope, 'id' | 'archived' | 'order'> & { id?: Id; archived?: boolean }): Promise<Id> {
  const id = e.id ?? newId();
  const existing = e.id ? await db.envelopes.get(e.id) : undefined;
  // A new envelope, or one moved to another budget tag, goes to the end of its group.
  const order = existing && existing.budgetTagId === e.budgetTagId ? existing.order : await nextOrder('envelopes');
  await db.envelopes.put({ ...e, id, archived: e.archived ?? false, order });
  return id;
}

/** Swaps an active envelope with its neighbor in the same budget tag group. */
export async function moveEnvelope(id: Id, dir: -1 | 1): Promise<void> {
  const env = await db.envelopes.get(id);
  if (!env) return;
  const group = await db.envelopes.orderBy('order')
    .filter((e) => !e.archived && e.type !== 'income' && e.budgetTagId === env.budgetTagId).toArray();
  await swapWithNeighbor('envelopes', group, id, dir);
}

export async function setArchived(id: Id, archived: boolean): Promise<void> {
  await db.envelopes.update(id, { archived });
}

export async function saveBudgetTag(name: string, id?: Id): Promise<void> {
  if (id) return void (await db.budgetTags.update(id, { name }));
  await db.budgetTags.add({ id: newId(), name, order: await nextOrder('budgetTags') });
}

export async function moveBudgetTag(id: Id, dir: -1 | 1): Promise<void> {
  await swapWithNeighbor('budgetTags', await db.budgetTags.orderBy('order').toArray(), id, dir);
}

export async function deleteBudgetTag(id: Id): Promise<void> {
  if (await db.envelopes.filter((e) => e.budgetTagId === id).count()) throw new Error('Envelopes still use this tag.');
  await db.budgetTags.delete(id);
}

export async function saveAccountTag(name: string, id?: Id): Promise<void> {
  if (id) return void (await db.accountTags.update(id, { name }));
  await db.accountTags.add({ id: newId(), name, order: await nextOrder('accountTags') });
}

export async function moveAccountTag(id: Id, dir: -1 | 1): Promise<void> {
  await swapWithNeighbor('accountTags', await db.accountTags.orderBy('order').toArray(), id, dir);
}

export async function deleteAccountTag(id: Id): Promise<void> {
  if (await db.envelopes.filter((e) => e.accountTagId === id).count()) throw new Error('Envelopes still use this tag.');
  await db.accountTags.delete(id);
}

type OrderedTable = 'envelopes' | 'budgetTags' | 'accountTags';
type Ordered = { id: Id; order: number };

async function nextOrder(name: OrderedTable): Promise<number> {
  const last: Ordered | undefined = await db.table(name).orderBy('order').last();
  return (last?.order ?? 0) + 1;
}

/** `rows` must be sorted by order; swaps the order of `id` and the row `dir` steps away. */
async function swapWithNeighbor(name: OrderedTable, rows: Ordered[], id: Id, dir: -1 | 1): Promise<void> {
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;
  const table = db.table(name);
  await db.transaction('rw', table, async () => {
    await table.update(rows[i].id, { order: rows[j].order });
    await table.update(rows[j].id, { order: rows[i].order });
  });
}
