import { useRef, type PointerEvent, type ReactNode } from 'react';
import { useNav, type Dialog } from './nav';
import { groupByBudgetTag, useData } from './data';
import { CURRENCY_SYMBOL, formatMoney } from './money';
import type { Envelope, Id } from './types';

/** Drag distance, as a share of the sheet's height, past which a release closes the sheet. */
const DISMISS_SHARE = 0.25;
/** Downward speed in px/ms that closes the sheet on release even after a short drag. */
const FLICK_SPEED = 0.5;

export function SheetFrame({ title, children }: { title?: string; children: ReactNode }) {
  const nav = useNav();
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; lastY: number; lastT: number; speed: number } | null>(null);
  const closing = useRef(false);

  const place = (dy: number, animate: boolean) => {
    const el = sheet.current;
    if (!el) return;
    el.style.transition = animate ? 'transform .18s ease-out' : 'none';
    el.style.transform = dy > 0 ? `translateY(${dy}px)` : '';
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (closing.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, lastY: e.clientY, lastT: e.timeStamp, speed: 0 };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.speed = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    place(Math.max(0, e.clientY - d.startY), false);
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dy = Math.max(0, e.clientY - d.startY);
    const height = sheet.current?.offsetHeight ?? 1;
    if (dy > height * DISMISS_SHARE || (dy > 24 && d.speed > FLICK_SPEED)) {
      closing.current = true;
      place(height, true);
      setTimeout(() => nav.pop(), 180);
    } else place(0, true);
  };

  return (
    <>
      <div className="scrim" onClick={() => nav.pop()} />
      <div className="sheet" role="dialog" ref={sheet}>
        <div className="grabzone" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; place(0, true); }}>
          <div className="grab" />
          {title && <h2>{title}</h2>}
        </div>
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
