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

export async function saveEnvelope(e: Omit<Envelope, 'id' | 'archived'> & { id?: Id; archived?: boolean }): Promise<Id> {
  const id = e.id ?? newId();
  await db.envelopes.put({ ...e, id, archived: e.archived ?? false });
  return id;
}

export async function setArchived(id: Id, archived: boolean): Promise<void> {
  await db.envelopes.update(id, { archived });
}

export async function saveBudgetTag(name: string, id?: Id): Promise<void> {
  if (id) return void (await db.budgetTags.update(id, { name }));
  const last = await db.budgetTags.orderBy('order').last();
  await db.budgetTags.add({ id: newId(), name, order: (last?.order ?? 0) + 1 });
}

export async function moveBudgetTag(id: Id, dir: -1 | 1): Promise<void> {
  const tags = await db.budgetTags.orderBy('order').toArray();
  const i = tags.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= tags.length) return;
  await db.transaction('rw', db.budgetTags, async () => {
    await db.budgetTags.update(tags[i].id, { order: tags[j].order });
    await db.budgetTags.update(tags[j].id, { order: tags[i].order });
  });
}

export async function deleteBudgetTag(id: Id): Promise<void> {
  if (await db.envelopes.filter((e) => e.budgetTagId === id).count()) throw new Error('Envelopes still use this tag.');
  await db.budgetTags.delete(id);
}

export async function saveAccountTag(name: string, id?: Id): Promise<void> {
  if (id) return void (await db.accountTags.update(id, { name }));
  await db.accountTags.add({ id: newId(), name });
}

export async function deleteAccountTag(id: Id): Promise<void> {
  if (await db.envelopes.filter((e) => e.accountTagId === id).count()) throw new Error('Envelopes still use this tag.');
  await db.accountTags.delete(id);
}
