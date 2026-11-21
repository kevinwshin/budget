import { useState } from 'react';
import { useData } from '../data';
import { useNav } from '../nav';
import { deleteAccountTag, deleteBudgetTag, saveAccountTag, saveBudgetTag } from '../ops';
import { Field, SheetFrame } from '../ui';
import type { Id } from '../types';

export function TagEditSheet({ kind, id }: { kind: 'budget' | 'account'; id?: Id }) {
  const d = useData();
  const nav = useNav();
  const existing = id ? (kind === 'budget' ? d.budgetTag(id) : d.accountTag(id)) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const label = kind === 'budget' ? 'budget tag' : 'account tag';

  const save = async () => {
    await (kind === 'budget' ? saveBudgetTag(name.trim(), id) : saveAccountTag(name.trim(), id));
    nav.pop();
  };
  const remove = async () => {
    try {
      await (kind === 'budget' ? deleteBudgetTag(id!) : deleteAccountTag(id!));
      nav.pop();
      nav.toast(`Deleted ${existing?.name}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <SheetFrame title={existing ? `Rename ${label}` : `Add ${label}`}>
      <Field label="Name"><input value={name} autoFocus onChange={(e) => setName(e.target.value)} placeholder={kind === 'budget' ? 'e.g. Entertainment' : 'e.g. Savings'} /></Field>
      {error && <div className="err" style={{ marginBottom: 8 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn block" style={{ flex: 1 }} disabled={!name.trim()} onClick={() => void save()}>Save</button>
        {existing && <button className="btn text" style={{ color: 'var(--neg)' }} onClick={() => void remove()}>Delete</button>}
      </div>
    </SheetFrame>
  );
}
