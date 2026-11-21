import { useState } from 'react';
import { useData } from '../data';
import { useNav } from '../nav';
import { today } from '../dates';
import { formatSigned, parseMoney, toInput } from '../money';
import { saveTx } from '../ops';
import { BigAmount, Field, SheetFrame } from '../ui';
import type { Id } from '../types';

export function ValueSheet({ envId }: { envId: Id }) {
  const d = useData();
  const nav = useNav();
  const e = d.env(envId);
  const current = d.balance.get(envId) ?? 0;
  const [value, setValue] = useState(toInput(current));
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const next = parseMoney(value);
  const delta = next === null ? 0 : next - current;

  const save = async () => {
    await saveTx({ kind: 'revaluation', date, note, lines: [{ envelopeId: envId, amount: delta }] });
    nav.pop();
    nav.toast('Value updated');
  };

  return (
    <SheetFrame title={`Update value · ${e?.name ?? ''}`}>
      <div className="note">Enter the current value from your statement. The difference is recorded as a value update and does not touch other envelopes.</div>
      <BigAmount value={value} onChange={setValue} autoFocus />
      <div className="note">Change: <span className={delta < 0 ? 'neg' : delta > 0 ? 'pos' : ''}>{formatSigned(delta)}</span></div>
      <Field label="Date"><input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} /></Field>
      <Field label="Note (optional)"><input value={note} onChange={(ev) => setNote(ev.target.value)} /></Field>
      <button className="btn block" disabled={next === null || delta === 0} onClick={() => void save()}>Save value</button>
    </SheetFrame>
  );
}
