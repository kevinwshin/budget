import { useState } from 'react';
import { useData } from '../data';
import { useNav } from '../nav';
import { saveEnvelope } from '../ops';
import { Field, SheetFrame } from '../ui';
import type { EnvelopeType, Id } from '../types';

export function EnvEditSheet({ envId }: { envId?: Id }) {
  const d = useData();
  const nav = useNav();
  const e = envId ? d.env(envId) : undefined;
  const isIncome = e?.type === 'income';
  const [name, setName] = useState(e?.name ?? '');
  const [budgetTagId, setBudgetTagId] = useState<Id>(e?.budgetTagId ?? d.budgetTags[0]?.id ?? '');
  const [accountTagId, setAccountTagId] = useState<Id>(e?.accountTagId ?? d.income?.accountTagId ?? d.accountTags[0]?.id ?? '');
  const [type, setType] = useState<EnvelopeType>(e?.type ?? 'standard');

  const ok = name.trim() && accountTagId && (isIncome || budgetTagId);
  const save = async () => {
    await saveEnvelope({
      id: e?.id, archived: e?.archived, name: name.trim(), type,
      budgetTagId: isIncome ? null : budgetTagId, accountTagId,
    });
    nav.pop();
    nav.toast(e ? 'Envelope saved' : `${name.trim()} added`);
  };

  if (!isIncome && d.budgetTags.length === 0) {
    return (
      <SheetFrame title="Add an envelope">
        <div className="note">Every envelope belongs to a budget tag, such as Housing or Entertainment. Create one first.</div>
        <button className="btn block" onClick={() => nav.replaceTop({ sheet: { type: 'tagEdit', kind: 'budget' } })}>Add budget tag</button>
      </SheetFrame>
    );
  }

  return (
    <SheetFrame title={e ? 'Edit envelope' : 'Add envelope'}>
      <Field label="Name"><input value={name} autoFocus={!e} onChange={(ev) => setName(ev.target.value)} /></Field>
      {!isIncome && (
        <Field label="Budget tag">
          <select value={budgetTagId} onChange={(ev) => setBudgetTagId(ev.target.value)}>
            {d.budgetTags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Account tag">
        <select value={accountTagId} onChange={(ev) => setAccountTagId(ev.target.value)}>
          {d.accountTags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      {!isIncome && (
        <Field label="Type">
          <select value={type} onChange={(ev) => setType(ev.target.value as EnvelopeType)}>
            <option value="standard">Standard</option>
            <option value="investment">Investment (value changes on its own)</option>
          </select>
        </Field>
      )}
      <button className="btn block" disabled={!ok} onClick={() => void save()}>Save</button>
    </SheetFrame>
  );
}
