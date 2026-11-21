import { useState } from 'react';
import { useData } from '../data';
import { useNav, type LineDraft } from '../nav';
import { today } from '../dates';
import { formatMoney, parseMoney, toInput } from '../money';
import { saveTx } from '../ops';
import { fmtPercent, isHundred, parsePercent, percentsFromAmounts, splitByPercent } from '../percent';
import { EnvelopeSelect, Field, SheetFrame } from '../ui';
import type { Id, Transaction } from '../types';

type Side = 'from' | 'to';
type Mode = 'dollars' | 'percent';
type Draft = { id: Id; text: string };

const SIDES: Side[] = ['from', 'to'];
const toDrafts = (ls: LineDraft[]): Draft[] => ls.map((l) => ({ id: l.id, text: toInput(l.amount) }));

/**
 * Any number of sources and destinations, entered in dollars or as percentages of one total.
 * In dollars, a side with a single line is computed from the other side and cannot be typed.
 * In percentages, a side with a single line is fixed at 100%.
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
  const [mode, setMode] = useState<Mode>('dollars');
  const [totalText, setTotalText] = useState('');
  const [heading, setHeading] = useState(edit ? 'Edit transfer' : title ?? 'Transfer');
  const [date, setDate] = useState(edit?.date ?? today());
  const [note, setNote] = useState(edit?.note ?? '');

  // Percent mode.
  const pctTotal = parseMoney(totalText) ?? 0;
  const percents = (s: Side) => (sides[s].length === 1 ? [100] : sides[s].map((l) => parsePercent(l.text)));
  const pctSum = (s: Side) => percents(s).reduce((a, b) => a + b, 0);

  // Dollar mode.
  const auto: Side | null = sides.from.length === 1 ? 'from' : sides.to.length === 1 ? 'to' : null;
  const typed = (s: Side) => sides[s].map((l) => parseMoney(l.text) ?? 0);

  const amounts: Record<Side, number[]> = mode === 'percent'
    ? { from: splitByPercent(pctTotal, percents('from')), to: splitByPercent(pctTotal, percents('to')) }
    : { from: typed('from'), to: typed('to') };
  if (mode === 'dollars' && auto) amounts[auto] = [amounts[auto === 'from' ? 'to' : 'from'].reduce((a, b) => a + b, 0)];
  const total = (s: Side) => amounts[s].reduce((a, b) => a + b, 0);

  const all = [...sides.from.map((l, i) => ({ id: l.id, amt: -amounts.from[i] })), ...sides.to.map((l, i) => ({ id: l.id, amt: amounts.to[i] }))];
  const chosen = all.filter((l) => l.id);
  const problems: string[] = [];
  if (mode === 'percent') {
    for (const s of SIDES) {
      if (!isHundred(pctSum(s))) problems.push(`${s === 'from' ? 'Sources' : 'Destinations'} add up to ${fmtPercent(pctSum(s))}%, not 100%.`);
    }
  }
  // In percent mode, report a dollar gap only when no 100% message already explains it.
  const gap = total('from') - total('to');
  if (gap !== 0 && (mode === 'dollars' || !problems.length)) problems.push(`From and To differ by ${formatMoney(Math.abs(gap))}.`);
  if (chosen.length < all.length) problems.push('Choose an envelope on every line.');
  if (new Set(chosen.map((l) => l.id)).size < chosen.length) problems.push('An envelope can appear only once.');
  if (all.some((l) => l.amt === 0) && total('to') > 0) problems.push(mode === 'percent' ? 'Every line needs a percentage.' : 'Every line needs an amount.');
  const started = mode === 'percent' ? pctTotal > 0 : total('from') > 0 || total('to') > 0;

  const net = new Map<string, number>();
  for (const l of chosen) {
    const a = d.accountTag(d.env(l.id)?.accountTagId ?? '')?.name ?? '?';
    net.set(a, (net.get(a) ?? 0) + l.amt);
  }
  const bank = [...net].filter(([, v]) => v !== 0);

  const update = (s: Side, i: number, patch: Partial<Draft>) =>
    setSides({ ...sides, [s]: sides[s].map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  // Switching carries the numbers over: dollars become shares of the current total, and back.
  const switchMode = (next: Mode) => {
    if (next === mode) return;
    if (next === 'percent') {
      const t = total('to');
      setTotalText(toInput(t));
      const fromPct = percentsFromAmounts(amounts.from);
      const toPct = percentsFromAmounts(amounts.to);
      setSides({
        from: sides.from.map((l, i) => ({ ...l, text: fromPct[i] })),
        to: sides.to.map((l, i) => ({ ...l, text: toPct[i] })),
      });
    } else {
      setSides({
        from: sides.from.map((l, i) => ({ ...l, text: toInput(amounts.from[i]) })),
        to: sides.to.map((l, i) => ({ ...l, text: toInput(amounts.to[i]) })),
      });
    }
    setMode(next);
  };

  const save = async () => {
    await saveTx({
      id: edit?.id, kind: 'transfer', date, note,
      lines: all.map((l) => ({ envelopeId: l.id, amount: l.amt })),
    });
    nav.pop();
    nav.toast(edit ? 'Transfer updated' : 'Transfer recorded.');
  };

  const side = (s: Side, label: string) => {
    const fixed = mode === 'percent' ? sides[s].length === 1 : auto === s;
    return (
      <>
        <div className="mvside">
          <span>{label}</span>
          <span className="num">{mode === 'percent' ? `${fmtPercent(pctSum(s))}% · ` : ''}{formatMoney(total(s))}</span>
        </div>
        {sides[s].map((l, i) => (
          <div className="splitline" key={i}>
            <EnvelopeSelect value={l.id} onChange={(id) => update(s, i, { id })} />
            {mode === 'percent' ? (
              <>
                <input className="inp pct" inputMode="decimal" placeholder="0" readOnly={fixed}
                  value={fixed ? '100' : l.text} onChange={(e) => update(s, i, { text: e.target.value })} aria-label="Percent" />
                <span className="pctsign">%</span>
              </>
            ) : (
              <input className="inp" inputMode="decimal" placeholder="0.00" readOnly={fixed}
                value={fixed ? toInput(amounts[s][0]) : l.text} onChange={(e) => update(s, i, { text: e.target.value })} />
            )}
            {sides[s].length > 1 && (
              <button className="iconbtn" style={{ width: 32 }} aria-label="Remove line" onClick={() => setSides({ ...sides, [s]: sides[s].filter((_, j) => j !== i) })}>×</button>
            )}
          </div>
        ))}
        {mode === 'percent' && sides[s].length > 1 && (
          <div className="note">{sides[s].map((l, i) => `${d.env(l.id)?.name ?? 'Line ' + (i + 1)} ${formatMoney(amounts[s][i])}`).join(' · ')}</div>
        )}
        <button className="btn text" onClick={() => setSides({ ...sides, [s]: [...sides[s], { id: '', text: '' }] })}>+ Add {s === 'from' ? 'source' : 'destination'}</button>
      </>
    );
  };

  return (
    <SheetFrame title={heading}>
      <div className="unitswitch" role="group" aria-label="Enter amounts as">
        <button className={mode === 'dollars' ? 'on' : ''} aria-pressed={mode === 'dollars'} aria-label="Dollars" onClick={() => switchMode('dollars')}>$</button>
        <button className={mode === 'percent' ? 'on' : ''} aria-pressed={mode === 'percent'} aria-label="Percent" onClick={() => switchMode('percent')}>%</button>
      </div>
      {mode === 'percent' && (
        <Field label="Total to transfer"><input inputMode="decimal" placeholder="0.00" value={totalText} onChange={(e) => setTotalText(e.target.value)} /></Field>
      )}
      {side('from', 'From')}
      <div className="swap">
        <button className="iconbtn" aria-label="Swap From and To" onClick={() => { setSides({ from: sides.to, to: sides.from }); if (!edit) setHeading('Transfer'); }}>⇅</button>
      </div>
      {side('to', 'To')}
      <div className="mvsum">
        One transfer record · {sides.from.length} → {sides.to.length}
        {started && problems.map((p) => <div key={p} className="err">{p}</div>)}
        {!problems.length && bank.length > 0 && <div>At your bank: {bank.map(([a, v]) => `${a} ${v > 0 ? '+' : '−'}${formatMoney(Math.abs(v))}`).join(', ')}</div>}
      </div>
      <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <button className="btn block" disabled={problems.length > 0 || total('to') <= 0} onClick={() => void save()}>{edit ? 'Save' : 'Transfer'}</button>
    </SheetFrame>
  );
}
