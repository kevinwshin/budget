import { useState } from 'react';
import { useData } from '../data';
import { useNav } from '../nav';
import { today } from '../dates';
import { formatSigned, parseMoney, toInput } from '../money';
import { saveTx } from '../ops';
import { Field, SheetFrame } from '../ui';
import type { Id } from '../types';

export function AdjustSheet({ envId }: { envId: Id }) {
  const d = useData();
  const nav = useNav();
  const current = d.balance.get(envId) ?? 0;
  const [value, setValue] = useState(toInput(current));
  const [reason, setReason] = useState('');
  const next = parseMoney(value);
  const delta = next === null ? 0 : next - current;

  const save = async () => {
    await saveTx({ kind: 'adjustment', date: today(), note: reason, lines: [{ envelopeId: envId, amount: delta }] });
    nav.pop();
    nav.toast('Adjustment recorded');
  };

  return (
    <SheetFrame title={`Adjust ${d.env(envId)?.name ?? ''}`}>
      <Field label="Correct balance"><input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
      <div className="note">Change: {formatSigned(delta)}</div>
      <Field label="Reason (required)"><input value={reason} placeholder="e.g. missed receipt" onChange={(e) => setReason(e.target.value)} /></Field>
      <button className="btn block" disabled={next === null || delta === 0 || !reason.trim()} onClick={() => void save()}>Record adjustment</button>
    </SheetFrame>
  );
}
