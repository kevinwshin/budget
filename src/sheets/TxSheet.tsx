import { useData } from '../data';
import { useNav } from '../nav';
import { dateLabel } from '../dates';
import { formatMoney, formatSigned, moneyClass } from '../money';
import { deleteTx } from '../ops';
import { txKindLabel } from '../components/TxRow';
import { SheetFrame } from '../ui';
import type { Id, TxLine } from '../types';

export function TxSheet({ txId }: { txId: Id }) {
  const d = useData();
  const nav = useNav();
  const t = d.txs.find((x) => x.id === txId);
  if (!t) return null;
  const kind = txKindLabel(t);

  const line = (l: TxLine) => {
    const e = d.env(l.envelopeId);
    return (
      <div className="row" key={l.envelopeId}>
        <div className="main">
          <div className="name">{e?.name ?? 'Unknown envelope'}</div>
          <div className="sub">{[e?.type === 'income' ? 'Income' : d.budgetTag(e?.budgetTagId ?? null)?.name, d.accountTag(e?.accountTagId ?? '')?.name].filter(Boolean).join(' · ')}</div>
        </div>
        <span className={`num ${moneyClass(l.amount)}`}>{formatSigned(l.amount)}</span>
      </div>
    );
  };

  let total = t.lines.reduce((s, l) => s + l.amount, 0);
  let body;
  if (t.kind === 'transfer') {
    const from = t.lines.filter((l) => l.amount < 0);
    const to = t.lines.filter((l) => l.amount > 0);
    total = to.reduce((s, l) => s + l.amount, 0);
    const net = new Map<string, number>();
    for (const l of t.lines) {
      const a = d.accountTag(d.env(l.envelopeId)?.accountTagId ?? '')?.name ?? '?';
      net.set(a, (net.get(a) ?? 0) + l.amount);
    }
    const bank = [...net].filter(([, v]) => v !== 0);
    body = (
      <>
        <div className="mvside">From</div><div className="rows">{from.map(line)}</div>
        <div className="mvside" style={{ marginTop: 8 }}>To</div><div className="rows">{to.map(line)}</div>
        {bank.length > 0 && <div className="mvsum">At your bank: {bank.map(([a, v]) => `${a} ${v > 0 ? '+' : '−'}${formatMoney(Math.abs(v))}`).join(', ')}</div>}
      </>
    );
  } else {
    body = (
      <>
        <div className="mvside">{t.lines.length > 1 ? 'Envelopes' : 'Envelope'}</div>
        <div className="rows">{t.lines.map(line)}</div>
        {t.kind === 'revaluation' && <div className="note">The new value replaced the old one. No other envelope changed.</div>}
      </>
    );
  }

  const field = (label: string, value?: string) => value
    ? <div className="row"><div className="main sub">{label}</div><span>{value}</span></div> : null;

  const editable = t.kind === 'expense' || t.kind === 'income' || t.kind === 'transfer';
  const onEdit = () => {
    if (t.kind === 'transfer') nav.replaceTop({ sheet: { type: 'move', from: [], to: [], edit: t } });
    else if (t.kind === 'expense' || t.kind === 'income') nav.replaceTop({ sheet: { type: 'add', kind: t.kind, edit: t } });
  };
  const onDelete = () => nav.replaceTop({ dialog: {
    title: 'Delete transaction?',
    body: 'The balances of the envelopes it touched change back. This cannot be undone.',
    confirm: 'Delete', danger: true,
    onConfirm: async () => {
      await deleteTx(t.id);
      nav.pop();
      nav.toast('Transaction deleted');
    },
  } });

  return (
    <SheetFrame>
      <div className="hero">
        <div className="k">{kind}</div>
        <div className={`v ${t.kind === 'transfer' ? '' : moneyClass(total)}`}>{t.kind === 'transfer' ? formatMoney(total) : formatSigned(total)}</div>
      </div>
      <div className="rows" style={{ marginBottom: 12 }}>
        {field('Date', dateLabel(t.date))}
        {field(t.kind === 'income' ? 'Source' : 'Payee', t.payee)}
        {field(t.kind === 'adjustment' ? 'Reason' : 'Note', t.note)}
      </div>
      {body}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {editable && <button className="btn tonal" style={{ flex: 1 }} onClick={onEdit}>Edit</button>}
        <button className="btn text" style={{ color: 'var(--neg)', marginLeft: editable ? 0 : 'auto' }} onClick={onDelete}>Delete</button>
      </div>
    </SheetFrame>
  );
}
