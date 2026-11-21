import { useState } from 'react';
import { useData } from '../data';
import { useNav } from '../nav';
import { today } from '../dates';
import { formatMoney, parseMoney, toInput } from '../money';
import { saveTx, validateTx } from '../ops';
import { BigAmount, EnvelopeSelect, Field, SheetFrame } from '../ui';
import type { Id, Transaction } from '../types';

type Kind = 'expense' | 'income';
type SplitLine = { id: Id; text: string };

export function AddSheet({ kind: initialKind, edit }: { kind: Kind; edit?: Transaction }) {
  const d = useData();
  const nav = useNav();
  const [kind, setKind] = useState<Kind>(edit ? (edit.kind as Kind) : initialKind);
  const editTotal = edit ? Math.abs(edit.lines.reduce((s, l) => s + l.amount, 0)) : 0;
  const [amount, setAmount] = useState(toInput(editTotal));
  const [split, setSplit] = useState(!!edit && edit.lines.length > 1);
  const [envId, setEnvId] = useState<Id>(edit?.lines.length === 1 ? edit.lines[0].envelopeId : initialKind === 'income' ? d.income?.id ?? '' : '');
  const [lines, setLines] = useState<SplitLine[]>(
    edit && edit.lines.length > 1 ? edit.lines.map((l) => ({ id: l.envelopeId, text: toInput(Math.abs(l.amount)) })) : [{ id: '', text: '' }, { id: '', text: '' }],
  );
  const [date, setDate] = useState(edit?.date ?? today());
  const [payee, setPayee] = useState(edit?.payee ?? '');
  const [note, setNote] = useState(edit?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const recent: Id[] = [];
  for (const t of [...d.txs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (t.kind !== 'expense') continue;
    for (const l of t.lines) {
      const e = d.env(l.envelopeId);
      if (e && !e.archived && !recent.includes(e.id)) recent.push(e.id);
    }
    if (recent.length >= 5) break;
  }
  const shownChips = recent.slice(0, 5);

  const total = parseMoney(amount) ?? 0;
  const splitSum = lines.reduce((s, l) => s + (parseMoney(l.text) ?? 0), 0);

  const switchKind = (k: Kind) => {
    setKind(k);
    setSplit(false);
    setEnvId(k === 'income' ? d.income?.id ?? '' : '');
  };

  const save = async () => {
    const sign = kind === 'expense' ? -1 : 1;
    const txLines = kind === 'expense' && split
      ? lines.filter((l) => l.id || l.text).map((l) => ({ envelopeId: l.id, amount: sign * (parseMoney(l.text) ?? 0) }))
      : [{ envelopeId: envId, amount: sign * total }];
    if (split && splitSum !== total) return setError(`Lines add up to ${formatMoney(splitSum)}, not ${formatMoney(total)}.`);
    const input = { id: edit?.id, kind, date, payee, note, lines: txLines };
    const err = total <= 0 ? 'Enter an amount.' : validateTx(input);
    if (err) return setError(err);
    await saveTx(input);
    nav.pop();
    nav.toast(edit ? 'Transaction updated' : 'Transaction saved');
  };

  const notIncome = (e: { type: string }) => e.type !== 'income';

  return (
    <SheetFrame>
      <div className="seg">
        <button className={kind === 'expense' ? 'on' : ''} disabled={!!edit} onClick={() => switchKind('expense')}>Expense</button>
        <button className={kind === 'income' ? 'on' : ''} disabled={!!edit} onClick={() => switchKind('income')}>Income</button>
      </div>
      <BigAmount value={amount} onChange={setAmount} autoFocus={!edit} />

      {kind === 'expense' && !split && (
        <>
          {shownChips.length > 0 && (
            <div className="chips">
              {shownChips.map((id) => <button key={id} className={`chip ${envId === id ? 'on' : ''}`} onClick={() => setEnvId(id)}>{d.env(id)?.name}</button>)}
            </div>
          )}
          <Field label="Envelope"><EnvelopeSelect value={envId} onChange={setEnvId} filter={notIncome} /></Field>
          <button className="btn text" onClick={() => { setSplit(true); setLines([{ id: envId, text: amount }, { id: '', text: '' }]); }}>+ Split across envelopes</button>
        </>
      )}
      {kind === 'expense' && split && (
        <>
          {lines.map((l, i) => (
            <div className="splitline" key={i}>
              <EnvelopeSelect value={l.id} filter={notIncome} onChange={(id) => setLines(lines.map((x, j) => (j === i ? { ...x, id } : x)))} />
              <input className="inp" inputMode="decimal" placeholder="0.00" value={l.text} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
              {lines.length > 2 && <button className="iconbtn" style={{ width: 32 }} aria-label="Remove line" onClick={() => setLines(lines.filter((_, j) => j !== i))}>×</button>}
            </div>
          ))}
          <button className="btn text" onClick={() => setLines([...lines, { id: '', text: '' }])}>+ Add line</button>
          <div className="note">Lines must add up to the total. Remaining: {formatMoney(total - splitSum)}</div>
        </>
      )}
      {kind === 'income' && (
        <>
          <Field label="Into envelope"><EnvelopeSelect value={envId} onChange={setEnvId} /></Field>
          <div className="note">Paychecks go to {d.income?.name ?? 'Income'}. Interest can go straight to the envelope that earned it.</div>
        </>
      )}

      <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label={kind === 'expense' ? 'Payee (optional)' : 'Source (optional)'}>
        <input value={payee} placeholder={kind === 'expense' ? 'e.g. Kroger' : 'e.g. Employer, Ally Bank'} onChange={(e) => setPayee(e.target.value)} />
      </Field>
      <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      {error && <div className="err" style={{ marginBottom: 8 }}>{error}</div>}
      <button className="btn block" onClick={() => void save()}>Save</button>
    </SheetFrame>
  );
}
