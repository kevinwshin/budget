import type { ReactNode } from 'react';
import { useNav, type Dialog } from './nav';
import { groupByBudgetTag, useData } from './data';
import { CURRENCY_SYMBOL, formatMoney } from './money';
import type { Envelope, Id } from './types';

export function SheetFrame({ title, children }: { title?: string; children: ReactNode }) {
  const nav = useNav();
  return (
    <>
      <div className="scrim" onClick={() => nav.pop()} />
      <div className="sheet" role="dialog">
        <div className="grab" />
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </>
  );
}

export function DialogView({ d }: { d: Dialog }) {
  const nav = useNav();
  return (
    <>
      <div className="scrim" onClick={() => nav.pop()} />
      <div className="dialog" role="alertdialog">
        <h3>{d.title}</h3>
        <p>{d.body}</p>
        <div className="acts">
          {d.cancel !== null && <button className="btn text" onClick={() => nav.pop()}>{d.cancel ?? 'Cancel'}</button>}
          <button className={`btn ${d.danger ? 'danger' : ''}`} onClick={() => void d.onConfirm()}>{d.confirm}</button>
        </div>
      </div>
    </>
  );
}

export function BigAmount({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div className="bigamt">
      <span className="cur">{CURRENCY_SYMBOL}</span>
      <input inputMode="decimal" placeholder="0.00" value={value} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** Envelope picker grouped by budget tag. Shows each envelope's current balance. */
export function EnvelopeSelect({
  value, onChange, filter, className, placeholder = 'Choose envelope',
}: {
  value: Id; onChange: (id: Id) => void; filter?: (e: Envelope) => boolean; className?: string; placeholder?: string;
}) {
  const d = useData();
  const active = d.envelopes.filter((e) => !e.archived && (!filter || filter(e)));
  const label = (e: Envelope) => `${e.name} (${formatMoney(d.balance.get(e.id) ?? 0)})`;
  const income = active.filter((e) => e.type === 'income');
  return (
    <select className={className ?? 'inp'} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {income.map((e) => <option key={e.id} value={e.id}>{label(e)}</option>)}
      {groupByBudgetTag(d, active).map((g) => (
        <optgroup key={g.tag.id} label={g.tag.name}>
          {g.items.map((e) => <option key={e.id} value={e.id}>{label(e)}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

export function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
