import { useState } from 'react';
import { useData } from '../data';
import { useNav } from '../nav';
import { today } from '../dates';
import { formatMoney, parseMoney, toInput } from '../money';
import { saveTx, validateTx } from '../ops';
import { fmtPercent, isHundred, parsePercent, percentsFromAmounts, splitByPercent } from '../percent';
import { BigAmount, EnvelopeSelect, Field, SheetFrame } from '../ui';
import type { Id, Transaction } from '../types';

type Kind = 'expense' | 'income';
type SplitLine = { id: Id; text: string };
type Mode = 'dollars' | 'percent';

export function AddSheet({ kind: initialKind, edit }: { kind: Kind; edit?: Transaction }) {
  const d = useData();
  const nav = useNav();
  const [kind, setKind] = useState<Kind>(edit ? (edit.kind as Kind) : initialKind);
  const editTotal = edit ? Math.abs(edit.lines.reduce((s, l) => s + l.amount, 0)) : 0;
  const [amount, setAmount] = useState(toInput(editTotal));
  const [split, setSplit] = useState(!!edit && edit.lines.length > 1);
  const [mode, setMode] = useState<Mode>('dollars');
  const [envId, setEnvId] = useState<Id>(edit?.lines.length === 1 ? edit.lines[0].envelopeId : initialKind === 'income' ? d.income?.id ?? '' : '');
  const [lines, setLines] = useState<SplitLine[]>(
    edit && edit.lines.length > 1 ? edit.lines.map((l) => ({ id: l.envelopeId, text: toInput(Math.abs(l.amount)) })) : [{ id: '', text: '' }, { id: '', text: '' }],
  );
  const [date, setDate] = useState(edit?.date ?? today());
  const [payee, setPayee] = useState(edit?.payee ?? '');
  const [note, setNote] = useState(edit?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const total = parseMoney(amount) ?? 0;
  // In percent mode each split line is a share of the amount at the top.
  const percents = lines.map((l) => parsePercent(l.text));
  const pctSum = percents.reduce((a, b) => a + b, 0);
  const lineAmounts = mode === 'percent' ? splitByPercent(total, percents) : lines.map((l) => parseMoney(l.text) ?? 0);
  const splitSum = lineAmounts.reduce((a, b) => a + b, 0);

  // Switching carries the numbers over: amounts become shares of their sum, and back.
  const switchMode = (next: Mode) => {
    if (next === mode) return;
    const texts = next === 'percent' ? percentsFromAmounts(lineAmounts) : lineAmounts.map(toInput);
    setLines(lines.map((l, i) => ({ ...l, text: texts[i] })));
    setMode(next);
  };

  // Removing the second-to-last line ends the split: the remaining envelope takes the whole amount.
  const removeLine = (i: number) => {
    const rest = lines.filter((_, j) => j !== i);
    if (rest.length > 1) return setLines(rest);
    setSplit(false);
    setMode('dollars');
    setEnvId(rest[0]?.id ?? '');
  };

  const switchKind = (k: Kind) => {
    setKind(k);
    setSplit(false);
    setEnvId(k === 'income' ? d.income?.id ?? '' : '');
  };

  const save = async () => {
    const sign = kind === 'expense' ? -1 : 1;
    const txLines = split
      ? lines.map((l, i) => ({ l, amount: lineAmounts[i] })).filter(({ l }) => l.id || l.text).map(({ l, amount }) => ({ envelopeId: l.id, amount: sign * amount }))
      : [{ envelopeId: envId, amount: sign * total }];
    if (split && mode === 'percent' && !isHundred(pctSum)) return setError(`Lines add up to ${fmtPercent(pctSum)}%, not 100%.`);
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
        <Field label="Envelope"><EnvelopeSelect value={envId} onChange={setEnvId} filter={notIncome} /></Field>
      )}
      {kind === 'income' && !split && (
        <>
          <Field label="Into envelope"><EnvelopeSelect value={envId} onChange={setEnvId} /></Field>
          <div className="note">Paychecks go to {d.income?.name ?? 'Income'}. Interest can go straight to the envelope that earned it.</div>
        </>
      )}
      {!split && <button className="btn text" onClick={() => { setSplit(true); setMode('dollars'); setLines([{ id: envId, text: amount }, { id: '', text: '' }]); }}>+ Split across envelopes</button>}
      {split && (
        <>
          <div className="mvside">
            <span>Split</span>
            <div className="unitswitch inline" role="group" aria-label="Enter amounts as">
              <button className={mode === 'dollars' ? 'on' : ''} aria-pressed={mode === 'dollars'} aria-label="Dollars" onClick={() => switchMode('dollars')}>$</button>
              <button className={mode === 'percent' ? 'on' : ''} aria-pressed={mode === 'percent'} aria-label="Percent" onClick={() => switchMode('percent')}>%</button>
            </div>
          </div>
          {lines.map((l, i) => (
            <div className="splitline" key={i}>
              <EnvelopeSelect value={l.id} filter={kind === 'expense' ? notIncome : undefined} onChange={(id) => setLines(lines.map((x, j) => (j === i ? { ...x, id } : x)))} />
              {mode === 'percent' ? (
                <>
                  <input className="inp pct" inputMode="decimal" placeholder="0" aria-label="Percent" value={l.text} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                  <span className="pctsign">%</span>
                </>
              ) : (
                <input className="inp" inputMode="decimal" placeholder="0.00" value={l.text} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
              )}
              <button className="iconbtn" style={{ width: 32 }} aria-label="Remove line" onClick={() => removeLine(i)}>×</button>
            </div>
          ))}
          <button className="btn text" onClick={() => setLines([...lines, { id: '', text: '' }])}>+ Add line</button>
          {mode === 'percent' ? (
            <div className="note">
              Lines must add up to 100%. Remaining: {fmtPercent(100 - pctSum)}%
              <br />{lines.map((l, i) => `${d.env(l.id)?.name ?? 'Line ' + (i + 1)} ${formatMoney(lineAmounts[i])}`).join(' · ')}
            </div>
          ) : (
            <div className="note">Lines must add up to the total. Remaining: {formatMoney(total - splitSum)}</div>
          )}
          {kind === 'income' && <div className="note">Put any part you will assign later on {d.income?.name ?? 'Income'}.</div>}
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
