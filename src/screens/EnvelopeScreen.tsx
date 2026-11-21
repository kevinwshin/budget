import { useData } from '../data';
import { useNav } from '../nav';
import { lastMonths, monthOf, monthShort, today } from '../dates';
import { balancesAtMonthEnd, sortNewest } from '../ledger';
import { formatMoney } from '../money';
import { TxRow } from '../components/TxRow';
import { Line } from '../components/charts';
import type { Id } from '../types';

export function EnvelopeScreen({ id }: { id: Id }) {
  const d = useData();
  const nav = useNav();
  const e = d.env(id);
  if (!e) return <div className="content empty">This envelope no longer exists.</div>;
  const bal = d.balance.get(id) ?? 0;
  const activity = sortNewest(d.txs.filter((t) => t.envelopeIds.includes(id)));
  const months = lastMonths(monthOf(today()), 6);
  const history = months.map((m) => balancesAtMonthEnd(d.txs, m).get(id) ?? 0);
  const kind = e.type === 'income' ? 'Income' : d.budgetTag(e.budgetTagId)?.name;

  return (
    <>
      <div className="appbar">
        <button className="iconbtn" aria-label="Back" onClick={() => nav.pop()}>←</button>
        <h1>{e.name}</h1>
        <button className="iconbtn" aria-label="More" onClick={() => nav.push({ sheet: { type: 'envMenu', envId: id } })}>⋮</button>
      </div>
      <div className="content">
        <div className="hero">
          <div className={`v ${bal < 0 ? 'neg' : ''}`}>{formatMoney(bal)}</div>
          <div className="k">{[kind, d.accountTag(e.accountTagId)?.name, e.type === 'investment' ? 'investment' : '', e.archived ? 'archived' : ''].filter(Boolean).join(' · ')}</div>
        </div>
        <div className="actions">
          {bal < 0 && d.income && (
            <button className="btn" onClick={() => nav.push({ sheet: { type: 'move', title: 'Cover overspending', from: [{ id: d.income!.id, amount: 0 }], to: [{ id, amount: -bal }] } })}>Cover overspending</button>
          )}
          <button className={`btn ${bal < 0 ? 'tonal' : ''}`} onClick={() => nav.push({ sheet: { type: 'move', from: [{ id, amount: 0 }], to: [{ id: '', amount: 0 }] } })}>Transfer</button>
          {e.type === 'investment' && <button className="btn tonal" onClick={() => nav.push({ sheet: { type: 'value', envId: id } })}>Update value</button>}
        </div>
        <div className="card">
          <Line labels={months.map(monthShort)} series={[{ values: history, color: 'var(--chart-1)' }]} />
          <div className="note">{e.type === 'investment' ? 'Value' : 'Balance'} at the end of each month.</div>
        </div>
        <div className="dayhead">Activity</div>
        {activity.length ? (
          <div className="rows">{activity.map((t) => <TxRow key={t.id} t={t} focus={id} showDate />)}</div>
        ) : (
          <div className="note">No activity yet.</div>
        )}
      </div>
    </>
  );
}
