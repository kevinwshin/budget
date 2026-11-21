import { useState } from 'react';
import { useData } from '../data';
import { useNav, type LineDraft } from '../nav';
import { today } from '../dates';
import { formatMoney, parseMoney, toInput } from '../money';
import { saveTx } from '../ops';
import { EnvelopeSelect, Field, SheetFrame } from '../ui';
import type { Id, Transaction } from '../types';

type Side = 'from' | 'to';
type Draft = { id: Id; text: string };

const toDrafts = (ls: LineDraft[]): Draft[] => ls.map((l) => ({ id: l.id, text: toInput(l.amount) }));

/**
 * Any number of sources and destinations. When one side has a single line,
 * its amount is computed from the other side's total and cannot be typed.
 */
export function MoveSheet({ title, from, to, edit }: { title?: string; from: LineDraft[]; to: LineDraft[]; edit?: Transaction }) {
  const d = useData();
  const nav = useNav();
  const init = edit
    ? {
        from: edit.lines.filter((l) => l.amount < 0).map((l) => ({ id: l.envelopeId, text: toInput(-l.amount) })),
        to: edit.lines.filter((l) => l.amount > 0).map((l) => ({ id: l.envelopeId, text: toInput(l.amount) })),
      }
    : { from: toDrafts(from), to: toDrafts(to) };
  const [sides, setSides] = useState<Record<Side, Draft[]>>(init);
  const [heading, setHeading] = useState(edit ? 'Edit transfer' : title ?? 'Move money');
  const [date, setDate] = useState(edit?.date ?? today());
  const [note, setNote] = useState(edit?.note ?? '');

  const auto: Side | null = sides.from.length === 1 ? 'from' : sides.to.length === 1 ? 'to' : null;
  const typed = (s: Side) => sides[s].map((l) => parseMoney(l.text) ?? 0);
  const amounts: Record<Side, number[]> = { from: typed('from'), to: typed('to') };
  if (auto) amounts[auto] = [amounts[auto === 'from' ? 'to' : 'from'].reduce((a, b) => a + b, 0)];
  const total = (s: Side) => amounts[s].reduce((a, b) => a + b, 0);

  const all = [...sides.from.map((l, i) => ({ id: l.id, amt: -amounts.from[i] })), ...sides.to.map((l, i) => ({ id: l.id, amt: amounts.to[i] }))];
  const chosen = all.filter((l) => l.id);
  const problems: string[] = [];
  if (total('from') !== total('to')) problems.push(`From and To differ by ${formatMoney(Math.abs(total('from') - total('to')))}.`);
  if (chosen.length < all.length) problems.push('Choose an envelope on every line.');
  if (new Set(chosen.map((l) => l.id)).size < chosen.length) problems.push('An envelope can appear only once.');
  if (all.some((l) => l.amt === 0) && total('to') > 0) problems.push('Every line needs an amount.');

  const net = new Map<string, number>();
  for (const l of chosen) {
    const a = d.accountTag(d.env(l.id)?.accountTagId ?? '')?.name ?? '?';
    net.set(a, (net.get(a) ?? 0) + l.amt);
  }
  const bank = [...net].filter(([, v]) => v !== 0);

  const update = (s: Side, i: number, patch: Partial<Draft>) =>
    setSides({ ...sides, [s]: sides[s].map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  const save = async () => {
    await saveTx({
      id: edit?.id, kind: 'transfer', date, note,
      lines: all.map((l) => ({ envelopeId: l.id, amount: l.amt })),
    });
    nav.pop();
    nav.toast(edit ? 'Transfer updated' : 'Moved. Transfer recorded.');
  };

  const side = (s: Side, label: string) => (
    <>
      <div className="mvside"><span>{label}</span><span className="num">{formatMoney(total(s))}</span></div>
      {sides[s].map((l, i) => (
        <div className="splitline" key={i}>
          <EnvelopeSelect value={l.id} onChange={(id) => update(s, i, { id })} />
          <input className="inp" inputMode="decimal" placeholder="0.00" readOnly={auto === s}
            value={auto === s ? toInput(amounts[s][0]) : l.text} onChange={(e) => update(s, i, { text: e.target.value })} />
          {sides[s].length > 1 && (
            <button className="iconbtn" style={{ width: 32 }} aria-label="Remove line" onClick={() => setSides({ ...sides, [s]: sides[s].filter((_, j) => j !== i) })}>×</button>
          )}
        </div>
      ))}
      <button className="btn text" onClick={() => setSides({ ...sides, [s]: [...sides[s], { id: '', text: '' }] })}>+ Add {s === 'from' ? 'source' : 'destination'}</button>
    </>
  );

  return (
    <SheetFrame title={heading}>
      {side('from', 'From')}
      <div className="swap">
        <button className="iconbtn" aria-label="Swap From and To" onClick={() => { setSides({ from: sides.to, to: sides.from }); if (!edit) setHeading('Move money'); }}>⇅</button>
      </div>
      {side('to', 'To')}
      <div className="mvsum">
        One transfer record · {sides.from.length} → {sides.to.length}
        {(total('from') > 0 || total('to') > 0) && problems.map((p) => <div key={p} className="err">{p}</div>)}
        {!problems.length && bank.length > 0 && <div>At your bank: {bank.map(([a, v]) => `${a} ${v > 0 ? '+' : '−'}${formatMoney(Math.abs(v))}`).join(', ')}</div>}
      </div>
      <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <button className="btn block" disabled={problems.length > 0 || total('to') <= 0} onClick={() => void save()}>{edit ? 'Save' : 'Move'}</button>
    </SheetFrame>
  );
}
