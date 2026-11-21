import { useData, type Data } from '../data';
import { useNav } from '../nav';
import { formatMoney, formatSigned, moneyClass } from '../money';
import { dateLabel } from '../dates';
import type { Id, Transaction } from '../types';

export function txKindLabel(t: Transaction): string {
  switch (t.kind) {
    case 'transfer': return 'Transfer';
    case 'revaluation': return 'Value update';
    case 'adjustment': return 'Adjustment';
    case 'income': return 'Income';
    case 'expense': return t.lines.length > 1 ? 'Split expense' : 'Expense';
  }
}

const envName = (d: Data, id: Id) => d.env(id)?.name ?? 'Unknown envelope';

export function TxRow({ t, focus, showDate }: { t: Transaction; focus?: Id; showDate?: boolean }) {
  const d = useData();
  const nav = useNav();
  const names = (ids: Id[]) => ids.map((id) => envName(d, id)).join(', ');
  let name: string;
  let sub: string;
  if (t.kind === 'transfer') {
    const from = t.lines.filter((l) => l.amount < 0).map((l) => l.envelopeId);
    const to = t.lines.filter((l) => l.amount > 0).map((l) => l.envelopeId);
    const side = (ids: Id[]) => (ids.length > 1 ? `${ids.length} envelopes` : envName(d, ids[0]));
    name = `${side(from)} → ${side(to)}`;
    sub = ['Transfer', t.note, from.length > 1 || to.length > 1 ? `${names(from)} → ${names(to)}` : ''].filter(Boolean).join(' · ');
  } else if (t.kind === 'revaluation' || t.kind === 'adjustment') {
    name = txKindLabel(t);
    sub = [names(t.envelopeIds), t.note].filter(Boolean).join(' · ');
  } else {
    name = t.payee || t.note || txKindLabel(t);
    sub = t.lines.length > 1 ? `Split · ${names(t.envelopeIds)}` : [names(t.envelopeIds), t.payee ? t.note : ''].filter(Boolean).join(' · ');
  }
  if (showDate) sub = `${dateLabel(t.date)} · ${sub}`;

  const lines = focus ? t.lines.filter((l) => l.envelopeId === focus) : t.lines;
  let amount = lines.reduce((s, l) => s + l.amount, 0);
  let text: string;
  let cls: string;
  if (t.kind === 'transfer' && !focus) {
    amount = t.lines.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0);
    text = formatMoney(amount);
    cls = '';
  } else {
    text = formatSigned(amount);
    cls = moneyClass(amount);
  }
  return (
    <button className="row" onClick={() => nav.push({ sheet: { type: 'tx', txId: t.id } })}>
      <div className="main"><div className="name">{name}</div><div className="sub">{sub}</div></div>
      <span className={`num ${cls}`}>{text}</span>
    </button>
  );
}
